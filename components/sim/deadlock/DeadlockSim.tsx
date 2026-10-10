'use client';

import { useMemo, useState } from 'react';
import {
  OpChips,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { init, isDone, ordered, parsePrograms, parseSchedule, step, type Program, type State } from './logic';

const ORDER = [
  { value: 'off', label: 'ตามที่เขียน' },
  { value: 'on', label: 'lock ordering' },
] as const;

const PRESETS = [
  // SYN4 p.16: two locks taken in opposite orders
  { label: 'สไลด์ p.16: สอง lock', value: { text: 'A: +1 +2 -2 -1; B: +2 +1 -1 -2', schedule: 'A B A B', order: false } },
  { label: 'สอง lock: โชคดี', value: { text: 'A: +1 +2 -2 -1; B: +2 +1 -1 -2', schedule: 'A A A A B B B B', order: false } },
  // SYN4 p.14: Dining Lawyers, each grabs the chopstick on the right first (three lawyers here)
  { label: 'สไลด์ p.14: Dining Lawyers', value: { text: 'A: +1 +2 -2 -1; B: +2 +3 -3 -2; C: +3 +1 -1 -3', schedule: 'A B C', order: false } },
  // SYN4 p.19: eliminate circular waiting with a fixed lock order
  { label: 'สไลด์ p.19: lock ordering', value: { text: 'A: +1 +2 -2 -1; B: +2 +3 -3 -2; C: +3 +1 -1 -3', schedule: 'A B C', order: true } },
];

const W = 320;
const TY = 34;
const LY = 132;
const R = 17;

function Graph({ state }: { state: State }) {
  const n = state.programs.length;
  const m = state.locks.length;
  const tx = (i: number) => (W / (n + 1)) * (i + 1);
  const lx = (i: number) => (W / (m + 1)) * (i + 1);
  const onCycle = (t: number) => state.cycle?.includes(t) ?? false;
  const e = state.event;

  return (
    <svg viewBox={`0 0 ${W} 166`} className="mx-auto block h-auto w-full max-w-md" role="img" aria-label="resource allocation graph">
      <defs>
        {(['muted', 'bad', 'warn'] as const).map((c) => (
          <marker key={c} id={`dl-arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className={c === 'muted' ? 'fill-muted' : c === 'bad' ? 'fill-bad' : 'fill-warn'} />
          </marker>
        ))}
      </defs>
      {/* held: lock → thread (solid) */}
      {state.holder.map((h, li) => {
        if (h === null) return null;
        const red = onCycle(h) && state.cycle!.some((t) => state.waiting[t] === state.locks[li]);
        // offset the two directions so a held edge and a request edge between the same pair stay apart
        return <line key={`h${li}`} x1={lx(li) - 5} y1={LY - R} x2={tx(h) - 5} y2={TY + R + 2} strokeWidth={2} className={red ? 'stroke-bad' : 'stroke-muted'} markerEnd={`url(#dl-arrow-${red ? 'bad' : 'muted'})`} />;
      })}
      {/* requested: thread → lock (dashed) */}
      {state.waiting.map((lock, t) => {
        if (lock === null) return null;
        const li = state.locks.indexOf(lock);
        const red = onCycle(t);
        return <line key={`w${t}`} x1={tx(t) + 5} y1={TY + R} x2={lx(li) + 5} y2={LY - R - 2} strokeWidth={2} strokeDasharray="5 4" className={red ? 'stroke-bad' : 'stroke-warn'} markerEnd={`url(#dl-arrow-${red ? 'bad' : 'warn'})`} />;
      })}
      {state.programs.map((p, t) => {
        const done = state.pc[t]! >= p.ops.length;
        const active = 'thread' in e && e.thread === t;
        return (
          <g key={p.name}>
            <circle cx={tx(t)} cy={TY} r={R} strokeWidth={active ? 3 : 1.5} className={onCycle(t) ? 'fill-bad-soft stroke-bad' : done ? 'fill-ok-soft stroke-ok' : state.waiting[t] !== null ? 'fill-warn-soft stroke-warn' : active ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-faint'} />
            <text x={tx(t)} y={TY} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[14px] font-semibold">
              {p.name}
            </text>
            <text x={tx(t)} y={10} textAnchor="middle" className="fill-faint text-[9px]">
              {done ? 'จบ' : state.waiting[t] !== null ? 'รอ' : ''}
            </text>
          </g>
        );
      })}
      {state.locks.map((lock, li) => (
        <g key={lock}>
          <rect x={lx(li) - R} y={LY - R} width={2 * R} height={2 * R} rx={4} strokeWidth={1.5} className={state.holder[li] === null ? 'fill-surface stroke-faint' : 'fill-surface-2 stroke-muted'} />
          <text x={lx(li)} y={LY} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[12px] font-semibold">
            L{lock}
          </text>
          <text x={lx(li)} y={LY + R + 12} textAnchor="middle" className="fill-faint text-[9px]">
            {state.holder[li] === null ? 'free' : `${state.programs[state.holder[li]!]!.name} ถือ`}
          </text>
        </g>
      ))}
    </svg>
  );
}

const fmt = (p: Program, pc: number) =>
  p.ops.map((o, i) => (
    <span key={i} className={`rounded-sm px-1 ${i === pc ? 'bg-accent text-accent-ink' : i < pc ? 'text-faint line-through' : 'text-ink'}`}>
      {o.type === 'acquire' ? '+' : '−'}L{o.lock}
    </span>
  ));

function Canvas({ state }: { state: State }) {
  return (
    <div className="flex flex-col gap-3">
      {state.schedule.length > 0 ? <OpChips ops={state.schedule.map((t) => state.programs[t]!.name)} current={state.k - 1} /> : null}
      <Graph state={state} />
      <ul className="flex flex-col gap-1 px-1.5 font-mono text-[12px] leading-[24px]">
        {state.programs.map((p, t) => (
          <li key={p.name} className="flex flex-wrap items-center gap-1">
            <b className="w-5">{p.name}</b>
            {fmt(p, state.pc[t]!)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const name = (t: number) => state.programs[t]!.name;
  switch (e.kind) {
    case 'init':
      return { title: 'ยังไม่มีใครถือ lock', body: 'วงกลมคือ thread สี่เหลี่ยมคือ lock (resource) เส้นทึบจาก lock ไป thread = thread ถือ lock นั้นอยู่ เส้นประจาก thread ไป lock = thread กำลังขอและรอ lock นั้น ถ้าเส้นต่อกันเป็นวง แปลว่าเกิด deadlock' };
    case 'acquire':
      return { title: `${name(e.thread)} acquire L${e.lock} สำเร็จ`, body: `L${e.lock} ว่างอยู่ ${name(e.thread)} จึงได้ถือ (เส้นทึบ L${e.lock} → ${name(e.thread)}) lock เป็น resource แบบ non-preemptable: OS ยึดคืนกลางทางไม่ได้ ต้องรอให้ผู้ถือ release เอง` };
    case 'wait': {
      if (state.cycle) {
        const chain = state.cycle.map((t) => `${name(t)} รอ L${state.waiting[t]}`).join(' → ');
        return { title: `${name(e.thread)} ขอ L${e.lock} → เกิดวงจรการรอ`, body: `L${e.lock} ถูก ${name(e.holder)} ถืออยู่ ${name(e.thread)} จึงต้องรอโดยที่ยังถือ lock ของตัวเองไว้ (wait while holding) ตอนนี้ ${chain} → วนกลับมาที่ ${name(state.cycle[0]!)} เป็น circular chain of requests` };
      }
      return { title: `${name(e.thread)} ขอ L${e.lock} แต่ต้องรอ`, body: `L${e.lock} ถูก ${name(e.holder)} ถืออยู่ ${name(e.thread)} จึงรอ (เส้นประ ${name(e.thread)} → L${e.lock}) ยังไม่เป็น deadlock เพราะ ${name(e.holder)} ยังทำงานต่อและ release ได้` };
    }
    case 'release':
      return { title: `${name(e.thread)} release L${e.lock}`, body: e.waiters.length > 0 ? `L${e.lock} ว่างแล้ว ${e.waiters.map(name).join(', ')} ที่รออยู่จะ acquire ได้เมื่อได้ทำงานครั้งถัดไป` : `L${e.lock} ว่างแล้ว ไม่มีใครรออยู่` };
    case 'deadlock':
      return { title: 'Deadlock', body: `${e.cycle.map(name).join(', ')} รอกันเป็นวง ไม่มี thread ใดทำงานต่อได้ และไม่มีใครจะ release — ครบทั้ง 4 เงื่อนไข: resource มีจำกัด, no preemption, wait while holding และ circular chain of requests ลองเปิด lock ordering เพื่อตัดเงื่อนไขสุดท้าย` };
    case 'finished':
      return { title: 'ทุก thread ทำงานจบ ไม่เกิด deadlock', body: 'ไม่เกิดวงจรการรอในลำดับนี้ แต่ถ้า thread ต่าง ๆ acquire lock ในลำดับไม่เหมือนกัน ลำดับการสลับอื่นอาจทำให้เกิด deadlock ได้ การไม่เกิดในครั้งนี้จึงไม่ได้พิสูจน์ว่าโปรแกรมปลอดภัย' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (state.cycle) return { tone: 'error', label: 'Deadlock' };
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'wait':
      return { tone: 'waiting', label: 'รอ lock' };
    case 'finished':
      return { tone: 'done', label: 'จบทุก thread' };
    case 'release':
      return { tone: 'done', label: 'release' };
    default:
      return { tone: 'active', label: 'acquire' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function DeadlockSim() {
  const programs = useParsedText(PRESETS[0]!.value.text, parsePrograms);
  const [order, setOrder] = useState(PRESETS[0]!.value.order);
  const [scheduleText, setScheduleText] = useState(PRESETS[0]!.value.schedule);

  const names = useMemo(() => programs.value.map((p) => p.name), [programs.value]);
  const parsed = useMemo(() => parseSchedule(names)(scheduleText), [names, scheduleText]);
  const schedule = useMemo(() => ('value' in parsed ? parsed.value : []), [parsed]);
  const effective = useMemo(() => (order ? ordered(programs.value) : programs.value), [order, programs.value]);
  const initialState = useMemo(() => init(effective, schedule), [effective, schedule]);

  return (
    <SimulationPlayer
      title="Deadlock และ Resource Allocation Graph"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === programs.text && p.value.schedule === scheduleText && p.value.order === order)}
            onPick={(p) => {
              setOrder(p.order);
              setScheduleText(p.schedule);
              programs.apply(p.text);
            }}
          />
          <SimTextInput label="โปรแกรมของแต่ละ thread (คั่นด้วย ;)" hint="+n = acquire lock n, -n = release lock n เช่น A: +1 +2 -2 -1" text={programs.text} error={programs.error} onChange={programs.apply} rows={3} />
          <SimTextInput label="ลำดับการสลับ thread" hint="ชื่อ thread แต่ละตัว = ให้ทำ 1 คำสั่ง เมื่อลำดับหมด thread ที่เหลือทำต่อจนจบหรือติด" text={scheduleText} error={'error' in parsed ? parsed.error : null} onChange={setScheduleText} rows={1} />
          <SimToggle label="ลำดับการ acquire" value={order ? 'on' : 'off'} options={ORDER} onChange={(v) => setOrder(v === 'on')} />
        </div>
      }
      legend={
        <>
          <span>━▶ lock → thread: ถืออยู่</span>
          <span>┅▶ thread → lock: รออยู่</span>
        </>
      }
    />
  );
}
