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
  // COLLECTION_1_2n p.39–40: {คิด, นัท, วิน}, remove the first one
  { label: 'สไลด์ p.39: remove', value: { text: 'add คิด, add นัท, add วิน, remove คิด', capacity: 5 } },
  // p.41 TestCollection (province names shortened to fit a cell)
  { label: 'สไลด์ p.41: TestCollection', value: { text: 'add BKK, add HKT, add BKK, add SGK, remove HKT, contains HKT, contains BKK', capacity: 5 } },
  { label: 'อาเรย์เต็ม', value: { text: 'add A, add B, add C, contains C', capacity: 2 } },
];

const PER_ROW = 6;
const CELL = 48;
const X0 = 16;
const ROW_H = 74;

function Canvas({ state }: { state: State }) {
  const { event } = state;
  const rows = Math.ceil(state.data.length / PER_ROW);
  const at = (i: number) => ({ x: X0 + (i % PER_ROW) * CELL, y: 20 + Math.floor(i / PER_ROW) * ROW_H });
  const running = event.kind === 'expand' || event.kind === 'compare' ? state.pc : state.pc - 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{state.size}</b> · elementData.length = <b className="text-ink">{state.data.length}</b>
      </p>
      <svg
        viewBox={`0 0 320 ${rows * ROW_H + 4}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`elementData ความจุ ${state.data.length} ช่อง มีข้อมูล ${state.size} ตัว: ${state.size ? state.data.slice(0, state.size).join(', ') : 'ว่าง'}`}
      >
        {state.data.map((value, i) => {
          const { x, y } = at(i);
          let box = 'fill-surface stroke-faint';
          let width = 1.5;
          let dash: string | undefined;
          if (event.kind === 'compare' && event.index === i) {
            box = event.match ? 'fill-ok-soft stroke-ok' : 'fill-warn-soft stroke-warn';
            width = 3;
            dash = event.match ? undefined : '5 4';
          } else if ((event.kind === 'add' || event.kind === 'removed') && event.index === i && value !== null) {
            box = 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (event.kind === 'removed' && event.last === i) {
            box = 'fill-bad-soft stroke-bad';
            width = 2.5;
          } else if (event.kind === 'expand' && i >= event.from) {
            box = 'fill-warn-soft stroke-warn';
            width = 2;
            dash = '5 4';
          }
          return (
            <g key={i}>
              <text x={x + CELL / 2} y={y - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
                {i}
              </text>
              <rect x={x + 1} y={y} width={CELL - 2} height={36} rx={5} strokeWidth={width} strokeDasharray={dash} className={box} />
              <text x={x + CELL / 2} y={y + 18} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[13px] font-semibold ${value === null ? 'fill-faint' : 'fill-ink'}`}>
                {value ?? (event.kind === 'removed' && event.last === i ? 'null' : '')}
              </text>
              {i === state.size ? (
                <text x={x + CELL / 2} y={y + 50} textAnchor="middle" className="fill-accent font-mono text-[10px] font-semibold">
                  ↑ size
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <OpChips ops={state.ops.map(formatOp)} current={running} />
      <div className="px-1.5">
        <CodeTrace {...codeFor(event)} label="ArrayCollection.java" />
      </div>
      <OutputLog lines={state.output} />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const { event, size } = state;
  switch (event.kind) {
    case 'init':
      return { title: 'สถานะเริ่มต้น', body: `อาเรย์ elementData มี ${state.data.length} ช่อง และ size = 0 ข้อมูลของ collection จะอยู่ติดกันในช่อง 0 ถึง size − 1 เสมอ ไม่มีช่องว่างคั่นกลาง` };
    case 'expand':
      return { title: `อาเรย์เต็ม: ขยายจาก ${event.from} เป็น ${event.to} ช่อง`, body: `add เรียก ensureCapacity(size + 1) ก่อน เมื่อต้องการ ${event.from + 1} ช่องแต่มีแค่ ${event.from} จึงสร้างอาเรย์ใหม่ขนาด max(capacity, 2 × length) = ${event.to} แล้วคัดลอกข้อมูลเดิมทุกตัวมาใส่ การ add ครั้งนี้จึงใช้เวลา O(n)` };
    case 'add':
      return { title: `add(${event.value})`, body: `ใส่ ${event.value} ต่อท้ายที่ช่อง ${event.index} ด้วย elementData[size++] = e แล้ว size เป็น ${size} Collection ไม่มีอันดับ จึงเลือกใส่ตรงที่ทำได้เร็วที่สุด คือท้ายข้อมูล ใช้เวลา Θ(1)` };
    case 'compare':
      return event.match
        ? { title: `indexOf: ช่อง ${event.index} ตรงกับ ${event.value}`, body: `elementData[${event.index}].equals(${event.value}) เป็นจริง indexOf คืน ${event.index} ทันทีโดยไม่ดูช่องที่เหลือ${event.op === 'contains' ? ' ดังนั้น contains คืน true เพราะ indexOf(e) != -1' : ' ขั้นถัดไป remove จะลบช่องนี้'}` }
        : { title: `indexOf: ช่อง ${event.index} ไม่ใช่ ${event.value}`, body: `เทียบด้วย equals แล้วไม่ตรง จึงเลื่อนไปช่องถัดไป การค้นแบบนี้ต้องไล่ทีละช่องจากช่อง 0 กรณีแย่สุดต้องดูครบทั้ง size ช่อง จึงใช้เวลา O(n)` };
    case 'notFound':
      return { title: `ไม่พบ ${event.value}`, body: event.op === 'contains' ? `ดูครบทุกช่องแล้วไม่พบ indexOf คืน −1 ดังนั้น contains คืน false` : `ดูครบทุกช่องแล้วไม่พบ indexOf คืน −1 เงื่อนไข i != -1 เป็นเท็จ remove จึงไม่ทำอะไร และไม่เกิด error` };
    case 'removed':
      return event.moved === null
        ? { title: `remove(${event.value}): ลบตัวท้ายสุด`, body: `ตัวที่ลบอยู่ช่องท้ายสุดพอดี (ช่อง ${event.index}) คำสั่ง elementData[i] = elementData[--size] จึงเขียนค่าทับตัวเอง แล้วบรรทัดถัดไปใส่ null ในช่องนั้น size เหลือ ${size}` }
        : { title: `remove(${event.value}): ย้ายตัวท้ายมาแทน`, body: `ลด size เป็น ${size} แล้วนำตัวท้ายสุด (${event.moved} จากช่อง ${event.last}) มาเขียนทับช่อง ${event.index} จากนั้นใส่ null ในช่อง ${event.last} ไม่ต้องเลื่อนข้อมูลตัวอื่นเลย ทำได้เพราะ Collection ไม่สนใจอันดับ แต่ลำดับของข้อมูลในอาเรย์เปลี่ยนไป` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  switch (state.event.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'expand':
      return { tone: 'waiting', label: 'ขยายอาเรย์' };
    case 'add':
      return { tone: 'active', label: 'add Θ(1)' };
    case 'compare':
      return state.event.match ? { tone: 'done', label: 'พบ' } : { tone: 'waiting', label: 'กำลังค้น O(n)' };
    case 'notFound':
      return { tone: 'error', label: 'ไม่พบ' };
    case 'removed':
      return { tone: 'active', label: 'ลบแล้ว' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function ArrayCollectionSim() {
  const ops = useParsedText(PRESETS[0]!.value.text, parse);
  const [capacity, setCapacity] = useState(PRESETS[0]!.value.capacity);
  const initialState = useMemo(() => init(ops.value, capacity), [ops.value, capacity]);

  return (
    <SimulationPlayer
      title="ArrayCollection: add / remove / contains"
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
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="ใช้ได้: add <ค่า>, remove <ค่า>, contains <ค่า> — แก้แล้ว simulation เริ่มใหม่" text={ops.text} error={ops.error} onChange={ops.apply} rows={3} />
          <NumberStepper label="ความจุเริ่มต้น" value={capacity} min={1} max={6} onChange={setCapacity} />
        </div>
      }
      legend={
        <>
          <span>เส้นประเหลือง = ช่องที่กำลังเทียบ</span>
          <span>↑ size = ช่องว่างถัดไป</span>
        </>
      }
    />
  );
}
