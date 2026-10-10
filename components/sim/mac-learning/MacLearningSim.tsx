'use client';

import { useMemo, useState } from 'react';
import { OpChips, PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, parseFrames, parseHosts, step, type State } from './logic';

const PRESETS = [
  // CH1 p.13–14: PC-A on Fa0/1 sends to PC-B on Fa0/2, then B replies
  { label: 'สไลด์ CH1 p.14: A ส่งหา B', value: { hosts: 'A 1, B 2, C 3, D 4', frames: 'A>B, B>A, A>B' } },
  // SWN p.17–21: A→C flooded, D→C flooded, then known destinations and a broadcast
  { label: 'สไลด์ SWN p.18–21', value: { hosts: 'A 1, B 2, C 3, D 4', frames: 'A>C, D>C, C>A, D>*' } },
  // two hosts behind one port (a hub): the frame is filtered
  { label: 'filter: A กับ B อยู่พอร์ตเดียวกัน', value: { hosts: 'A 1, B 1, C 2, D 3', frames: 'A>C, B>C, A>B' } },
];

const W = 320;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const px = (p: number) => (W / (state.ports + 1)) * p;
  const inPort = e.kind === 'frame' ? e.inPort : -1;
  const out = e.kind === 'frame' ? e.outPorts : [];
  const newMac = e.kind === 'frame' ? e.frame.src : '';

  return (
    <div className="flex flex-col gap-3">
      <OpChips ops={state.frames.map((f) => `${f.src}→${f.dst ?? 'broadcast'}`)} current={state.i - 1} />
      <svg viewBox={`0 0 ${W} 132`} className="mx-auto block h-auto w-full max-w-md" role="img" aria-label="switch และ host ในแต่ละพอร์ต">
        <rect x={12} y={12} width={W - 24} height={34} rx={6} className="fill-surface stroke-faint" strokeWidth={1.5} />
        <text x={W / 2} y={29} textAnchor="middle" dominantBaseline="central" className="fill-muted font-mono text-[11px]">
          Switch
        </text>
        {Array.from({ length: state.ports }, (_, k) => k + 1).map((p) => {
          const hosts = state.hosts.filter((h) => h.port === p);
          const isIn = p === inPort;
          const isOut = out.includes(p);
          return (
            <g key={p}>
              <line x1={px(p)} y1={46} x2={px(p)} y2={84} strokeWidth={isIn || isOut ? 3 : 1.5} className={isIn ? 'stroke-accent' : isOut ? 'stroke-ok' : 'stroke-line'} />
              <rect x={px(p) - 9} y={40} width={18} height={12} rx={2} className={isIn ? 'fill-accent' : isOut ? 'fill-ok' : 'fill-surface-2 stroke-faint'} />
              <text x={px(p)} y={46.5} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[9px] font-semibold ${isIn || isOut ? 'fill-accent-ink' : 'fill-muted'}`}>
                {p}
              </text>
              {isIn ? (
                <text x={px(p) + 7} y={68} className="fill-accent text-[9px] font-semibold">
                  ↑ เข้า
                </text>
              ) : isOut ? (
                <text x={px(p) + 7} y={68} className="fill-ok text-[9px] font-semibold">
                  ↓ ออก
                </text>
              ) : null}
              {hosts.length === 0 ? (
                <text x={px(p)} y={98} textAnchor="middle" className="fill-faint text-[9px]">
                  ว่าง
                </text>
              ) : (
                hosts.map((h, k) => {
                  const cx = px(p) + (k - (hosts.length - 1) / 2) * 26;
                  const src = e.kind === 'frame' && e.frame.src === h.name;
                  const dst = e.kind === 'frame' && e.frame.dst === h.name;
                  return (
                    <g key={h.name}>
                      <circle cx={cx} cy={100} r={12} strokeWidth={src || dst ? 2.5 : 1.5} className={src ? 'fill-accent-soft stroke-accent' : dst ? 'fill-ok-soft stroke-ok' : 'fill-surface stroke-faint'} />
                      <text x={cx} y={100} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[12px] font-semibold">
                        {h.name}
                      </text>
                    </g>
                  );
                })
              )}
            </g>
          );
        })}
        <text x={W / 2} y={128} textAnchor="middle" className="fill-faint text-[9px]">
          MAC ของ host แต่ละเครื่องแทนด้วยชื่อ host
        </text>
      </svg>
      <div className="overflow-hidden rounded-md border border-line">
        <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">MAC address table (CAM table)</p>
        <table className="w-full border-collapse text-center font-mono text-[13px] leading-[28px]">
          <thead>
            <tr className="text-[11px] text-faint">
              <th className="px-2 font-medium">MAC</th>
              <th className="px-2 font-medium">พอร์ต</th>
            </tr>
          </thead>
          <tbody>
            {state.table.length === 0 ? (
              <tr className="border-t border-line">
                <td colSpan={2} className="text-[12px] text-faint">
                  ว่าง
                </td>
              </tr>
            ) : null}
            {state.table.map((row) => (
              <tr key={row.mac} className={`border-t border-line ${row.mac === newMac ? 'bg-accent-soft' : e.kind === 'frame' && e.frame.dst === row.mac ? 'bg-ok-soft' : ''}`}>
                <td className="px-2">{row.mac}</td>
                <td className="px-2">{row.port}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  if (e.kind === 'init')
    return { title: 'MAC address table ว่าง', body: 'เมื่อเปิดเครื่อง switch ยังไม่รู้ว่า MAC ใดอยู่พอร์ตใด ทุก frame ที่เข้ามา switch ทำสองอย่างตามลำดับ: (1) Learn จาก Source MAC (2) ตัดสินใจจาก Destination MAC ว่าจะ Flood, Forward หรือ Filter' };
  const { frame } = e;
  const learn =
    e.learn === 'new'
      ? `Learn: Source MAC ${frame.src} ยังไม่อยู่ในตาราง จึงบันทึกว่า ${frame.src} อยู่พอร์ต ${e.inPort}`
      : e.learn === 'refresh'
        ? `Learn: ${frame.src} อยู่ในตารางแล้วที่พอร์ต ${e.inPort} จึงแค่รีเซ็ต aging timer (default 300 วินาที)`
        : `Learn: ${frame.src} ย้ายพอร์ต จึงแก้รายการเป็นพอร์ต ${e.inPort}`;
  const decide = {
    'flood-unknown': `Flood: ไม่พบ Destination MAC ${frame.dst} ในตาราง (unknown unicast) จึงส่งออกทุกพอร์ตยกเว้นพอร์ต ${e.inPort} ที่รับเข้ามา`,
    'flood-broadcast': `Flood: ปลายทางเป็น broadcast จึงส่งออกทุกพอร์ตยกเว้นพอร์ต ${e.inPort} เสมอ ไม่ว่าตารางจะมีอะไร (multicast ก็เช่นกัน)`,
    forward: `Forward: พบ ${frame.dst} ที่พอร์ต ${e.outPorts[0]} จึงส่งออกพอร์ตนั้นพอร์ตเดียว host อื่นไม่เห็น frame นี้`,
    filter: `Filter: พบว่า ${frame.dst} อยู่พอร์ต ${e.inPort} ซึ่งเป็นพอร์ตเดียวกับที่ frame เข้ามา จึงไม่ส่งต่อ (ปลายทางได้รับไปแล้วใน segment เดียวกัน)`,
  }[e.action];
  return { title: `${frame.src} → ${frame.dst ?? 'broadcast'}`, body: `${learn} · ${decide}` };
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.action === 'forward') return { tone: 'done', label: 'Forward' };
  if (e.action === 'filter') return { tone: 'active', label: 'Filter' };
  return { tone: 'waiting', label: 'Flood' };
}

const render = (state: State) => <Canvas state={state} />;

export function MacLearningSim() {
  const hosts = useParsedText(PRESETS[0]!.value.hosts, parseHosts);
  const [framesText, setFramesText] = useState(PRESETS[0]!.value.frames);
  const parsed = useMemo(() => parseFrames(hosts.value)(framesText), [hosts.value, framesText]);
  // keep the last frames that parsed, like useParsedText does
  const [frames, setFrames] = useState(() => ('value' in parsed ? parsed.value : []));
  const current = 'value' in parsed ? parsed.value : null;
  if (current && JSON.stringify(current) !== JSON.stringify(frames)) setFrames(current);
  const usable = useMemo(() => frames.filter((f) => hosts.value.some((h) => h.name === f.src) && (f.dst === null || hosts.value.some((h) => h.name === f.dst))), [frames, hosts.value]);
  const initialState = useMemo(() => init(hosts.value, usable), [hosts.value, usable]);

  return (
    <SimulationPlayer
      title="MAC address learning"
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
            activeIndex={PRESETS.findIndex((p) => p.value.hosts === hosts.text && p.value.frames === framesText)}
            onPick={(p) => {
              hosts.apply(p.hosts);
              setFramesText(p.frames);
            }}
          />
          <SimTextInput label="host และพอร์ต (คั่นด้วย ,)" hint="รูปแบบ: ชื่อ พอร์ต เช่น A 1 — ใส่หลาย host พอร์ตเดียวกันได้ (เหมือนต่อผ่าน hub)" text={hosts.text} error={hosts.error} onChange={hosts.apply} />
          <SimTextInput label="ลำดับ frame (คั่นด้วย ,)" hint="รูปแบบ: ต้นทาง>ปลายทาง เช่น A>B และ A>* คือ broadcast" text={framesText} error={'error' in parsed ? parsed.error : null} onChange={setFramesText} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">↑ เข้า = พอร์ตขาเข้า / ต้นทาง</span>
          <span className="text-ok">↓ ออก = พอร์ตขาออก / ปลายทาง</span>
        </>
      }
    />
  );
}
