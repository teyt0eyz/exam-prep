'use client';

import { useMemo, useState } from 'react';
import {
  NumberStepper,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { averageResponse, init, isDone, parse, responseTime, step, type Policy, type State } from './logic';

const POLICIES = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'sjf', label: 'SJF' },
  { value: 'rr', label: 'Round Robin' },
] as const;

const PRESETS: { label: string; value: { text: string; policy: Policy; quantum: number } }[] = [
  // SCH p.6–7: five tasks arrive one right after another, the first much longer than the others
  { label: 'สไลด์ p.7: FIFO', value: { text: 'A 0 10, B 0 1, C 0 1, D 0 1, E 0 1', policy: 'fifo', quantum: 1 } },
  { label: 'สไลด์ p.7: SJF', value: { text: 'A 0 10, B 0 1, C 0 1, D 0 1, E 0 1', policy: 'sjf', quantum: 1 } },
  // SCH p.13: equal-size tasks, where Round Robin is worse than FIFO
  { label: 'สไลด์ p.13: งานเท่ากัน RR', value: { text: 'A 0 4, B 0 4, C 0 4', policy: 'rr', quantum: 1 } },
  { label: 'งานเท่ากัน FIFO', value: { text: 'A 0 4, B 0 4, C 0 4', policy: 'fifo', quantum: 1 } },
  { label: 'งานมาไม่พร้อมกัน SJF', value: { text: 'A 0 8, B 1 4, C 2 2', policy: 'sjf', quantum: 2 } },
];

const FILL = ['fill-accent', 'fill-ok', 'fill-warn', 'fill-bad', 'fill-muted', 'fill-faint'];
const BG = ['bg-accent', 'bg-ok', 'bg-warn', 'bg-bad', 'bg-muted', 'bg-faint'];
const W = 320;
const PAD = 8;

