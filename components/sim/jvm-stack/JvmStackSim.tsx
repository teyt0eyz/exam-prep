'use client';

import { useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { codeFor, initJvm, isDone, step, type JvmInput, type JvmState } from './logic';

const PRESETS: { label: string; value: JvmInput }[] = [
  // STACK_5 p.27–37: a(3, 2); b(5);
  { label: 'สไลด์ p.27: a(3, 2); b(5)', value: { ax: 3, ay: 2, bx: 5 } },
  { label: 'a(9, 4); b(0)', value: { ax: 9, ay: 4, bx: 0 } },
];

function StackCanvas({ state }: { state: JvmState }) {
  const { event } = state;
  const pushed = event.kind === 'call' || event.kind === 'start';

  return (
    <div className="flex flex-col gap-3 px-1.5">
      <CodeTrace
        lines={codeFor(state.input)}
        active={state.line > 0 ? [state.line - 1] : []}
        label="StackFrame.java"
        startAt={1}
      />

      <div
        role="img"
        aria-label={`java stack มี ${state.frames.length} frame: ${
          state.frames.length ? state.frames.map((f) => f.method).join(', ') : 'ว่าง'
        } (ซ้ายคือล่างสุด)`}
      >
        <p className="mb-1 text-center text-[12px] font-medium leading-[18px] text-faint">
          Java stack (บนสุดอยู่ด้านบน)
        </p>
        <div className="mx-auto flex min-h-[132px] w-full max-w-[220px] flex-col-reverse gap-1.5 rounded-b-md border-x-[2.5px] border-b-[2.5px] border-faint px-2 pb-2 pt-3">
          {state.frames.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-faint">ว่าง</p>
          ) : (
            state.frames.map((frame, i) => {
              const isTop = i === state.frames.length - 1;
              return (
                <div
                  key={i}
                  className={`rounded-md border px-2 py-1 font-mono text-[12px] leading-[20px] ${
                    isTop
                      ? pushed
                        ? 'border-[2.5px] border-accent bg-accent-soft'
                        : 'border-2 border-accent bg-surface'
                      : 'border-line bg-surface'
                  }`}
                >
                  <p className="font-semibold text-ink">
                    {frame.method}()
                    {isTop ? <span className="ml-1 font-sans text-[11px] font-medium text-accent">กำลังทำงาน</span> : null}
                  </p>
                  {frame.method === 'main' ? <p className="text-muted">args</p> : null}
                  {frame.vars.map(([name, value]) => (
                    <p key={name} className="text-muted">
                      {name} = <span className="text-ink">{value ?? '?'}</span>
                    </p>
                  ))}
                  <p className="text-faint">RA: {frame.ra}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function explain(state: JvmState): SimExplanation {
  const { event } = state;
  const depth = state.frames.length;
  switch (event.kind) {
    case 'start':
      return {
        title: 'JVM เรียก main → push frame แรก',
        body: 'ทุกครั้งที่เรียกเมท็อด JVM จะสร้างกรอบกองซ้อน (stack frame) แล้ว push ลง java stack ใน frame เก็บพารามิเตอร์ ตัวแปร local และ return address (RA) คือตำแหน่งที่จะกลับไปทำต่อเมื่อเมท็อดจบ frame ของ main มี args และ RA ชี้กลับไปที่ JVM',
      };
    case 'call':
      return {
        title: `บรรทัด ${String(event.fromLine).padStart(2, '0')}: เรียก ${event.method}(${event.args}) → push frame`,
        body: `สร้าง frame ใหม่ของ ${event.method} วางไว้บนสุด ใส่ค่าพารามิเตอร์ที่ส่งมา และจำ RA = ${event.ra} คือบรรทัดถัดจากจุดที่เรียก แล้วกระโดดไปทำบรรทัดแรกของ ${event.method} เมท็อดที่กำลังทำงานคือ frame บนสุดเสมอ ตอนนี้ stack มี ${depth} frame`,
      };
    case 'assign':
      return event.name === 'z'
        ? {
            title: `int z = x/y → z = ${event.value}`,
            body: `คำนวณ ${event.expr} แบบจำนวนเต็ม (ปัดเศษทิ้ง) ได้ ${event.value} แล้วเก็บใน z ซึ่งเป็นตัวแปร local จึงอยู่ใน frame ของ a เท่านั้น frame อื่นมองไม่เห็น`,
          }
        : {
            title: `++x → x = ${event.value}`,
            body: `เพิ่มค่า x ใน frame ของ b เป็น ${event.value} ตัวแปร x นี้เป็นสำเนาที่อยู่ใน frame ของ b เอง ค่าของตัวแปรใน frame ของผู้เรียกจึงไม่เปลี่ยน แม้จะชื่อ x เหมือนกันก็ตาม`,
          };
    case 'ret':
      return event.method === 'main'
        ? {
            title: 'main จบ → pop frame สุดท้าย',
            body: 'pop frame ของ main ออก java stack ว่าง โปรแกรมจบการทำงาน สังเกตว่า frame ที่ถูกเรียกทีหลังสุดถูก pop ก่อนเสมอ ตรงกับ LIFO ของ stack',
          }
        : {
            title: `${event.method} จบ → pop frame แล้วกลับไปบรรทัด ${event.ra}`,
            body: `pop frame ของ ${event.method} ทิ้ง พารามิเตอร์และตัวแปร local ของมันหายไปทั้งหมด แล้วอ่าน RA ที่เก็บไว้ (${event.ra}) เพื่อกลับไปทำต่อในเมท็อดที่เรียกมา ซึ่งตอนนี้กลายเป็น frame บนสุด ตอนนี้ stack เหลือ ${depth} frame`,
          };
  }
}

function status(state: JvmState): { tone: SimTone; label: string } {
  switch (state.event.kind) {
    case 'start':
    case 'call':
      return { tone: 'active', label: 'push frame' };
    case 'assign':
      return { tone: 'normal', label: 'คำนวณ' };
    case 'ret':
      return { tone: 'done', label: 'pop frame' };
  }
}

const render = (state: JvmState) => <StackCanvas state={state} />;

const FIELDS: { key: keyof JvmInput; label: string; min: number }[] = [
  { key: 'ax', label: 'a: x', min: 0 },
  { key: 'ay', label: 'a: y', min: 1 },
  { key: 'bx', label: 'b: x', min: 0 },
];

export function JvmStackSim() {
  const [input, setInput] = useState<JvmInput>(PRESETS[0]!.value);
  const initialState = useMemo(() => initJvm(input), [input]);

  const setField = (key: keyof JvmInput, raw: string, min: number) => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return;
    setInput((prev) => ({ ...prev, [key]: Math.min(99, Math.max(min, n)) }));
  };

  const inputs = (
    <div className="flex flex-col gap-3">
      <PresetBar
        presets={PRESETS}
        activeIndex={PRESETS.findIndex(
          (p) => p.value.ax === input.ax && p.value.ay === input.ay && p.value.bx === input.bx,
        )}
        onPick={setInput}
      />
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map(({ key, label, min }) => (
          <label key={key} className="text-[13px] font-medium leading-[20px]">
            <span className="font-mono">{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              max={99}
              value={input[key]}
              onChange={(e) => setField(key, e.target.value, min)}
              className="mt-1 block h-11 w-full rounded-md border border-line bg-canvas px-3 font-mono text-[16px]"
            />
          </label>
        ))}
      </div>
      <p className="text-[12px] leading-[18px] text-faint">
        ค่า 0–99 (y ต้องไม่เป็น 0 เพราะ x/y จะหารด้วยศูนย์) — แก้แล้ว simulation เริ่มใหม่
      </p>
    </div>
  );

  return (
    <SimulationPlayer
      title="กองซ้อนใน JVM: stack frame"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={inputs}
      legend={
        <>
          <span>RA = return address</span>
          <span>เรียกเมท็อด = push frame</span>
          <span>return = pop frame</span>
        </>
      }
    />
  );
}
