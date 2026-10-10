'use client';

import { useMemo, useState } from 'react';
import {
  CodeTrace,
  NumberStepper,
  OpChips,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { allFinished, code, init, isDone, parseSchedule, step, type State, type Who } from './logic';

const LOCK = [
  { value: 'off', label: 'ไม่ใช้ lock' },
  { value: 'on', label: 'ใช้ lock' },
] as const;

const PRESETS = [
  { label: 'lost update', value: { lock: false, rounds: 1, text: 'A A B B B A' } },
  { label: 'ลำดับเดิม + lock', value: { lock: true, rounds: 1, text: 'A A B B B A' } },
  { label: 'โชคดี: ไม่สลับกลางทาง', value: { lock: false, rounds: 1, text: 'A A A B B B' } },
  { label: '2 รอบ สลับทุกบรรทัด', value: { lock: false, rounds: 2, text: 'A B A B A B A B A B A B' } },
];

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const expected = 2 * state.rounds;
  const done = allFinished(state);
  const ops = state.schedule.map((w) => w as string);
  return (
    <div className="flex flex-col gap-3">
      {ops.length > 0 ? <OpChips ops={ops} current={state.k - 1} /> : null}
      <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[13px] leading-[26px]">
        <span className="rounded-md border border-accent bg-accent-soft px-3 font-semibold text-accent">count = {state.count}</span>
        {(['A', 'B'] as const).map((w) => (
          <span key={w} className="rounded-md border border-line bg-surface px-3 text-muted">
            r ของ {w} = {state.reg[w] ?? '–'}
          </span>
        ))}
        {state.lock ? <span className={`rounded-md border px-3 ${state.holder ? 'border-warn bg-warn-soft text-warn' : 'border-line bg-surface text-faint'}`}>lock: {state.holder ? `${state.holder} ถืออยู่` : 'free'}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((w: Who) => (
          <div key={w} className="min-w-0">
            <CodeTrace lines={code(state.lock)} active={e.kind === 'line' && e.who === w ? [e.line] : []} label={`Thread ${w} · รอบ ${Math.min(state.doneRounds[w] + 1, state.rounds)}/${state.rounds}${state.doneRounds[w] >= state.rounds ? ' ✓' : ''}`} />
          </div>
        ))}
      </div>
      {done ? (
        <p className={`rounded-md px-3 py-2 text-[14px] font-medium leading-[22px] ${state.count === expected ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
          count = {state.count} · ที่ควรได้ = 2 × {state.rounds} = {expected}
          {state.count === expected ? ' ✓' : ` · หายไป ${expected - state.count}`}
        </p>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  if (e.kind === 'init')
    return {
      title: 'count++ ไม่ใช่คำสั่งเดียว',
      body: `สอง thread เพิ่มค่าตัวแปรร่วม count คนละ ${state.rounds} รอบ ผลที่ถูกคือ ${2 * state.rounds} แต่ count++ แตกเป็นสามขั้น: load, add, store และ scheduler สลับ thread ระหว่างขั้นใดก็ได้${state.lock ? ' ครั้งนี้มี lock ครอบทั้งสามขั้นไว้' : ''}`,
    };
  if (e.kind === 'verdict') {
    const expected = 2 * state.rounds;
    return state.count === expected
      ? { title: `ผลถูกต้อง: count = ${state.count}`, body: state.lock ? 'lock ทำให้ load/add/store ของแต่ละ thread ไม่ถูกแทรก ผลจึงถูกกับทุกลำดับการสลับ (mutual exclusion)' : 'ลำดับนี้บังเอิญไม่สลับกลาง load/add/store จึงได้ผลถูก แต่โปรแกรมยังมี race condition เพราะผลขึ้นกับลำดับ ลองเปลี่ยนลำดับดู' }
      : { title: `race condition: ได้ ${state.count} แทนที่จะเป็น ${expected}`, body: `การเพิ่มค่าหายไป ${expected - state.count} ครั้ง เพราะ thread หนึ่งเขียนทับผลของอีก thread ผลของโปรแกรมขึ้นกับลำดับการสลับ ซึ่งเป็นนิยามของ race condition ลองเปิด lock แล้วใช้ลำดับเดิม` };
  }
  return { title: `Thread ${e.who}: ${code(state.lock)[e.line]!.replace(/\s*\/\/.*$/, '')}`, body: e.note };
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.kind === 'verdict') return state.count === 2 * state.rounds ? { tone: 'done', label: 'ผลถูกต้อง' } : { tone: 'error', label: 'ค่าหาย' };
  return { tone: e.tone, label: e.tone === 'waiting' ? `${e.who} รอ lock` : e.tone === 'error' ? 'lost update' : `Thread ${e.who}` };
}

const render = (state: State) => <Canvas state={state} />;

export function RaceLockSim() {
  const [lock, setLock] = useState(PRESETS[0]!.value.lock);
  const [rounds, setRounds] = useState(PRESETS[0]!.value.rounds);
  const schedule = useParsedText(PRESETS[0]!.value.text, parseSchedule);
  const initialState = useMemo(() => init(lock, rounds, schedule.value), [lock, rounds, schedule.value]);

  return (
    <SimulationPlayer
      title="Race condition และ Lock"
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
            activeIndex={PRESETS.findIndex((p) => p.value.lock === lock && p.value.rounds === rounds && p.value.text === schedule.text)}
            onPick={(p) => {
              setLock(p.lock);
              setRounds(p.rounds);
              schedule.apply(p.text);
            }}
          />
          <SimToggle label="lock" value={lock ? 'on' : 'off'} options={LOCK} onChange={(v) => setLock(v === 'on')} />
          <NumberStepper label="จำนวนรอบต่อ thread" value={rounds} min={1} max={3} onChange={setRounds} />
          <SimTextInput label="ลำดับการสลับ thread" hint="ตัวอักษรแต่ละตัว = ให้ thread นั้นทำ 1 บรรทัด เมื่อลำดับหมด thread ที่เหลือทำต่อจนจบ" text={schedule.text} error={schedule.error} onChange={schedule.apply} />
        </div>
      }
      legend={
        <>
          <span>r = register ของแต่ละ thread</span>
          <span>count = ตัวแปรร่วม</span>
        </>
      }
    />
  );
}
