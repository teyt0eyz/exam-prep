'use client';

import { useId, useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import {
  MAX_INITIAL_CAPACITY,
  codeFor,
  formatOp,
  initArrayStack,
  isDone,
  parseOps,
  step,
  type ArrayStackState,
  type StackOp,
} from './logic';

interface Config {
  text: string;
  capacity: number;
}

const PRESETS: { label: string; value: Config }[] = [
  // STACK_5 p.9: s = new ArrayStack(1); push A, B, C; pop
  { label: 'สไลด์ p.9: ขยายอาเรย์', value: { text: 'push A, push B, push C, pop', capacity: 1 } },
  // STACK_5 p.41: the test program (run there with sLinkStack, same results)
  {
    label: 'สไลด์ p.41: โปรแกรมทดสอบ',
    value: { text: 'push A, push B, push C, push E, peek, pop, peek, pop, pop, push F, peek', capacity: 4 },
  },
  { label: 'pop ตอนว่าง', value: { text: 'push A, pop, pop, peek', capacity: 2 } },
];

// SVG geometry (viewBox units)
const PER_ROW = 8;
const CELL = 36;
const X0 = 16;
const ROW_H = 78;

function ArrayCanvas({ state }: { state: ArrayStackState }) {
  const capacity = state.data.length;
  const rows = Math.ceil(capacity / PER_ROW);
  const { event } = state;
  const pos = (i: number) => ({ x: X0 + (i % PER_ROW) * CELL, y: 22 + Math.floor(i / PER_ROW) * ROW_H });
  const touched = event.kind === 'push' || event.kind === 'pop' || event.kind === 'peek' ? event.index : -1;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{state.size}</b> · elementData.length ={' '}
        <b className="text-ink">{capacity}</b>
      </p>
      <svg
        viewBox={`0 0 320 ${rows * ROW_H + 6}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`elementData ความจุ ${capacity} ช่อง มีข้อมูล ${state.size} ตัว: ${
          state.size ? state.data.slice(0, state.size).join(', ') : 'ว่าง'
        }`}
      >
        {state.data.map((value, i) => {
          const { x, y } = pos(i);
          const isNew = event.kind === 'expand' && i >= event.from;
          let box = 'fill-surface stroke-faint';
          let width = 1.5;
          if (i === touched && event.kind === 'pop') {
            box = 'fill-ok-soft stroke-ok';
            width = 2.5;
          } else if (i === touched) {
            box = 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (isNew) {
            box = 'fill-warn-soft stroke-warn';
            width = 2;
          }
          return (
            <g key={i}>
              <text x={x + CELL / 2} y={y - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
                {i}
              </text>
              <rect
                x={x + 1}
                y={y}
                width={CELL - 2}
                height={CELL - 2}
                rx={5}
                strokeWidth={width}
                strokeDasharray={isNew ? '5 4' : undefined}
                className={box}
              />
              <text
                x={x + CELL / 2}
                y={y + CELL / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-mono text-[14px] font-semibold ${value === null ? 'fill-faint' : 'fill-ink'}`}
              >
                {value ?? (i === touched && event.kind === 'pop' ? 'null' : '')}
              </text>
              {i === state.size ? (
                <text
                  x={x + CELL / 2}
                  y={y + CELL + 13}
                  textAnchor="middle"
                  className="fill-accent font-mono text-[10px] font-semibold"
                >
                  ↑ size
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <ol className="flex flex-wrap justify-center gap-1.5 px-2" aria-label="ลำดับคำสั่ง">
        {state.ops.map((op, i) => {
          const current = event.kind === 'expand' ? i === state.pc : i === state.pc - 1;
          return (
            <li
              key={i}
              aria-current={current ? 'step' : undefined}
              className={`rounded-sm border px-2 font-mono text-[12px] leading-[22px] ${
                current
                  ? 'border-accent bg-accent text-accent-ink'
                  : i < state.pc
                    ? 'border-line text-faint line-through'
                    : 'border-line bg-surface text-ink'
              }`}
            >
              {formatOp(op)}
            </li>
          );
        })}
      </ol>

      <div className="px-1.5">
        <CodeTrace {...codeFor(event)} label="ArrayStack.java" />
      </div>

      {state.output.length > 0 ? (
        <div className="px-1.5">
          <p className="text-[12px] font-medium leading-[18px] text-faint">ค่าที่คืนกลับมา</p>
          <ul className="font-mono text-[13px] leading-[22px] text-ink">
            {state.output.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function explain(state: ArrayStackState): SimExplanation {
  const { event, size } = state;
  const capacity = state.data.length;
  switch (event.kind) {
    case 'init':
      return {
        title: 'สถานะเริ่มต้น',
        body: `สร้าง ArrayStack ที่มีอาเรย์ elementData ${capacity} ช่อง และ size = 0 ข้อมูลจะอยู่ในช่อง 0 ถึง size − 1 เสมอ ตัวบนสุดของ stack จึงอยู่ที่ช่อง size − 1 และช่องว่างถัดไปคือช่อง size`,
      };
    case 'expand':
      return {
        title: `อาเรย์เต็ม: ขยายจาก ${event.from} เป็น ${event.to} ช่อง`,
        body: `ก่อน push ตรวจพบว่า size == elementData.length (${event.from}) จึงสร้างอาเรย์ใหม่ขนาด 2 × size แล้วคัดลอกข้อมูลเดิมทั้ง ${event.from} ตัวมาใส่ ขั้นนี้ต้องวนคัดลอกทุกตัว การ push ครั้งนี้จึงใช้เวลา O(n) ขั้นถัดไปจึงจะใส่ข้อมูลใหม่`,
      };
    case 'push':
      return {
        title: `push(${event.value})`,
        body: `ทำ elementData[size++] = e คือใส่ ${event.value} ลงช่อง ${event.index} (ค่า size เดิม) ก่อน แล้วค่อยเพิ่ม size เป็น ${size} ถ้าใช้ ++size ข้อมูลจะไปอยู่ผิดช่อง และช่อง ${event.index} จะถูกข้ามไป`,
      };
    case 'peek':
      return {
        title: `peek() คืน ${event.value}`,
        body: `stack ไม่ว่าง จึงคืน elementData[size − 1] คือช่อง ${event.index} โดยไม่แก้อะไร size ยังเป็น ${size} เหมือนเดิม`,
      };
    case 'pop':
      return {
        title: `pop() คืน ${event.value}`,
        body: `เรียก peek() เก็บ ${event.value} ไว้ก่อน แล้วทำ elementData[--size] = null คือลด size เป็น ${size} ก่อน แล้วใส่ null ในช่อง ${event.index} เพื่อไม่ให้อาเรย์ยังอ้างอ็อบเจกต์ที่เอาออกไปแล้ว ขนาดอาเรย์ยังเป็น ${capacity} ช่องเท่าเดิม ไม่หดลง`,
      };
    case 'empty':
      return {
        title: `${event.op}() บน stack ว่าง → NoSuchElementException`,
        body:
          event.op === 'pop'
            ? 'pop() เรียก peek() เป็นบรรทัดแรก และ peek() ตรวจ isEmpty() แล้วโยน NoSuchElementException จึงไม่มีอะไรถูกลบ ในโปรแกรมจริงการทำงานจะหยุดตรงนี้ถ้าไม่ดัก exception (simulation ทำคำสั่งถัดไปต่อเพื่อให้ดูได้ครบ)'
            : 'peek() ตรวจ isEmpty() เป็นอย่างแรก เมื่อ size == 0 จึงโยน NoSuchElementException ในโปรแกรมจริงการทำงานจะหยุดตรงนี้ถ้าไม่ดัก exception (simulation ทำคำสั่งถัดไปต่อเพื่อให้ดูได้ครบ)',
      };
  }
}

function status(state: ArrayStackState): { tone: SimTone; label: string } {
  switch (state.event.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'expand':
      return { tone: 'waiting', label: 'ขยายอาเรย์ O(n)' };
    case 'push':
      return { tone: 'active', label: 'push Θ(1)' };
    case 'peek':
      return { tone: 'active', label: 'peek Θ(1)' };
    case 'pop':
      return { tone: 'done', label: 'pop Θ(1)' };
    case 'empty':
      return { tone: 'error', label: 'Exception' };
  }
}

const render = (state: ArrayStackState) => <ArrayCanvas state={state} />;

export function ArrayStackSim() {
  const opsId = useId();
  const first = PRESETS[0]!.value;
  const [text, setText] = useState(first.text);
  const [capacity, setCapacity] = useState(first.capacity);
  // The sim keeps running the last valid program while the user is mid-edit.
  const [ops, setOps] = useState<StackOp[]>(() => {
    const parsed = parseOps(first.text);
    return 'ops' in parsed ? parsed.ops : [];
  });
  const parsed = useMemo(() => parseOps(text), [text]);
  const initialState = useMemo(() => initArrayStack(ops, capacity), [ops, capacity]);
  const activePreset = PRESETS.findIndex((p) => p.value.text === text && p.value.capacity === capacity);

  const applyText = (value: string) => {
    setText(value);
    const result = parseOps(value);
    if ('ops' in result) setOps(result.ops);
  };

  const stepper =
    'grid h-11 w-11 place-items-center rounded-md bg-surface-2 text-[18px] text-ink ' +
    'hover:brightness-95 disabled:cursor-not-allowed disabled:text-faint disabled:opacity-60';

  const inputs = (
    <div className="flex flex-col gap-3">
      <PresetBar
        presets={PRESETS}
        activeIndex={activePreset}
        onPick={(config) => {
          setCapacity(config.capacity);
          applyText(config.text);
        }}
      />
      <div>
        <label htmlFor={opsId} className="mb-1 block text-[14px] font-medium leading-[22px]">
          คำสั่ง (คั่นด้วย ,)
        </label>
        <textarea
          id={opsId}
          rows={2}
          value={text}
          onChange={(e) => applyText(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={'error' in parsed}
          aria-describedby={`${opsId}-hint`}
          className="block w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 font-mono text-[16px] leading-6 aria-invalid:border-bad"
        />
        <p
          id={`${opsId}-hint`}
          className={`mt-1 text-[12px] leading-[18px] ${'error' in parsed ? 'text-bad' : 'text-faint'}`}
        >
          {'error' in parsed ? parsed.error : 'ใช้ได้: push <ค่า>, pop, peek — แก้แล้ว simulation เริ่มใหม่'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium leading-[22px]">ความจุเริ่มต้น new ArrayStack(cap)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={stepper}
            onClick={() => setCapacity((c) => c - 1)}
            disabled={capacity <= 1}
            aria-label="ลดความจุเริ่มต้น"
          >
            −
          </button>
          <output className="w-6 text-center font-mono font-semibold">{capacity}</output>
          <button
            type="button"
            className={stepper}
            onClick={() => setCapacity((c) => c + 1)}
            disabled={capacity >= MAX_INITIAL_CAPACITY}
            aria-label="เพิ่มความจุเริ่มต้น"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <SimulationPlayer
      title="ArrayStack: push / pop / peek"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={inputs}
      legend={
        <>
          <span>ช่อง 0 = ล่างสุดของ stack</span>
          <span>↑ size = ช่องว่างถัดไป</span>
          <span>เส้นประ = ช่องที่เพิ่งขยาย</span>
        </>
      }
    />
  );
}
