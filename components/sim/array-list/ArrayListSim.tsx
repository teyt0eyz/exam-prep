'use client';

import { useMemo } from 'react';
import {
  CodeTrace,
  OpChips,
  OutputLog,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { CAPACITY, codeFor, formatOp, init, isDone, parse, step, type State } from './logic';

const PRESETS = [
  // LIST_4 p.9 (indexOf("A") = 1 is written out as "add 1 Z")
  { label: 'สไลด์ p.9: ตัวอย่างการใช้งาน', value: 'add 0 A, add B, add 0 C, set 2 D, add 1 Z, remove 2' },
  { label: 'เพิ่มหน้า vs เพิ่มท้าย', value: 'add A, add B, add C, add D, add 0 X, add Y' },
  { label: 'index ผิดช่วง', value: 'add A, add B, add 3 C, remove 2, get 1' },
];

const CELL = 36;
const X0 = 16;
const Y = 22;

function Canvas({ state }: { state: State }) {
  const { event } = state;
  const shifting = event.kind === 'shiftRight' || event.kind === 'shiftLeft';
  const running = shifting ? state.pc : state.pc - 1;
  const x = (i: number) => X0 + i * CELL;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{state.size}</b>
        {shifting || event.kind === 'insert' || event.kind === 'removed' ? (
          <>
            {' '}
            · ย้ายข้อมูลไปแล้ว <b className="text-ink">{shifting ? state.moves : event.moves}</b> ครั้ง
          </>
        ) : null}
      </p>
      <svg
        viewBox={`0 0 320 ${Y + CELL + 24}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`ArrayList มี ${state.size} ตัว: ${state.size ? state.data.slice(0, state.size).join(', ') : 'ว่าง'}`}
      >
        <defs>
          <marker id="al-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0L10,5L0,10z" className="fill-accent" />
          </marker>
        </defs>
        {state.data.map((value, i) => {
          let box = 'fill-surface stroke-faint';
          let width = 1.5;
          let dash: string | undefined;
          if (shifting && event.to === i) {
            box = 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (shifting && event.from === i) {
            box = 'fill-warn-soft stroke-warn';
            width = 2.5;
            dash = '5 4';
          } else if ((event.kind === 'insert' || event.kind === 'set' || event.kind === 'get') && event.index === i) {
            box = event.kind === 'get' ? 'fill-ok-soft stroke-ok' : 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (event.kind === 'removed' && i === state.size) {
            box = 'fill-bad-soft stroke-bad';
            width = 2.5;
          }
          const stale = shifting && event.from === i;
          return (
            <g key={i}>
              <text x={x(i) + CELL / 2} y={Y - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
                {i}
              </text>
              <rect x={x(i) + 1} y={Y} width={CELL - 2} height={CELL - 2} rx={5} strokeWidth={width} strokeDasharray={dash} className={box} />
              <text x={x(i) + CELL / 2} y={Y + CELL / 2} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[14px] font-semibold ${stale || value === null ? 'fill-faint' : 'fill-ink'}`}>
                {value ?? (event.kind === 'removed' && i === state.size ? 'null' : '')}
              </text>
            </g>
          );
        })}
        {shifting ? (
          <path
            d={`M${x(event.from) + CELL / 2} ${Y + CELL + 2} q${((event.to - event.from) * CELL) / 2} 16 ${(event.to - event.from) * CELL} 0`}
            fill="none"
            strokeWidth={2}
            markerEnd="url(#al-arrow)"
            className="stroke-accent"
          />
        ) : null}
      </svg>
      <OpChips ops={state.ops.map(formatOp)} current={running} />
      <div className="px-1.5">
        <CodeTrace {...codeFor(event)} label="ArrayList.java" />
      </div>
      <OutputLog lines={state.output} />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { title: 'สถานะเริ่มต้น: รายการว่าง', body: `ArrayList เก็บข้อมูลตัวที่ i ไว้ในช่อง i ของอาเรย์ ข้อมูลจึงต้องอยู่ติดกันและเรียงตามอันดับเสมอ ต่างจาก ArrayCollection ที่สลับลำดับได้ (อาเรย์ในภาพมี ${CAPACITY} ช่อง)` };
    case 'shiftRight':
      return { title: `เลื่อน ${e.value} จากช่อง ${e.from} ไปช่อง ${e.to}`, body: 'ก่อนแทรก ต้องเปิดช่องว่างโดยเลื่อนข้อมูลไปทางขวาทีละตัว เริ่มจากตัวท้ายสุดก่อน (i = size แล้วลดลง) ถ้าเริ่มจากตัวหน้า ค่าจะถูกเขียนทับก่อนได้ย้าย ช่องเดิมยังมีค่าเก่าค้างอยู่จนกว่าจะถูกเขียนทับ' };
    case 'insert':
      return {
        title: `add(${e.index}, ${e.value}): ใส่ที่ช่อง ${e.index}`,
        body: e.moves === 0
          ? `ตำแหน่งที่แทรกคือท้ายรายการ (index = size) ลูปเลื่อนข้อมูลจึงไม่ทำงานเลย ใส่ได้ทันที นี่คือกรณีที่เร็วที่สุดของ add`
          : `เลื่อนข้อมูลไป ${e.moves} ครั้งจนช่อง ${e.index} ว่าง แล้วจึงใส่ ${e.value} ยิ่งแทรกใกล้ด้านหน้ายิ่งต้องเลื่อนมาก add(0, e) เลื่อนทุกตัว จึงเป็น O(n)`,
      };
    case 'shiftLeft':
      return { title: `เลื่อน ${e.value} จากช่อง ${e.from} มาช่อง ${e.to}`, body: 'การลบทำโดยเลื่อนข้อมูลที่อยู่ถัดไปมาทางซ้ายทับช่องที่ลบ ทีละตัว เริ่มจากตัวที่อยู่ติดกับช่องที่ลบก่อน (i = index + 1 แล้วเพิ่มขึ้น)' };
    case 'removed':
      return {
        title: `remove(${e.index}): ลบ ${e.value} แล้ว`,
        body: e.moves === 0
          ? `ลบตัวท้ายสุด ลูปเลื่อนข้อมูลไม่ทำงานเลย แค่ลด size และใส่ null ในช่องท้าย นี่คือกรณีที่เร็วที่สุดของ remove`
          : `เลื่อนข้อมูลมา ${e.moves} ครั้ง แล้วลด size และใส่ null ในช่องท้ายที่ว่างลง ยิ่งลบใกล้ด้านหน้ายิ่งต้องเลื่อนมาก remove(0) จึงช้าที่สุด`,
      };
    case 'set':
      return { title: `set(${e.index}, ${e.value})`, body: `เขียน ${e.value} ทับ ${e.old} ที่ช่อง ${e.index} โดยตรง ไม่มีการเลื่อนและ size ไม่เปลี่ยน ใช้เวลา Θ(1)` };
    case 'get':
      return { title: `get(${e.index}) = ${e.value}`, body: 'อาเรย์เข้าถึงช่องใดก็ได้โดยตรงด้วย index จึงใช้เวลา Θ(1) นี่คือข้อได้เปรียบหลักของ ArrayList เทียบกับรายการโยง' };
    case 'badIndex':
      return { title: `${e.op}: index ${e.index} ใช้ไม่ได้`, body: `ช่วง index ที่ถูกต้องสำหรับคำสั่งนี้คือ ${e.range} จำไว้ว่า add ใช้ได้ถึง size (ต่อท้าย) แต่ remove, get และ set ใช้ได้ถึง size − 1 เท่านั้น (simulation ข้ามคำสั่งนี้ไป)` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'shiftRight':
    case 'shiftLeft':
      return { tone: 'waiting', label: 'กำลังเลื่อน O(n)' };
    case 'insert':
      return { tone: 'active', label: 'แทรกแล้ว' };
    case 'removed':
      return { tone: 'done', label: 'ลบแล้ว' };
    case 'set':
    case 'get':
      return { tone: 'active', label: `${e.kind} Θ(1)` };
    case 'badIndex':
      return { tone: 'error', label: 'index ผิดช่วง' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function ArrayListSim() {
  const ops = useParsedText(PRESETS[0]!.value, parse);
  const initialState = useMemo(() => init(ops.value), [ops.value]);

  return (
    <SimulationPlayer
      title="ArrayList: add(i, e) และ remove(i)"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === ops.text)} onPick={ops.apply} />
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="ใช้ได้: add <ค่า>, add <i> <ค่า>, set <i> <ค่า>, remove <i>, get <i>" text={ops.text} error={ops.error} onChange={ops.apply} rows={3} />
        </div>
      }
      legend={
        <>
          <span>เส้นประ = ค่าเดิมที่ถูกคัดลอกไปแล้ว</span>
          <span>ลูกศร = การย้ายหนึ่งครั้ง</span>
        </>
      }
    />
  );
}