function Canvas({ state }: { state: State }) {
  const { tasks } = state;
  const total = Math.max(...tasks.map((t) => t.arrival)) + tasks.reduce((a, t) => a + t.length, 0);
  const scale = (W - 2 * PAD) / Math.max(total, 1);
  const x = (t: number) => PAD + t * scale;
  const average = averageResponse(state);
  const current = state.event.kind === 'run' ? state.event.task : -1;
  const ticks = Array.from(new Set([0, ...state.segments.map((g) => g.to)]));

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        เวลา = <b className="text-ink">{state.time}</b> · ready queue ={' '}
        <b className="text-ink">{state.queue.length > 0 ? state.queue.map((i) => `${tasks[i]!.name}(${state.remaining[i]})`).join(' → ') : 'ว่าง'}</b>
      </p>
      <svg viewBox={`0 0 ${W} 62`} className="mx-auto block h-auto w-full max-w-xl" role="img" aria-label={`Gantt chart: ${state.segments.map((g) => `${tasks[g.task]!.name} ${g.from}-${g.to}`).join(', ')}`}>
        <rect x={PAD} y={10} width={W - 2 * PAD} height={30} rx={4} className="fill-surface stroke-line" strokeWidth={1} />
        {state.segments.map((g, i) => {
          const w = (g.to - g.from) * scale;
          const last = i === state.segments.length - 1;
          return (
            <g key={i}>
              <rect x={x(g.from)} y={10} width={w} height={30} className={`${FILL[g.task % FILL.length]} stroke-canvas`} strokeWidth={1} opacity={last ? 1 : 0.55} />
              {w >= 9 ? (
                <text x={x(g.from) + w / 2} y={25} textAnchor="middle" dominantBaseline="central" className="fill-accent-ink font-mono text-[10px] font-semibold">
                  {tasks[g.task]!.name}
                </text>
              ) : null}
            </g>
          );
        })}
        {ticks.map((t, i) =>
          // skip labels that would overlap the previous one
          i === 0 || (t - ticks[i - 1]!) * scale >= 9 || i === ticks.length - 1 ? (
            <text key={t} x={x(t)} y={54} textAnchor="middle" className="fill-faint font-mono text-[9px]">
              {t}
            </text>
          ) : null,
        )}
      </svg>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-max border-collapse text-center font-mono text-[12px] leading-[26px]">
          <thead>
            <tr className="bg-surface-2 text-muted">
              <th className="px-2 text-left font-medium">งาน</th>
              <th className="px-2 font-medium">มาถึง</th>
              <th className="px-2 font-medium">ยาว</th>
              <th className="px-2 font-medium">เหลือ</th>
              <th className="px-2 font-medium">เสร็จ</th>
              <th className="px-2 font-medium">response</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.name} className={`border-t border-line ${i === current ? 'bg-accent-soft' : ''}`}>
                <td className="px-2 text-left font-semibold">
                  <span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${BG[i % BG.length]}`} />
                  {t.name}
                </td>
                <td className="px-2">{t.arrival}</td>
                <td className="px-2">{t.length}</td>
                <td className="px-2">{state.remaining[i]}</td>
                <td className="px-2">{state.finish[i] ?? '–'}</td>
                <td className="px-2">{responseTime(state, i) ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {average !== null ? (
        <p className="rounded-md bg-ok-soft px-3 py-2 text-[14px] leading-[22px] text-ok">
          average response time = ({tasks.map((_, i) => responseTime(state, i)).join(' + ')}) / {tasks.length} = <b>{Number(average.toFixed(2))}</b>
        </p>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const { tasks } = state;
  const name = (i: number) => tasks[i]!.name;
  if (e.kind === 'init') {
    const what =
      state.policy === 'fifo'
        ? 'FIFO ทำงานตามลำดับที่มาถึง และทำจนเสร็จหรือจนงานสละ processor เอง'
        : state.policy === 'sjf'
          ? 'SJF เลือกงานที่เหลืองานน้อยที่สุดเสมอ (สไลด์ระบุว่ามักเรียก SRTF) จึงตัดสินใจใหม่ทุกครั้งที่มีงานมาถึง'
          : `Round Robin ให้แต่ละงานทำได้ครั้งละ time quantum = ${state.quantum} ถ้ายังไม่เสร็จต้องกลับไปต่อท้ายแถว`;
    return { title: 'สถานะเริ่มต้น', body: `${what} response time ของงาน = เวลาที่งานเสร็จ − เวลาที่มาถึง` };
  }
  if (e.kind === 'idle')
    return { title: `เวลา ${e.from}–${e.to}: processor ว่าง`, body: 'ยังไม่มีงานใน ready queue จึงรอจนงานถัดไปมาถึง (scheduler แบบ work-conserving จะไม่ปล่อยว่างถ้ามีงานให้ทำ)' };

  const readyText = e.ready.map((i) => `${name(i)} (เหลือ ${i === e.task ? e.remainingBefore : state.remaining[i]})`).join(', ');
  const why =
    state.policy === 'fifo'
      ? `${name(e.task)} มาถึงก่อนงานอื่นใน ready queue จึงได้ทำก่อน`
      : state.policy === 'sjf'
        ? e.ready.length === 1
          ? `มี ${name(e.task)} งานเดียวที่พร้อม`
          : `งานที่พร้อมคือ ${readyText} — ${name(e.task)} เหลืองานน้อยที่สุด`
        : `${name(e.task)} อยู่หัวแถว`;
  const after =
    e.outcome === 'finished'
      ? `ทำจนเสร็จที่เวลา ${e.to} response time = ${e.to} − ${tasks[e.task]!.arrival} = ${e.to - tasks[e.task]!.arrival}`
      : e.outcome === 'quantum'
        ? `ใช้ครบ time quantum (${state.quantum}) แต่ยังเหลืองาน ${state.remaining[e.task]} จึงกลับไปต่อท้ายแถว${e.arrived.length > 0 ? ` (งาน ${e.arrived.map(name).join(', ')} ที่มาถึงระหว่างนั้นเข้าแถวก่อน)` : ''}`
        : `งาน ${e.arrived.map(name).join(', ')} มาถึงที่เวลา ${e.to} จึงหยุด ${name(e.task)} ไว้ก่อน (เหลือ ${state.remaining[e.task]}) แล้วเลือกใหม่ในขั้นถัดไป`;
  return { title: `เวลา ${e.from}–${e.to}: ทำงาน ${name(e.task)}`, body: `${why} ${after}` };
}

function status(state: State): { tone: SimTone; label: string } {
  if (isDone(state)) return { tone: 'done', label: 'เสร็จทุกงาน' };
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.kind === 'idle') return { tone: 'waiting', label: 'idle' };
  if (e.outcome === 'finished') return { tone: 'done', label: 'งานเสร็จ' };
  return { tone: e.outcome === 'quantum' ? 'active' : 'waiting', label: e.outcome === 'quantum' ? 'หมด quantum' : 'ถูก preempt' };
}

const render = (state: State) => <Canvas state={state} />;

export function CpuSchedulingSim() {
  const tasks = useParsedText(PRESETS[0]!.value.text, parse);
  const [policy, setPolicy] = useState<Policy>(PRESETS[0]!.value.policy);
  const [quantum, setQuantum] = useState(PRESETS[0]!.value.quantum);
  const initialState = useMemo(() => init(tasks.value, policy, quantum), [tasks.value, policy, quantum]);

  return (
    <SimulationPlayer
      title="CPU Scheduling: FIFO, SJF, Round Robin"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === tasks.text && p.value.policy === policy && (policy !== 'rr' || p.value.quantum === quantum))}
            onPick={(p) => {
              setPolicy(p.policy);
              setQuantum(p.quantum);
              tasks.apply(p.text);
            }}
          />
          <SimTextInput label="งาน (คั่นด้วย ,)" hint="รูปแบบ: ชื่อ เวลามาถึง ความยาว เช่น A 0 10 — แก้แล้ว simulation เริ่มใหม่" text={tasks.text} error={tasks.error} onChange={tasks.apply} />
          <SimToggle label="นโยบาย" value={policy} options={POLICIES} onChange={setPolicy} />
          {policy === 'rr' ? <NumberStepper label="time quantum" value={quantum} min={1} max={10} onChange={setQuantum} /> : null}
        </div>
      }
      legend={
        <>
          <span>ready queue: ชื่อ(งานที่เหลือ)</span>
          <span>response = เสร็จ − มาถึง</span>
        </>
      }
    />
  );
}
