'use client';

import { useMemo } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { init, isDone, parseProgram, source, step, type State } from './logic';

const PRESETS = [
  // JavaScript - for React p.1 (asynchronous JavaScript); the classic 1-3-2 ordering
  { label: 'setTimeout 0 ไม่ได้รันทันที', value: 'log 1\ntimeout 2\nlog 3' },
  { label: 'Promise มาก่อน setTimeout', value: 'log A\ntimeout B\npromise C\nlog D' },
  { label: 'หลายตัวปนกัน', value: 'timeout T1\npromise P1\nlog S1\npromise P2\ntimeout T2\nlog S2' },
];

const box = 'rounded-md border border-line bg-surface px-3 py-2';
const chip = 'rounded-sm border px-2 py-0.5 font-mono text-[12px] leading-5';

function Queue({ title, items, active, note }: { title: string; items: readonly string[]; active: boolean; note: string }) {
  return (
    <div className={`${box} ${active ? 'border-accent' : ''}`}>
      <p className={`text-[12px] font-medium leading-[18px] ${active ? 'text-accent' : 'text-faint'}`}>{title}</p>
      <div className="mt-1 flex min-h-[28px] flex-wrap gap-1.5">
        {items.length === 0 ? <span className="font-mono text-[12px] leading-6 text-faint">(ว่าง)</span> : null}
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className={`${chip} ${i === 0 && active ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line bg-canvas text-ink'}`}>{item}</span>
        ))}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-faint">{note}</p>
    </div>
  );
}

function Canvas({ state }: { state: State }) {
  const current = state.event.kind === 'run' ? state.event.line : -1;
  return (
    <div className="flex flex-col gap-3">
      <ol className="overflow-x-auto rounded-md border border-line bg-code py-2 font-mono text-[12px] leading-6">
        {state.lines.map((line, i) => (
          <li key={i} className={`min-w-max px-3 ${i === current ? 'bg-accent-soft font-semibold text-accent' : i < state.pc ? 'text-faint' : 'text-ink'}`}>
            <span className="mr-2 inline-block w-4 text-right text-faint">{i + 1}</span>
            {source(line)}
          </li>
        ))}
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        <Queue title="Microtask queue (Promise)" items={state.micro} active={state.phase === 'micro'} note="ทำให้หมดก่อน ทันทีที่โค้ดปกติจบ" />
        <Queue title="Task queue (setTimeout)" items={state.macro} active={state.phase === 'macro'} note="ทำหลัง microtask หมดแล้วเท่านั้น" />
      </div>
      <div className={box}>
        <p className="text-[12px] font-medium leading-[18px] text-faint">Console</p>
        <p className="mt-1 min-h-[24px] font-mono text-[14px] leading-6">{state.output.length === 0 ? <span className="text-faint">(ยังไม่มีอะไรพิมพ์)</span> : state.output.join('  ')}</p>
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  if (e.kind === 'init') return { title: 'JavaScript ทำทีละอย่าง', body: 'JavaScript มี thread เดียว โค้ดปกติ (synchronous) จะรันจากบนลงล่างจนจบก่อน ส่วน callback ของงาน asynchronous ถูกพักไว้ในคิว แล้วค่อยถูกหยิบมาทำเมื่อไม่มีโค้ดปกติเหลือ' };
  if (e.kind === 'stack-empty') {
    return { title: 'โค้ดปกติจบแล้ว', body: state.phase === 'done' ? 'ไม่มี callback ค้างในคิว โปรแกรมจบ' : `call stack ว่าง event loop จึงเริ่มหยิบงานจากคิว โดยดู Microtask queue ก่อนเสมอ${state.phase === 'macro' ? ' (ตอนนี้ว่าง จึงไปที่ Task queue)' : ''}` };
  }
  if (e.kind === 'run') {
    const line = state.lines[e.line]!;
    if (line.kind === 'log') return { title: `บรรทัด ${e.line + 1}: พิมพ์ ${line.label} ทันที`, body: 'console.log เป็นโค้ด synchronous จึงทำงานและพิมพ์ออกมาเลย' };
    if (line.kind === 'promise') return { title: `บรรทัด ${e.line + 1}: ฝาก ${line.label} ไว้ใน Microtask queue`, body: 'callback ของ .then() ไม่ได้รันตอนนี้ แม้ Promise จะ resolve แล้ว มันถูกต่อคิวเป็น microtask และจะรันหลังโค้ดปกติจบ (await ทำงานแบบเดียวกัน: โค้ดหลัง await คือ microtask)' };
    return { title: `บรรทัด ${e.line + 1}: ฝาก ${line.label} ไว้ใน Task queue`, body: 'setTimeout ส่ง callback ไปให้ browser จับเวลา แม้ตั้ง 0 ms callback ก็ต้องไปต่อคิวใน Task queue และรอให้โค้ดปกติกับ microtask ทั้งหมดจบก่อน' };
  }
  return e.from === 'micro'
    ? { title: `Microtask: พิมพ์ ${e.label}`, body: `หยิบ callback ของ Promise ตัวแรกในคิวมารัน${state.micro.length > 0 ? ' และจะทำ microtask ต่อจนหมดคิวก่อนไปแตะ Task queue' : ' ตอนนี้ Microtask queue หมดแล้ว จึงไปที่ Task queue ได้'}` }
    : { title: `Task: พิมพ์ ${e.label}`, body: 'หยิบ callback ของ setTimeout มารันทีละตัวตามลำดับที่เข้าคิว นี่คือเหตุผลที่ setTimeout(…, 0) พิมพ์ทีหลังเสมอ' };
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.event.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (state.phase === 'done') return { tone: 'done', label: 'จบ' };
  if (state.event.kind === 'drain') return { tone: 'active', label: state.event.from === 'micro' ? 'Microtask' : 'Task' };
  return state.event.kind === 'run' && state.lines[state.event.line]!.kind !== 'log' ? { tone: 'waiting', label: 'เข้าคิว' } : { tone: 'active', label: 'Synchronous' };
}
const render = (state: State) => <Canvas state={state} />;

export function EventLoopSim() {
  const program = useParsedText(PRESETS[0]!.value, parseProgram);
  const initialState = useMemo(() => init(program.value), [program.value]);
  return (
    <SimulationPlayer
      title="ลำดับการทำงานของโค้ด asynchronous"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === program.text)} onPick={program.apply} />
          <SimTextInput label="โปรแกรม (บรรทัดละ 1 คำสั่ง)" hint="log X = console.log · timeout X = setTimeout(…, 0) · promise X = Promise.resolve().then(…)" text={program.text} error={program.error} onChange={program.apply} rows={4} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">สีเน้น = กำลังทำ</span>
          <span className="text-faint">ลำดับ: โค้ดปกติ → Microtask → Task</span>
        </>
      }
    />
  );
}
