'use client';

import { useMemo, useState } from 'react';
import {
  CodeTrace,
  NumberStepper,
  OpChips,
  OutputLog,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { codeFor, formatOp, init, isDone, parse, step, type State } from './logic';

const PRESETS = [
  // QUEUE_6 p.12: the front index moves instead of the data
  { label: 'สไลด์ p.12: front เลื่อน', value: { text: 'enqueue A, enqueue B, enqueue C, dequeue, dequeue', capacity: 4 } },
  // p.15–17: wrap around, then p.16: grow when full (reaches [C, D, A, B] with front = 2, then enqueue X)
  { label: 'สไลด์ p.16: วนกลับและขยาย', value: { text: 'enqueue 1, enqueue 2, enqueue A, enqueue B, dequeue, dequeue, enqueue C, enqueue D, enqueue X, dequeue', capacity: 4 } },
  { label: 'dequeue ตอนว่าง', value: { text: 'enqueue A, dequeue, dequeue, peek', capacity: 2 } },
];

const CELL = 36;
const X0 = 16;
const Y = 22;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const length = state.data.length;
  const running = e.kind === 'expand' ? state.pc : state.pc - 1;
  const x = (i: number) => X0 + (i % 8) * CELL;
  const y = (i: number) => Y + Math.floor(i / 8) * 86;
  const rows = Math.ceil(length / 8);
  const tail = state.size > 0 ? (state.front + state.size - 1) % length : -1;
  const touched = e.kind === 'enqueue' || e.kind === 'dequeue' || e.kind === 'peek' ? e.index : -1;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{state.size}</b> · front = <b className="text-ink">{state.front}</b> · length = <b className="text-ink">{length}</b>
      </p>
      <svg
        viewBox={`0 0 320 ${rows * 86}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`ArrayQueue ความจุ ${length} front ${state.front} size ${state.size} อาเรย์: ${state.data.map((v) => v ?? '_').join(' ')}`}
      >
        {state.data.map((value, i) => {
          let box = value === null ? 'fill-surface stroke-line' : 'fill-surface stroke-faint';
          let width = 1.5;
          let dash: string | undefined;
          if (i === touched) {
            box = e.kind === 'dequeue' ? 'fill-ok-soft stroke-ok' : 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (e.kind === 'expand' && i >= e.from) {
            box = 'fill-warn-soft stroke-warn';
            width = 2;
            dash = '5 4';
          }
          return (
            <g key={i}>
              <text x={x(i) + CELL / 2} y={y(i) - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
                {i}
              </text>
              <rect x={x(i) + 1} y={y(i)} width={CELL - 2} height={CELL - 2} rx={5} strokeWidth={width} strokeDasharray={dash} className={box} />
              <text x={x(i) + CELL / 2} y={y(i) + CELL / 2} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[14px] font-semibold ${value === null ? 'fill-faint' : 'fill-ink'}`}>
                {value ?? (i === touched && e.kind === 'dequeue' ? 'null' : '')}
              </text>
              {i === state.front ? (
                <text x={x(i) + CELL / 2} y={y(i) + CELL + 12} textAnchor="middle" className="fill-accent font-mono text-[10px] font-semibold">
                  ↑ front
                </text>
              ) : null}
              {i === tail && i !== state.front ? (
                <text x={x(i) + CELL / 2} y={y(i) + CELL + 12} textAnchor="middle" className="fill-warn font-mono text-[10px] font-semibold">
                  ↑ ท้าย
                </text>
              ) : null}
              {i === tail && i === state.front ? (
                <text x={x(i) + CELL / 2} y={y(i) + CELL + 24} textAnchor="middle" className="fill-warn font-mono text-[10px] font-semibold">
                  (ท้ายด้วย)
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <OpChips ops={state.ops.map(formatOp)} current={running} />
      <div className="px-1.5">
        <CodeTrace {...codeFor(e)} label="ArrayQueue.java" />
      </div>
      <OutputLog lines={state.output} />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { title: 'สถานะเริ่มต้น: คิวว่าง', body: `อาเรย์มี ${state.data.length} ช่อง front = 0 และ size = 0 ตัวหัวคิวอยู่ที่ช่อง front ส่วนข้อมูลตัวอื่นเรียงต่อกันไปทางขวา และวนกลับมาช่อง 0 ได้เมื่อสุดอาเรย์` };
    case 'expand':
      return { title: `อาเรย์เต็ม: ขยายจาก ${e.from} เป็น ${e.to} ช่อง`, body: `size == elementData.length จึงสร้างอาเรย์ใหม่ขนาดสองเท่า แล้วคัดลอกตามลำดับคิว เริ่มจากช่อง front (${e.oldFront}) และเลื่อน j ด้วย (j + 1) % length เพื่อวนกลับต้นอาเรย์ ข้อมูลจึงมาเรียงใหม่เริ่มที่ช่อง 0 แล้วตั้ง front = 0 ถ้าคัดลอกตรงช่องเดิม ลำดับของคิวจะผิด` };
    case 'enqueue':
      return {
        title: `enqueue(${e.value}) ที่ช่อง ${e.index}`,
        body: `ช่องท้ายคิวถัดไปคือ b = (front + size) % length = (${e.front} + ${e.size}) % ${e.length} = ${e.index}${e.front + e.size >= e.length ? ' ผลบวกเกินความยาวอาเรย์ การ mod จึงวนกลับมาใช้ช่องว่างด้านหน้า ซึ่งว่างเพราะ dequeue ไปแล้ว' : ''} ไม่มีการเลื่อนข้อมูลเลย จึงใช้ Θ(1)`,
      };
    case 'dequeue':
      return { title: `dequeue() คืน ${e.value}`, body: `คืนตัวหัวคิวจากช่อง ${e.index} ใส่ null แทน แล้วเลื่อน front = (front + 1) % length = ${e.newFront} ข้อมูลตัวอื่นไม่ถูกย้ายเลย จึงใช้ Θ(1) ต่างจากแบบที่ตรึงหัวคิวไว้ช่อง 0 ซึ่งต้องเลื่อนทุกตัวและใช้ O(n)` };
    case 'peek':
      return { title: `peek() คืน ${e.value}`, body: `คืน elementData[front] คือช่อง ${e.index} โดยไม่แก้อะไร` };
    case 'empty':
      return { title: `${e.op}() บนคิวว่าง → NoSuchElementException`, body: 'peek() ตรวจ isEmpty() ก่อนเสมอ และ dequeue() เรียก peek() เป็นบรรทัดแรก จึงโยน exception เหมือนกัน (simulation ทำคำสั่งถัดไปต่อ)' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  switch (state.event.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'expand':
      return { tone: 'waiting', label: 'ขยายอาเรย์ O(n)' };
    case 'enqueue':
      return { tone: 'active', label: 'enqueue Θ(1)' };
    case 'dequeue':
      return { tone: 'done', label: 'dequeue Θ(1)' };
    case 'peek':
      return { tone: 'active', label: 'peek Θ(1)' };
    case 'empty':
      return { tone: 'error', label: 'Exception' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function ArrayQueueSim() {
  const ops = useParsedText(PRESETS[0]!.value.text, parse);
  const [capacity, setCapacity] = useState(PRESETS[0]!.value.capacity);
  const initialState = useMemo(() => init(ops.value, capacity), [ops.value, capacity]);

  return (
    <SimulationPlayer
      title="ArrayQueue: อาเรย์แบบวงวน"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === ops.text && p.value.capacity === capacity)}
            onPick={(p) => {
              setCapacity(p.capacity);
              ops.apply(p.text);
            }}
          />
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="ใช้ได้: enqueue <ค่า>, dequeue, peek — แก้แล้ว simulation เริ่มใหม่" text={ops.text} error={ops.error} onChange={ops.apply} rows={3} />
          <NumberStepper label="ความจุเริ่มต้น" value={capacity} min={1} max={8} onChange={setCapacity} />
        </div>
      }
      legend={
        <>
          <span>↑ front = หัวคิว</span>
          <span>↑ ท้าย = (front + size − 1) % length</span>
        </>
      }
    />
  );
}
