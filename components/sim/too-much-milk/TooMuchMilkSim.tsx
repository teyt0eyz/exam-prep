'use client';

import { useMemo, useState } from 'react';
import {
  CodeTrace,
  OpChips,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { allFinished, code, init, isDone, parseSchedule, step, verdict, type State, type Variant, type Who } from './logic';

const VARIANTS = [
  { value: 'try1', label: 'Try #1' },
  { value: 'try2', label: 'Try #2' },
  { value: 'try3', label: 'Try #3' },
  { value: 'lock', label: 'Lock' },
] as const;

const PRESETS: { label: string; value: { variant: Variant; text: string } }[] = [
  // SYN1 p.7: both check before either leaves a note
  { label: 'สไลด์ p.7: Try #1 ซื้อซ้ำ', value: { variant: 'try1', text: 'A A B B A A A B B B' } },
  // SYN1 p.8: both leave their note first, then both back off
  { label: 'สไลด์ p.8: Try #2 ไม่มีใครซื้อ', value: { variant: 'try2', text: 'A B A B A B' } },
  // SYN1 p.9: same interleaving, asymmetric solution
  { label: 'สไลด์ p.9: Try #3', value: { variant: 'try3', text: 'A B A B A B' } },
  // SYN1 p.13
  { label: 'สไลด์ p.13: Lock', value: { variant: 'lock', text: 'A B B A A B' } },
];

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const done = allFinished(state);
  const active = (who: Who) => (e.kind === 'line' && e.who === who ? [e.line] : []);
  const v = verdict(state);
  const ops = state.schedule.map((w) => w as string);

  return (
    <div className="flex flex-col gap-3">
      {ops.length > 0 ? <OpChips ops={ops} current={state.k - 1} /> : null}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[13px] leading-[26px]">
        <span className={`rounded-md border px-3 font-mono ${state.milk > 1 ? 'border-bad bg-bad-soft text-bad' : state.milk === 1 ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-surface text-muted'}`}>นมในตู้เย็น: {state.milk}</span>
        {state.variant === 'try1' ? <span className={`rounded-md border px-3 font-mono ${state.note ? 'border-warn bg-warn-soft text-warn' : 'border-line bg-surface text-faint'}`}>note: {state.note ? 'มี' : 'ไม่มี'}</span> : null}
        {state.variant === 'try2' || state.variant === 'try3'
          ? (['A', 'B'] as const).map((w) => (
              <span key={w} className={`rounded-md border px-3 font-mono ${state.notes[w] ? 'border-warn bg-warn-soft text-warn' : 'border-line bg-surface text-faint'}`}>
                note {w}: {state.notes[w] ? 'มี' : 'ไม่มี'}
              </span>
            ))
          : null}
        {state.variant === 'lock' ? <span className={`rounded-md border px-3 font-mono ${state.holder ? 'border-warn bg-warn-soft text-warn' : 'border-line bg-surface text-faint'}`}>lock: {state.holder ? `${state.holder} ถืออยู่` : 'free'}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((w) => (
          <div key={w} className="min-w-0">
            <CodeTrace lines={code(state.variant, w)} active={active(w)} label={`Thread ${w}${state.pc[w] >= code(state.variant, w).length ? ' ✓ จบ' : ''}`} />
          </div>
        ))}
      </div>
      {done ? <p className={`rounded-md px-3 py-2 text-[14px] font-medium leading-[22px] ${v.ok ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>{v.title}</p> : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  if (e.kind === 'init') {
    const intro: Record<Variant, string> = {
      try1: 'Try #1: ถ้าไม่มี note และไม่มีนม ให้ทิ้ง note แล้วไปซื้อ',
      try2: 'Try #2: ทิ้ง note ที่มีชื่อตัวเองก่อน แล้วค่อยตรวจ note ของอีกคน',
      try3: 'Try #3: โค้ดของ A กับ B ไม่เหมือนกัน A วนรอจนกว่า note B จะหายไป ส่วน B ถอยทันทีถ้าเห็น note A',
      lock: 'ใช้ lock: acquire ก่อนตรวจนม และ release เมื่อเสร็จ',
    };
    return { title: 'ตู้เย็นไม่มีนม', body: `${intro[state.variant]} แต่ละ step ทำหนึ่งบรรทัดของ thread ตามลำดับที่กำหนด เมื่อลำดับหมด thread ที่เหลือจะทำต่อจนจบ เป้าหมาย: มีคนซื้อเมื่อจำเป็น (liveness) และซื้อไม่เกินหนึ่งคน (safety)` };
  }
  if (e.kind === 'verdict') {
    const v = verdict(state);
    return { title: v.title, body: v.body };
  }
  return { title: `Thread ${e.who}: ${e.text}`, body: e.note };
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.kind === 'verdict') {
    const v = verdict(state);
    return { tone: v.ok ? 'done' : 'error', label: v.ok ? 'ถูกต้อง' : state.milk > 1 ? 'ผิด safety' : 'ผิด liveness' };
  }
  return { tone: e.tone, label: e.tone === 'waiting' ? `${e.who} รอ` : e.tone === 'error' ? 'ซื้อซ้ำ' : `Thread ${e.who}` };
}

const render = (state: State) => <Canvas state={state} />;

export function TooMuchMilkSim() {
  const [variant, setVariant] = useState<Variant>(PRESETS[0]!.value.variant);
  const schedule = useParsedText(PRESETS[0]!.value.text, parseSchedule);
  const initialState = useMemo(() => init(variant, schedule.value), [variant, schedule.value]);

  return (
    <SimulationPlayer
      title="Too Much Milk"
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
            activeIndex={PRESETS.findIndex((p) => p.value.variant === variant && p.value.text === schedule.text)}
            onPick={(p) => {
              setVariant(p.variant);
              schedule.apply(p.text);
            }}
          />
          <SimToggle label="วิธี" value={variant} options={VARIANTS} onChange={setVariant} />
          <SimTextInput label="ลำดับการสลับ thread" hint="ตัวอักษรแต่ละตัว = ให้ thread นั้นทำ 1 บรรทัด เช่น A A B B — ลองหาลำดับที่ทำให้พัง" text={schedule.text} error={schedule.error} onChange={schedule.apply} />
        </div>
      }
      legend={
        <>
          <span>safety = ซื้อไม่เกิน 1 คน</span>
          <span>liveness = มีคนซื้อ</span>
        </>
      }
    />
  );
}
