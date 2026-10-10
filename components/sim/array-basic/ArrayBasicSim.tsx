'use client';

import { useMemo } from 'react';
import { OpChips, OutputLog, PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { format, init, isDone, parseArray, parseOps, step, type State } from './logic';

const CARS = 'Toyota, Honda, BMW, Tesla, Lexus';
const PRESETS = [
  // Array p.1: index, a missing index, length
  { label: 'สไลด์ p.1: index และ length', value: { array: CARS, ops: 'get 0, get 1, get 9, length, get 5, get 4' } },
  // Array p.2: push and pop
  { label: 'สไลด์ p.2: push และ pop', value: { array: CARS, ops: 'push Suzuki, pop, pop' } },
  // Array p.2: shift and unshift
  { label: 'สไลด์ p.2: shift และ unshift', value: { array: CARS, ops: 'shift, unshift Lambo' } },
  // Array p.4: includes is case-sensitive; slice does not change the array
  { label: 'สไลด์ p.4: includes และ slice', value: { array: 'Banana, Apple, Orange, Pineapple, Mango', ops: 'includes Banana, includes banana, slice 2, slice 1 3' } },
];

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const touched = e.kind === 'op' ? e.touched : [];
  return (
    <div className="flex flex-col gap-3">
      <OpChips ops={state.ops.map(format)} current={state.pc - 1} />
      <div className="overflow-x-auto">
        <div className="flex min-h-[64px] min-w-max items-start gap-1.5 px-1">
          {e.kind === 'op' && e.removedAt === 'start' ? <span className="mt-4 rounded-sm border border-dashed border-bad px-2 font-mono text-[12px] leading-[34px] text-bad">{e.result} ←</span> : null}
          {state.array.length === 0 ? <span className="mt-4 font-mono text-[13px] text-faint">[ ] (array ว่าง)</span> : null}
          {state.array.map((v, k) => (
            <div key={`${k}-${v}`} className="text-center">
              <p className="font-mono text-[10px] leading-4 text-faint">{k}</p>
              <p className={`rounded-sm border px-2 font-mono text-[12px] leading-[34px] ${touched.includes(k) ? (e.kind === 'op' && e.mutated ? 'border-ok bg-ok-soft font-semibold text-ok' : 'border-accent bg-accent-soft font-semibold text-accent') : 'border-line bg-surface text-ink'}`}>{v}</p>
            </div>
          ))}
          {e.kind === 'op' && e.removedAt === 'end' ? <span className="mt-4 rounded-sm border border-dashed border-bad px-2 font-mono text-[12px] leading-[34px] text-bad">→ {e.result}</span> : null}
        </div>
      </div>
      <p className="px-1 font-mono text-[12px] leading-5 text-muted">
        cars.length = <b className="text-ink">{state.array.length}</b> · index สุดท้าย = <b className="text-ink">{state.array.length - 1}</b>
      </p>
      <OutputLog lines={state.output} title="ค่าที่แต่ละคำสั่งคืน" />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  if (e.kind === 'init') return { title: 'array และ index', body: 'array เก็บได้หลายค่า (element) เข้าถึงด้วยหมายเลขตำแหน่ง (index) ที่เริ่มจาก 0 ตัวเลขเหนือกล่องคือ index ของแต่ละ element' };
  const op = e.op;
  const n = state.array.length;
  switch (op.type) {
    case 'push':
      return { title: `push("${op.value}") → ${e.result}`, body: `push เพิ่ม element ที่ท้าย array และคืนความยาวใหม่ (${e.result}) array เดิมถูกแก้ (mutate) แม้ประกาศด้วย const ก็ทำได้ เพราะ const ห้ามแค่การกำหนดค่าตัวแปรใหม่ ไม่ได้ห้ามแก้ของข้างใน` };
    case 'pop':
      return { title: `pop() → ${e.result}`, body: e.mutated ? `pop เอา element ตัวสุดท้ายออกและคืนค่านั้น array สั้นลงเหลือ ${n}` : 'array ว่างอยู่แล้ว pop จึงคืน undefined โดยไม่เกิด error' };
    case 'shift':
      return { title: `shift() → ${e.result}`, body: e.mutated ? `shift เอา element ตัวแรกออกและคืนค่านั้น element ที่เหลือเลื่อนมาข้างหน้าทั้งหมด index จึงเปลี่ยนทุกตัว` : 'array ว่างอยู่แล้ว shift จึงคืน undefined' };
    case 'unshift':
      return { title: `unshift("${op.value}") → ${e.result}`, body: `unshift เพิ่ม element ที่หน้า array (index 0) element เดิมเลื่อนไปข้างหลังทั้งหมด และคืนความยาวใหม่ (${e.result})` };
    case 'get':
      return { title: `cars[${op.index}] → ${e.result}`, body: op.index < n ? `index ${op.index} คือ element ตัวที่ ${op.index + 1} เพราะ index เริ่มจาก 0${op.index === n - 1 ? ' — ตัวสุดท้ายอยู่ที่ index length − 1 เสมอ' : ''}` : `ไม่มี element ที่ index ${op.index} (index สุดท้ายคือ ${n - 1}) JavaScript ไม่ error แต่คืน undefined${op.index === n ? ' — cars[cars.length] จึงเป็น undefined เสมอ' : ''}` };
    case 'length':
      return { title: `cars.length → ${e.result}`, body: 'length เป็น property (ไม่มีวงเล็บ) บอกจำนวน element มีค่ามากกว่า index สุดท้ายอยู่ 1 เสมอ' };
    case 'includes':
      return { title: `includes("${op.value}") → ${e.result}`, body: e.result === 'true' ? 'พบค่านี้ใน array จึงคืน true' : 'ไม่พบค่าที่ตรงกันทุกตัวอักษร includes แยกตัวพิมพ์เล็กใหญ่ (case-sensitive) เช่น "banana" ไม่เท่ากับ "Banana"' };
    default:
      return { title: `slice(${op.start}${op.end === undefined ? '' : `, ${op.end}`}) → ${e.result}`, body: `slice คืน array ใหม่ตั้งแต่ index ${op.start} ถึงก่อน index ${op.end ?? n}${op.end === undefined ? ' (ไม่ใส่ end = ถึงท้าย array)' : ' (ไม่รวม end)'} array เดิมไม่ถูกแก้` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (e.result === 'undefined') return { tone: 'waiting', label: 'undefined' };
  return e.mutated ? { tone: 'done', label: 'แก้ array' } : { tone: 'active', label: 'อ่านอย่างเดียว' };
}
const render = (state: State) => <Canvas state={state} />;

export function ArrayBasicSim() {
  const array = useParsedText(PRESETS[0]!.value.array, parseArray);
  const ops = useParsedText(PRESETS[0]!.value.ops, parseOps);
  const initialState = useMemo(() => init(array.value, ops.value), [array.value, ops.value]);

  return (
    <SimulationPlayer
      title="Array: index และ method พื้นฐาน"
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
            activeIndex={PRESETS.findIndex((p) => p.value.array === array.text && p.value.ops === ops.text)}
            onPick={(p) => {
              array.apply(p.array);
              ops.apply(p.ops);
            }}
          />
          <SimTextInput label="const cars = [ ... ] (คั่นด้วย ,)" hint="ค่าเริ่มต้นของ array" text={array.text} error={array.error} onChange={array.apply} />
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="push x, pop, shift, unshift x, get i, length, includes x, slice a b" text={ops.text} error={ops.error} onChange={ops.apply} />
        </div>
      }
      legend={
        <>
          <span className="text-ok">เขียว = array ถูกแก้</span>
          <span className="text-accent">สีเน้น = อ่านค่า</span>
        </>
      }
    />
  );
}
