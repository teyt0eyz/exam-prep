'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimTextInput, SimToggle, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, parseLinks, step, type State } from './logic';

const REFS = [
  { value: '100', label: '100 (default)' },
  { value: '1000', label: '1000' },
  { value: '10000', label: '10000' },
] as const;

const PRESETS = [
  // OSPF p.3, 7: reference 10000; via the switch 10 + 10 = 20, via the T1 links 6477 + 6477 = 12,954
  { label: 'สไลด์ p.7: 20 กับ 12,954', value: { text: 'R1-R2 1000, R2-R4 1000, R1-R3 1.544, R3-R4 1.544', reference: 10000 } },
  // OSPF p.8: equal cost → both installed
  { label: 'สไลด์ p.8: ECMP', value: { text: 'R1-R2 1000, R2-R4 1000, R1-R3 1000, R3-R4 1000', reference: 10000 } },
  // OSPF p.3: with the default reference, fast links all cost 1
  { label: 'reference 100: แยกไม่ออก', value: { text: 'R1-R2 1000, R2-R4 1000, R1-R3 100, R3-R4 10000', reference: 100 } },
];

function Canvas({ state }: { state: State }) {
  const phase = state.phases[state.i]!;
  const shownLinks = state.phases.slice(0, state.i + 1).filter((p) => p.kind === 'link').length;
  const shownPaths = state.phases.slice(0, state.i + 1).filter((p) => p.kind === 'path').length;
  const decided = phase.kind === 'decide';
  const activePath = phase.kind === 'path' ? state.paths[phase.path] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 font-mono text-[12px] leading-5 text-muted">
        หาเส้นทาง {state.from} → {state.to} · reference bandwidth = <b className="text-ink">{state.reference}</b> Mbps
      </p>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-max border-collapse text-center font-mono text-[12px] leading-[26px]">
          <thead>
            <tr className="bg-surface-2 text-[11px] text-muted">
              <th className="px-2 text-left font-medium">ลิงก์</th>
              <th className="px-2 font-medium">bandwidth (Mbps)</th>
              <th className="px-2 font-medium">cost</th>
            </tr>
          </thead>
          <tbody>
            {state.links.map((l, k) => (
              <tr key={k} className={`border-t border-line ${phase.kind === 'link' && phase.link === k ? 'bg-accent-soft' : activePath?.links.includes(k) ? 'bg-warn-soft' : ''}`}>
                <td className="px-2 text-left font-semibold">
                  {l.a}–{l.b}
                </td>
                <td className="px-2">{l.bandwidth}</td>
                <td className="px-2 font-semibold">{k < shownLinks ? state.costs[k] : '?'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shownPaths > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="เส้นทางที่เป็นไปได้">
          {state.paths.slice(0, shownPaths).map((p, k) => {
            const win = decided && p.total === state.best;
            return (
              <li key={k} className={`rounded-md border px-3 py-1.5 font-mono text-[12px] leading-5 ${win ? 'border-ok bg-ok-soft text-ok' : phase.kind === 'path' && phase.path === k ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'}`}>
                {p.hops.join(' → ')}
                <br />
                {p.links.map((x) => state.costs[x]).join(' + ')} = <b>{p.total.toLocaleString('en-US')}</b>
                {win ? ' ✓' : ''}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const phase = state.phases[state.i]!;
  switch (phase.kind) {
    case 'init':
      return { title: 'OSPF cost', body: `Cost = Reference bandwidth ÷ Interface bandwidth ค่า reference ตั้งด้วย auto-cost reference-bandwidth (default 100) และต้องตั้งเท่ากันทุก router OSPF เลือกเส้นทางที่ผลรวม cost ต่ำที่สุด ไม่ได้ดูจำนวน hop` };
    case 'link': {
      const l = state.links[phase.link]!;
      const raw = state.reference / l.bandwidth;
      const c = state.costs[phase.link]!;
      return {
        title: `ลิงก์ ${l.a}–${l.b}: cost = ${c.toLocaleString('en-US')}`,
        body: `${state.reference} ÷ ${l.bandwidth} = ${Number(raw.toFixed(2))}${Number.isInteger(raw) ? '' : raw < 1 ? ' ซึ่งน้อยกว่า 1 แต่ cost ต่ำสุดคือ 1 ลิงก์ที่เร็วกว่า reference จึงได้ cost 1 เท่ากันหมด — เหตุผลที่ต้องเพิ่ม reference bandwidth' : ` → ${c} (ปัดตามสไลด์)`}`,
      };
    }
    case 'path': {
      const p = state.paths[phase.path]!;
      return { title: `เส้นทาง ${p.hops.join(' → ')}: cost รวม ${p.total.toLocaleString('en-US')}`, body: `บวก cost ของทุกลิงก์ตลอดเส้นทาง: ${p.links.map((x) => state.costs[x]).join(' + ')} = ${p.total.toLocaleString('en-US')}` };
    }
    case 'decide': {
      const wins = state.paths.filter((p) => p.total === state.best);
      if (wins.length === 0) return { title: 'ไม่มีเส้นทาง', body: `ไม่มีลิงก์เชื่อมจาก ${state.from} ถึง ${state.to}` };
      if (wins.length > 1) return { title: `ECMP: ติดตั้ง ${wins.length} เส้นทางที่ cost ${state.best.toLocaleString('en-US')}`, body: 'เมื่อ cost เท่ากันพอดี OSPF ไม่เลือกเส้นเดียว แต่ติดตั้งทุกเส้นลง routing table (default สูงสุด 4 เส้นทางบน Cisco IOS) แล้วกระจาย traffic ระหว่างเส้นทางเหล่านั้น ได้ทั้ง throughput และ redundancy' };
      const w = wins[0]!;
      const other = state.paths.find((p) => p.total !== state.best);
      return { title: `เลือก ${w.hops.join(' → ')} (cost ${w.total.toLocaleString('en-US')})`, body: `OSPF เลือกเส้นทางที่ cost รวมต่ำที่สุดเสมอ${other ? ` เส้นทาง ${other.hops.join(' → ')} (cost ${other.total.toLocaleString('en-US')}) เป็นเส้นทางสำรอง จะถูกใช้เมื่อเส้นทางหลักล้มเหลวเท่านั้น` : ''} จำนวน hop ไม่ใช่ตัวตัดสิน: ลิงก์ช้าเส้นเดียวอาจแพงกว่าลิงก์เร็วหลายเส้น` };
    }
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const phase = state.phases[state.i]!;
  if (phase.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (phase.kind === 'link') return { tone: 'active', label: 'cost ต่อลิงก์' };
  if (phase.kind === 'path') return { tone: 'waiting', label: 'cost รวม' };
  return { tone: 'done', label: state.paths.filter((p) => p.total === state.best).length > 1 ? 'ECMP' : 'เลือกเส้นทาง' };
}

const render = (state: State) => <Canvas state={state} />;

export function OspfCostSim() {
  const links = useParsedText(PRESETS[0]!.value.text, parseLinks);
  const [reference, setReference] = useState(PRESETS[0]!.value.reference);
  const initialState = useMemo(() => init(links.value, reference), [links.value, reference]);

  return (
    <SimulationPlayer
      title="OSPF cost และ path selection"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar
            presets={PRESETS}
            activeIndex={PRESETS.findIndex((p) => p.value.text === links.text && p.value.reference === reference)}
            onPick={(p) => {
              setReference(p.reference);
              links.apply(p.text);
            }}
          />
          <SimTextInput label="ลิงก์ (คั่นด้วย ,)" hint="รูปแบบ: R1-R2 bandwidth(Mbps) — หาเส้นทางจาก router หมายเลขต่ำสุดไปหมายเลขสูงสุด" text={links.text} error={links.error} onChange={links.apply} rows={3} />
          <SimToggle label="reference bandwidth" value={String(reference) as '100' | '1000' | '10000'} options={REFS} onChange={(v) => setReference(Number(v))} />
        </div>
      }
      legend={
        <>
          <span>cost = reference ÷ bandwidth</span>
          <span>T1 = 1.544 Mbps</span>
        </>
      }
    />
  );
}
