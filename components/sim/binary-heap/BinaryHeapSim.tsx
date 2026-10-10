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
import { slotPosition } from '@/components/sim/core/tree';
import { codeFor, formatOp, init, isDone, parse, step, type State } from './logic';

const PRESETS = [
  // QUEUE_7 p.21–26
  { label: 'สไลด์ p.21: enqueue 16', value: 'heap 13 12 1 2 12, enqueue 16' },
  // QUEUE_7 p.28–32
  { label: 'สไลด์ p.28: dequeue', value: 'heap 15 13 9 2 11 1, dequeue' },
  // QUEUE_7 p.36–38
  { label: 'สไลด์ p.36: สร้าง heap', value: 'build 25 12 10 11 27 9 1 20 25 21 7 19' },
  // QUEUE_7 p.4–8
  { label: 'สไลด์ p.4: ใช้งาน', value: 'enqueue 5, enqueue 3, enqueue 99, dequeue, enqueue 4' },
];

const W = 320;
const TOP = 22;
const LEVEL = 44;
const R = 13;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const d = state.data;
  const levels = d.length === 0 ? 1 : Math.floor(Math.log2(d.length)) + 1;
  const treeH = TOP + (levels - 1) * LEVEL + R + 8;
  const pos = (k: number) => slotPosition(k, W, TOP, LEVEL);
  const hot = new Set<number>();
  const warm = new Set<number>();
  if (e.kind === 'append' || e.kind === 'settledUp' || e.kind === 'settledDown') hot.add(e.k);
  if (e.kind === 'swapUp') [e.k, e.p].forEach((k) => hot.add(k));
  if (e.kind === 'swapDown') [e.k, e.c].forEach((k) => hot.add(k));
  if (e.kind === 'takeRoot' && d.length > 0) hot.add(0);
  if (e.kind === 'leaves') for (let k = e.from; k < d.length; k++) warm.add(k);
  const cell = Math.min(24, 300 / Math.max(d.length, 6));
  const ax = (k: number) => (W - cell * Math.max(d.length, 1)) / 2 + k * cell;
  const running = state.task !== null ? state.pc : state.pc - 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{d.length}</b>
      </p>
      <svg
        viewBox={`0 0 ${W} ${treeH + 50}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`binary heap ${d.length} ตัว อาเรย์: ${d.length ? d.join(' ') : 'ว่าง'}`}
      >
        {d.map((_, k) => {
          if (k === 0) return null;
          const a = pos(Math.floor((k - 1) / 2));
          const b = pos(k);
          return <line key={`e${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.5} className="stroke-faint" />;
        })}
        {d.map((value, k) => {
          const p = pos(k);
          const cls = hot.has(k) ? 'fill-accent-soft stroke-accent' : warm.has(k) ? 'fill-warn-soft stroke-warn' : 'fill-surface stroke-faint';
          return (
            <g key={`n${k}`}>
              <circle cx={p.x} cy={p.y} r={R} strokeWidth={hot.has(k) ? 3 : warm.has(k) ? 2.5 : 1.5} strokeDasharray={warm.has(k) ? '5 4' : undefined} className={cls} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[12px] font-semibold">
                {value}
              </text>
              <text x={p.x + R + 1} y={p.y - R + 2} className="fill-faint font-mono text-[8px]">
                {k}
              </text>
            </g>
          );
        })}
        {d.length === 0 ? (
          <text x={W / 2} y={TOP + 6} textAnchor="middle" className="fill-faint text-[12px]">
            heap ว่าง
          </text>
        ) : null}

        {/* the same data as the array elementData */}
        {d.map((value, k) => (
          <g key={`a${k}`}>
            <text x={ax(k) + cell / 2} y={treeH + 10} textAnchor="middle" className="fill-faint font-mono text-[8px]">
              {k}
            </text>
            <rect x={ax(k) + 0.5} y={treeH + 14} width={cell - 1} height={22} rx={3} strokeWidth={hot.has(k) ? 2.5 : 1} className={hot.has(k) ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-faint'} />
            <text x={ax(k) + cell / 2} y={treeH + 25} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[10px] font-semibold">
              {value}
            </text>
          </g>
        ))}
      </svg>
      {state.ops.length > 0 ? <OpChips ops={state.ops.map(formatOp)} current={state.buildAt >= 0 ? -1 : running} /> : null}
      <div className="px-1.5">
        <CodeTrace {...codeFor(state)} label="BinaryHeap.java" />
      </div>
      <OutputLog lines={state.output} />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return e.build
        ? { title: 'ข้อมูลเริ่มต้น: ยังไม่เป็น heap', body: 'constructor รับอาเรย์ข้อมูลใด ๆ มา มองเป็นต้นไม้ทวิภาคได้ดุลทันที (ลูกซ้ายของ k อยู่ที่ 2k + 1 ลูกขวาที่ 2k + 2) แต่ค่ายังไม่เรียงตามกฎ heap จะปรับโดยเรียก fixDown ทีละปม จากปมท้ายสุดย้อนขึ้นมาหาราก' }
        : { title: 'สถานะเริ่มต้น', body: 'binary heap เก็บในอาเรย์: รากอยู่ index 0 ลูกซ้ายของ k อยู่ที่ 2k + 1 ลูกขวาที่ 2k + 2 และพ่อของ k อยู่ที่ (k − 1) / 2 ค่าของพ่อต้องไม่น้อยกว่าลูก รากจึงเป็นค่ามากสุดเสมอ' };
    case 'leaves':
      return { title: `fixDown ที่ใบ ${e.count} ปม (index ${e.from} ขึ้นไป): ไม่ต้องทำอะไร`, body: 'ใบไม่มีลูก เงื่อนไข (c = 2k + 1) < size เป็นเท็จตั้งแต่รอบแรก fixDown จึงจบทันที ต้นไม้ย่อยที่มีปมเดียวเป็น heap อยู่แล้ว งานจริงเริ่มที่ปมภายในตัวท้ายสุด' };
    case 'append':
      return { title: `enqueue(${e.value}): ต่อท้ายที่ index ${e.k}`, body: `ใส่ข้อมูลใหม่เป็นใบถัดไป คือช่องท้ายอาเรย์ เพื่อรักษารูปร่างต้นไม้ให้เต็มจากซ้ายไปขวา แต่ค่าอาจมากกว่าพ่อ จึงเรียก fixUp(${e.k}) เพื่อดันขึ้นไปยังที่ที่ถูกต้อง` };
    case 'swapUp':
      return { title: `fixUp: ${e.child} มากกว่าพ่อ ${e.parent} → สลับ`, body: `พ่อของ index ${e.k} คือ (${e.k} − 1) / 2 = ${e.p} ลูกมีค่ามากกว่าพ่อจึงผิดกฎ heap สลับที่กัน แล้วไปตรวจต่อที่ index ${e.p} สลับได้มากสุดเท่าความสูงของต้นไม้ จึงเป็น O(log n)` };
    case 'settledUp':
      return e.atRoot
        ? { title: `fixUp จบ: ${e.value} ขึ้นถึงราก`, body: 'k = 0 ไม่มีพ่อให้เทียบแล้ว ข้อมูลใหม่เป็นค่ามากสุดของ heap' }
        : { title: `fixUp จบ: ${e.value} ไม่มากกว่าพ่อ ${e.parent}`, body: 'greaterThan(k, p) เป็นเท็จ จึง break ออกจากลูป ตำแหน่งนี้ถูกต้องแล้ว ไม่ต้องตรวจปมที่อยู่สูงกว่า เพราะส่วนนั้นเป็น heap อยู่ก่อนแล้ว' };
    case 'takeRoot':
      return e.moved === null
        ? { title: `dequeue() คืน ${e.max}: heap ว่างแล้ว`, body: 'มีข้อมูลตัวเดียว เอาออกแล้ว size เป็น 0 ไม่ต้องเรียก fixDown' }
        : { title: `dequeue() คืน ${e.max}: ย้ายใบท้ายสุด (${e.moved}) มาที่ราก`, body: `รากคือค่ามากสุด เก็บไว้เป็นคำตอบ แล้วนำข้อมูลช่องท้ายอาเรย์มาแทนที่รากและลด size เพื่อรักษารูปร่างต้นไม้ แต่ค่าที่ย้ายมามักน้อยกว่าลูก จึงเรียก fixDown(0)` };
    case 'swapDown':
      return { title: `fixDown: ${e.parent} น้อยกว่าลูก ${e.child} → สลับ`, body: `${e.other === null ? `ปมนี้มีลูกเดียวคือ ${e.child}` : `เลือกลูกตัวมากระหว่าง ${e.child} กับ ${e.other} ได้ ${e.child}`} ต้องสลับกับลูกตัวมากเสมอ ถ้าสลับกับตัวน้อย ตัวน้อยจะขึ้นไปเป็นพ่อของตัวมาก ซึ่งผิดกฎ heap จากนั้นตรวจต่อที่ index ${e.c}` };
    case 'settledDown':
      return e.leaf
        ? { title: `fixDown จบ: ${e.value} เป็นใบแล้ว`, body: `index ${e.k} ไม่มีลูก (2k + 1 ≥ size) จึงออกจากลูป${e.building ? ' แล้วลูปของ constructor ไปเรียก fixDown ที่ index ก่อนหน้า' : ''}` }
        : { title: `fixDown จบ: ${e.value} ไม่น้อยกว่าลูกตัวมาก`, body: `greaterThan(c, k) เป็นเท็จ จึง break ต้นไม้ย่อยที่มีรากที่ index ${e.k} เป็น heap แล้ว${e.building ? ' ลูปของ constructor ไปเรียก fixDown ที่ index ก่อนหน้า' : ''}` };
    case 'empty':
      return { title: 'dequeue() บน heap ว่าง → NoSuchElementException', body: 'dequeue เรียก peek() ก่อน และ peek() ตรวจ isEmpty() (simulation ทำคำสั่งถัดไปต่อ)' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'leaves':
      return { tone: 'waiting', label: 'ข้ามใบ' };
    case 'append':
      return { tone: 'active', label: 'ต่อท้าย' };
    case 'swapUp':
      return { tone: 'active', label: 'fixUp: สลับ' };
    case 'swapDown':
      return { tone: 'active', label: 'fixDown: สลับ' };
    case 'takeRoot':
      return { tone: 'done', label: 'เอารากออก' };
    case 'settledUp':
    case 'settledDown':
      return { tone: 'done', label: 'เป็น heap แล้ว' };
    case 'empty':
      return { tone: 'error', label: 'Exception' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function BinaryHeapSim() {
  const program = useParsedText(PRESETS[0]!.value, parse);
  const initialState = useMemo(() => init(program.value), [program.value]);

  return (
    <SimulationPlayer
      title="Binary Heap: fixUp และ fixDown"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === program.text)} onPick={program.apply} />
          <SimTextInput
            label="คำสั่ง (คั่นด้วย ,)"
            hint="เริ่มด้วย heap <เลข...> (เป็น heap อยู่แล้ว) หรือ build <เลข...> (ให้ปรับเป็น heap) ก็ได้ ตามด้วย enqueue <เลข 0–99>, dequeue"
            text={program.text}
            error={program.error}
            onChange={program.apply}
            rows={3}
          />
        </div>
      }
      legend={
        <>
          <span>เลขเล็กข้างปม = index ในอาเรย์</span>
          <span>แถวล่าง = elementData</span>
        </>
      }
    />
  );
}
