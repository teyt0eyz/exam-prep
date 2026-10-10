'use client';

import { useMemo, useState } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { bid, bidLess, init, isDone, parseBridges, parseLinks, step, type Role, type State } from './logic';

const PRESETS = [
  // STP p.18: SW2 has the lowest priority, so it wins although its MAC is higher than SW1's
  { label: 'สไลด์ p.18: priority ตัดสิน', value: { bridges: 'SW1 32768 AAAA, SW2 24576 BBBB, SW3 32768 CCCC', links: 'SW1-SW2 1000, SW2-SW3 1000, SW1-SW3 1000' } },
  // SWN p.70–71: equal priorities, the lowest MAC wins
  { label: 'สไลด์ SWN p.71: MAC ตัดสิน', value: { bridges: 'X 32768 0C0011111111, Y 32768 0C0022222222, Z 32768 0C0011110000', links: 'X-Y 100, Y-Z 100, X-Z 100' } },
  // STP p.17: path cost by link speed decides the root port
  { label: 'สไลด์ p.17: cost ตามความเร็ว', value: { bridges: 'SW1 24576 AAAA, SW2 32768 BBBB, SW3 32768 CCCC, SW4 32768 DDDD', links: 'SW1-SW2 1000, SW1-SW3 100, SW2-SW4 1000, SW3-SW4 1000' } },
];

const W = 320;
const H = 210;
const POS: Record<number, readonly (readonly [number, number])[]> = {
  2: [[70, 105], [250, 105]],
  3: [[160, 40], [60, 170], [260, 170]],
  4: [[60, 40], [260, 40], [60, 170], [260, 170]],
};
const ROLE: Record<Role, { text: string; cls: string }> = {
  RP: { text: 'RP', cls: 'fill-accent' },
  DP: { text: 'DP', cls: 'fill-ok' },
  BLK: { text: 'BLK', cls: 'fill-bad' },
};

