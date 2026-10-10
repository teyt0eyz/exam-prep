'use client';

import { useMemo, useState } from 'react';
import {
  NumberStepper,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { init, isDone, parse, parseSlices, step, type State } from './logic';

const PRESETS = [
  // SCH p.19: priorities 1–4 with time slices 10 / 20 / 40 / 80 ms
  { label: 'สไลด์ p.19: งาน CPU ลดระดับ', value: { text: 'A 200', slices: '10, 20, 40, 80', io: 30 } },
  // SCH p.15: one I/O-bound task mixed with two compute-bound tasks
  { label: 'สไลด์ p.15: I/O + CPU 2 งาน', value: { text: 'A 120, B 120, C 15 5', slices: '10, 20, 40, 80', io: 30 } },
  { label: 'งานสั้นแทรกงานยาว', value: { text: 'A 150, B 8, C 25', slices: '10, 20, 40, 80', io: 30 } },
];

const BG = ['bg-accent', 'bg-ok', 'bg-warn', 'bg-bad', 'bg-muted'];
const FILL = ['fill-accent', 'fill-ok', 'fill-warn', 'fill-bad', 'fill-muted'];

function Canvas({ state }: { state: State }) {
  const { tasks } = state;
  const e = state.event;
  const running = e.kind === 'run' ? e.task : -1;
  const total = Math.max(state.time, 1);
  const W = 320;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        เวลา = <b className="text-ink">{state.time}</b> ms
        {state.blocked.length > 0 ? (
          <>
            {' '}
            · รอ I/O: <b className="text-warn">{state.blocked.map((b) => `${tasks[b.task]!.name} (ถึง ${b.until})`).join(', ')}</b>
          </>
        ) : null}
      </p>
      <ol className="flex flex-col gap-1.5" aria-label="คิวตามระดับ priority">
        {state.queues.map((q, lv) => (
          <li key={lv} className={`flex min-h-11 items-center gap-2 rounded-md border px-2 ${e.kind === 'run' && e.level === lv ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
            <span className="w-[92px] shrink-0 font-mono text-[11px] leading-4 text-muted">
              priority {lv + 1}
              <br />
              slice {state.slices[lv]} ms
            </span>
            <span className="flex flex-wrap gap-1.5">
              {q.length === 0 ? <span className="text-[12px] text-faint">ว่าง</span> : null}
              {q.map((t) => (
                <span key={t} className={`rounded-sm px-2 font-mono text-[12px] font-semibold leading-[24px] text-accent-ink ${BG[t % BG.length]}`}>
                  {tasks[t]!.name}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <svg viewBox={`0 0 ${W} 34`} className="mx-auto block h-auto w-full max-w-xl" role="img" aria-label={`ลำดับการทำงาน: ${state.segments.map((g) => `${tasks[g.task]!.name} ${g.from}-${g.to}`).join(', ')}`}>
        <rect x={4} y={4} width={W - 8} height={18} rx={3} className="fill-surface stroke-line" />
        {state.segments.map((g, i) => (
          <rect key={i} x={4 + (g.from / total) * (W - 8)} y={4} width={Math.max(((g.to - g.from) / total) * (W - 8), 0.5)} height={18} className={`${FILL[g.task % FILL.length]} stroke-canvas`} strokeWidth={0.5} opacity={i === state.segments.length - 1 ? 1 : 0.6} />
        ))}
        <text x={4} y={32} className="fill-faint font-mono text-[9px]">
          0
        </text>
        <text x={W - 4} y={32} textAnchor="end" className="fill-faint font-mono text-[9px]">
          {state.time} ms
        </text>
      </svg>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-max border-collapse text-center font-mono text-[12px] leading-[26px]">
          <thead>
            <tr className="bg-surface-2 text-muted">
              <th className="px-2 text-left font-medium">งาน</th>
              <th className="px-2 font-medium">ชนิด</th>
              <th className="px-2 font-medium">เหลือ</th>
              <th className="px-2 font-medium">priority</th>
              <th className="px-2 font-medium">เสร็จ</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.name} className={`border-t border-line ${i === running ? 'bg-accent-soft' : ''}`}>
                <td className="px-2 text-left font-semibold">
                  <span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${BG[i % BG.length]}`} />
                  {t.name}
                </td>
                <td className="px-2">{t.burst ? `I/O ทุก ${t.burst}` : 'CPU'}</td>
                <td className="px-2">{state.remaining[i]}</td>
                <td className="px-2">{state.finish[i] === null ? state.level[i]! + 1 : '–'}</td>
                <td className="px-2">{state.finish[i] ?? '–'}</td>
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
  const name = (i: number) => state.tasks[i]!.name;
  if (e.kind === 'init')
    return {
      title: 'ทุกงานเริ่มที่ priority สูงสุด',
      body: `MFQ คือชุดของ Round Robin queue ที่แต่ละคิวมี priority ของตัวเอง คิว priority สูงมี time slice สั้น (${state.slices[0]} ms) คิวต่ำมี time slice ยาว scheduler เลือก thread แรกในคิวที่ priority สูงสุดที่ไม่ว่างเสมอ`,
    };
  if (e.kind === 'idle')
    return { title: `เวลา ${e.from}–${e.to}: processor ว่าง`, body: `ทุกงานกำลังรอ I/O จึงไม่มีอะไรให้ทำจนงาน ${e.woke.map(name).join(', ')} ทำ I/O เสร็จและกลับเข้าคิวระดับเดิม` };

  const head = `เลือก ${name(e.task)} เพราะอยู่หัวคิว priority ${e.level + 1} ซึ่งเป็นคิวสูงสุดที่ไม่ว่าง ทำงาน ${e.to - e.from} ms`;
  const woke = e.woke.length > 0 && e.outcome !== 'preempted' ? ` ระหว่างนั้นงาน ${e.woke.map(name).join(', ')} ทำ I/O เสร็จและกลับเข้าคิว` : '';
  switch (e.outcome) {
    case 'finished':
      return { title: `เวลา ${e.from}–${e.to}: ${name(e.task)} เสร็จ`, body: `${head} แล้วงานเสร็จก่อน time slice หมด${woke}` };
    case 'io':
      return {
        title: `เวลา ${e.from}–${e.to}: ${name(e.task)} ขอทำ I/O`,
        body: `${head} แล้วสละ processor ไปรอ I/O ${state.ioTime} ms ก่อนที่ time slice (${state.slices[e.level]} ms) จะหมด จึงไม่ถูกลดระดับ งานแบบ I/O-bound จึงค้างอยู่คิวบนและได้ตอบสนองเร็ว${woke}`,
      };
    case 'expired':
      return {
        title: `เวลา ${e.from}–${e.to}: ${name(e.task)} ใช้ time slice หมด`,
        body:
          e.newLevel === e.level
            ? `${head} ใช้ time slice ครบ ${state.slices[e.level]} ms แต่อยู่คิวล่างสุดแล้ว จึงกลับไปต่อท้ายคิวเดิม (ทำแบบ Round Robin)${woke}`
            : `${head} ใช้ time slice ครบ ${state.slices[e.level]} ms แต่ยังไม่เสร็จ จึงถูกลดลงหนึ่งระดับไปคิว priority ${e.newLevel + 1} ซึ่ง time slice ยาวขึ้นเป็น ${state.slices[e.newLevel]} ms งานแบบ compute-bound จึงค่อย ๆ ไหลลงคิวล่าง${woke}`,
      };
    case 'preempted':
      return {
        title: `เวลา ${e.from}–${e.to}: ${name(e.task)} ถูก preempt`,
        body: `${head} แล้วงาน ${e.woke.map(name).join(', ')} ทำ I/O เสร็จและกลับเข้าคิวที่ priority สูงกว่า scheduler จึงหยุด ${name(e.task)} ไว้ที่หัวคิวเดิม (time slice ที่ใช้ไปยังนับต่อ) แล้วไปทำงานที่ priority สูงกว่าก่อน`,
      };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  if (isDone(state)) return { tone: 'done', label: 'เสร็จทุกงาน' };
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.kind === 'idle') return { tone: 'waiting', label: 'idle' };
  const map = { finished: ['done', 'งานเสร็จ'], io: ['waiting', 'รอ I/O'], expired: ['error', 'ลดระดับ'], preempted: ['active', 'preempt'] } as const;
  if (e.outcome === 'expired' && e.newLevel === e.level) return { tone: 'active', label: 'หมด slice' };
  return { tone: map[e.outcome][0], label: map[e.outcome][1] };
}

const render = (state: State) => <Canvas state={state} />;

export function MfqSim() {
  const tasks = useParsedText(PRESETS[0]!.value.text, parse);
  const slices = useParsedText(PRESETS[0]!.value.slices, parseSlices);
  const [io, setIo] = useState(PRESETS[0]!.value.io);
  const initialState = useMemo(() => init(tasks.value, slices.value, io), [tasks.value, slices.value, io]);

  return (
    <SimulationPlayer
      title="Multi-level Feedback Queue (MFQ)"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === tasks.text && p.value.slices === slices.text && p.value.io === io)}
            onPick={(p) => {
              setIo(p.io);
              slices.apply(p.slices);
              tasks.apply(p.text);
            }}
          />
          <SimTextInput label="งาน (คั่นด้วย ,)" hint="รูปแบบ: ชื่อ เวลาCPUรวม [เวลาCPUก่อนทำ I/O] — A 200 คืองาน compute-bound, C 15 5 คืองานที่ทำ I/O ทุก 5 ms" text={tasks.text} error={tasks.error} onChange={tasks.apply} />
          <SimTextInput label="time slice ของแต่ละระดับ (ms)" hint="จาก priority สูงไปต่ำ 2–4 ระดับ" text={slices.text} error={slices.error} onChange={slices.apply} rows={1} />
          <NumberStepper label="เวลาทำ I/O แต่ละครั้ง (ms)" value={io} min={5} max={60} onChange={setIo} />
        </div>
      }
      legend={
        <>
          <span>priority 1 = สูงสุด</span>
          <span>หมด slice → ลง 1 ระดับ</span>
        </>
      }
    />
  );
}