function Canvas({ state }: { state: State }) {
  const { bridges, links, solution } = state;
  const phase = state.phases[state.i]!;
  const pos = POS[bridges.length]!;
  const rootKnown = state.i >= 2;
  // which facts have been revealed so far
  const shownRp = new Set(state.phases.slice(0, state.i + 1).flatMap((p) => (p.kind === 'rp' ? [p.bridge] : [])));
  const shownSeg = new Set(state.phases.slice(0, state.i + 1).flatMap((p) => (p.kind === 'segment' ? [p.link] : [])));

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-md" role="img" aria-label="topology ของ switch">
        {links.map((l, k) => {
          const [x1, y1] = pos[l.a]!;
          const [x2, y2] = pos[l.b]!;
          const active = phase.kind === 'segment' && phase.link === k;
          const [ra, rb] = solution.roles[k]!;
          const blocked = shownSeg.has(k) && (ra === 'BLK' || rb === 'BLK');
          const label = (role: Role, t: number) => {
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            return (
              <g>
                <rect x={x - 12} y={y - 7} width={24} height={14} rx={3} className="fill-canvas" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[9px] font-bold ${ROLE[role].cls}`}>
                  {ROLE[role].text}
                </text>
              </g>
            );
          };
          const showA = shownSeg.has(k) || (ra === 'RP' && shownRp.has(l.a));
          const showB = shownSeg.has(k) || (rb === 'RP' && shownRp.has(l.b));
          return (
            <g key={k}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={active ? 3.5 : 2} strokeDasharray={blocked ? '5 4' : undefined} className={active ? 'stroke-accent' : blocked ? 'stroke-bad' : 'stroke-faint'} />
              <text x={(x1 + x2) / 2 + ((y2 - y1) / Math.hypot(x2 - x1, y2 - y1)) * 24} y={(y1 + y2) / 2 - (Math.abs(x2 - x1) / Math.hypot(x2 - x1, y2 - y1)) * 7} textAnchor="middle" dominantBaseline="central" className="fill-muted font-mono text-[9px]">
                cost {l.cost}
              </text>
              {showA ? label(ra, 0.27) : null}
              {showB ? label(rb, 0.73) : null}
            </g>
          );
        })}
        {bridges.map((b, i) => {
          const [x, y] = pos[i]!;
          const isRoot = rootKnown && i === solution.root;
          const active = phase.kind === 'rp' && phase.bridge === i;
          return (
            <g key={b.name}>
              <rect x={x - 30} y={y - 17} width={60} height={34} rx={6} strokeWidth={active || isRoot ? 2.5 : 1.5} className={isRoot ? 'fill-ok-soft stroke-ok' : active ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-faint'} />
              <text x={x} y={y - 5} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[11px] font-semibold">
                {b.name}
                {isRoot ? ' ★' : ''}
              </text>
              <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="central" className="fill-muted font-mono text-[8px]">
                {b.priority}.{b.mac.length > 6 ? `…${b.mac.slice(-4)}` : b.mac}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-max border-collapse text-center font-mono text-[12px] leading-[26px]">
          <thead>
            <tr className="bg-surface-2 text-[11px] text-muted">
              <th className="px-2 text-left font-medium">switch</th>
              <th className="px-2 font-medium">Bridge ID (priority.MAC)</th>
              <th className="px-2 font-medium">path cost</th>
            </tr>
          </thead>
          <tbody>
            {bridges.map((b, i) => (
              <tr key={b.name} className={`border-t border-line ${rootKnown && i === solution.root ? 'bg-ok-soft' : ''}`}>
                <td className="px-2 text-left font-semibold">{b.name}</td>
                <td className="px-2">{bid(b)}</td>
                <td className="px-2">{rootKnown ? (i === solution.root ? '0 (root)' : shownRp.has(i) ? solution.rpc[i] : '?') : '?'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const { bridges, links, solution } = state;
  const phase = state.phases[state.i]!;
  const root = bridges[solution.root]!;
  switch (phase.kind) {
    case 'init':
      return { title: 'Topology มี loop', body: 'ลิงก์สำรองทำให้เกิด loop ทาง physical STP จะเลือก Root Bridge เป็นจุดอ้างอิง แล้วกำหนดบทบาทของทุกพอร์ต เพื่อ block พอร์ตให้เหลือเส้นทางเดียวไปยัง root' };
    case 'claim':
      return { title: 'ทุก switch ประกาศตัวเป็น root', body: 'ตอนเริ่ม แต่ละ switch ส่ง BPDU ทุก 2 วินาทีโดยใส่ Bridge ID ของตัวเองเป็น Root Bridge ID เมื่อได้รับ BPDU ที่มี Bridge ID ต่ำกว่า จึงเลิกอ้างและส่งต่อ BPDU ของตัวที่ดีกว่า' };
    case 'root': {
      const samePriority = bridges.every((b) => b.priority === root.priority);
      return {
        title: `Root Bridge คือ ${root.name}`,
        body: samePriority
          ? `Bridge ID = priority + MAC ค่าต่ำสุดชนะ ทุกตัวมี priority ${root.priority} เท่ากัน จึงตัดสินด้วย MAC: ${root.mac} ต่ำที่สุด`
          : `Bridge ID = priority + MAC ค่าต่ำสุดชนะ เทียบ priority ก่อน: ${root.name} มี priority ${root.priority} ต่ำที่สุด จึงชนะทันทีโดยไม่ต้องดู MAC (${bridges.filter((b) => b !== root && !bidLess(b, root) && b.mac < root.mac).length > 0 ? 'แม้ switch อื่นจะมี MAC ต่ำกว่า' : 'MAC ใช้เฉพาะเมื่อ priority เท่ากัน'})`,
      };
    }
    case 'rp': {
      const b = bridges[phase.bridge]!;
      const options = links
        .map((l, k) => ({ l, k }))
        .filter(({ l }) => l.a === phase.bridge || l.b === phase.bridge)
        .map(({ l, k }) => {
          const other = l.a === phase.bridge ? l.b : l.a;
          return { k, text: `ผ่าน ${bridges[other]!.name}: ${solution.rpc[other]} + ${l.cost} = ${solution.rpc[other]! + l.cost}`, cost: solution.rpc[other]! + l.cost, other };
        });
      const chosen = options.find((o) => o.k === solution.rootLink[phase.bridge])!;
      const tie = options.filter((o) => o.cost === chosen.cost).length > 1;
      return {
        title: `${b.name}: Root Port คือพอร์ตที่ไปหา ${bridges[chosen.other]!.name}`,
        body: `Root Port = พอร์ตที่มี path cost ไป root ต่ำสุด มีได้พอร์ตเดียวต่อ non-root switch · ${options.map((o) => o.text).join(' · ')} → เลือก ${chosen.cost}${tie ? ` (cost เท่ากัน จึงเลือกทางที่ switch ข้างเคียงมี Bridge ID ต่ำกว่า)` : ''}`,
      };
    }
    case 'segment': {
      const l = links[phase.link]!;
      const [ra, rb] = solution.roles[phase.link]!;
      const dp = ra === 'DP' ? l.a : l.b;
      const other = ra === 'DP' ? l.b : l.a;
      const otherRole = ra === 'DP' ? rb : ra;
      const why = dp === solution.root ? `${bridges[dp]!.name} เป็น root bridge ทุกพอร์ตของ root เป็น Designated Port` : solution.rpc[dp] === solution.rpc[other] ? `root path cost เท่ากัน (${solution.rpc[dp]}) จึงเทียบ Bridge ID: ${bridges[dp]!.name} ต่ำกว่า` : `${bridges[dp]!.name} มี root path cost ${solution.rpc[dp]} ต่ำกว่า ${bridges[other]!.name} (${solution.rpc[other]})`;
      return {
        title: `ลิงก์ ${bridges[l.a]!.name}–${bridges[l.b]!.name}: ${otherRole === 'BLK' ? `พอร์ตของ ${bridges[other]!.name} ถูก block` : 'forward ทั้งสองฝั่ง'}`,
        body: `แต่ละ segment มี Designated Port ได้หนึ่งพอร์ต · ${why} → พอร์ตของ ${bridges[dp]!.name} เป็น DP · ${otherRole === 'RP' ? `พอร์ตของ ${bridges[other]!.name} เป็น Root Port อยู่แล้ว` : `พอร์ตของ ${bridges[other]!.name} ไม่ใช่ทั้ง Root Port และ Designated Port จึงเป็น Blocking: ไม่ส่ง data frame แต่ยังฟัง BPDU เพื่อเปิดกลับเมื่อเส้นทางหลักล่ม`}`,
      };
    }
    case 'done': {
      const blocked = solution.roles.flatMap(([ra, rb], k) => (ra === 'BLK' ? [`${bridges[links[k]!.a]!.name} (ไปหา ${bridges[links[k]!.b]!.name})`] : rb === 'BLK' ? [`${bridges[links[k]!.b]!.name} (ไปหา ${bridges[links[k]!.a]!.name})`] : []));
      return { title: 'Topology ไม่มี loop แล้ว', body: blocked.length > 0 ? `พอร์ตที่ถูก block: ${blocked.join(', ')} สายยังเสียบอยู่ จึงเป็น redundancy ที่พร้อมใช้ ถ้าลิงก์หลักล่ม STP จะคำนวณใหม่และเปิดพอร์ตนี้` : 'topology นี้ไม่มี loop ตั้งแต่ต้น จึงไม่มีพอร์ตใดถูก block' };
    }
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const phase = state.phases[state.i]!;
  switch (phase.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'claim':
      return { tone: 'waiting', label: 'แลก BPDU' };
    case 'root':
      return { tone: 'done', label: 'Root Bridge' };
    case 'rp':
      return { tone: 'active', label: 'Root Port' };
    case 'segment':
      return { tone: state.solution.roles[phase.link]!.includes('BLK') ? 'error' : 'active', label: state.solution.roles[phase.link]!.includes('BLK') ? 'Blocking' : 'Designated' };
    case 'done':
      return { tone: 'done', label: 'loop-free' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function StpRolesSim() {
  const bridges = useParsedText(PRESETS[0]!.value.bridges, parseBridges);
  const [linksText, setLinksText] = useState(PRESETS[0]!.value.links);
  const parsed = useMemo(() => parseLinks(bridges.value)(linksText), [bridges.value, linksText]);
  const fallback = useMemo(() => {
    // a spanning chain, used while the links text does not parse against the current switches
    const chain = bridges.value.slice(1).map((_, k) => `${bridges.value[k]!.name}-${bridges.value[k + 1]!.name} 1000`).join(', ');
    const p = parseLinks(bridges.value)(chain);
    return 'value' in p ? p.value : [];
  }, [bridges.value]);
  const links = 'value' in parsed ? parsed.value : fallback;
  const initialState = useMemo(() => init(bridges.value, links), [bridges.value, links]);

  return (
    <SimulationPlayer
      title="STP: Root Bridge และ Port role"
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
            activeIndex={PRESETS.findIndex((p) => p.value.bridges === bridges.text && p.value.links === linksText)}
            onPick={(p) => {
              bridges.apply(p.bridges);
              setLinksText(p.links);
            }}
          />
          <SimTextInput label="switch (คั่นด้วย ,)" hint="รูปแบบ: ชื่อ priority MAC เช่น SW1 32768 AAAA — priority เป็นพหุคูณของ 4096" text={bridges.text} error={bridges.error} onChange={bridges.apply} rows={3} />
          <SimTextInput label="ลิงก์ (คั่นด้วย ,)" hint="รูปแบบ: SW1-SW2 ความเร็ว — 10, 100, 1000, 10000 Mbps (cost 100, 19, 4, 2)" text={linksText} error={'error' in parsed ? parsed.error : null} onChange={setLinksText} rows={3} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">RP = Root Port</span>
          <span className="text-ok">DP = Designated Port</span>
          <span className="text-bad">BLK = Blocking</span>
          <span>★ = Root Bridge</span>
        </>
      }
    />
  );
}
