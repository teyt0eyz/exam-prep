'use client';

import { useMemo, useState } from 'react';
import {
  CodeTrace,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { slotPosition } from '@/components/sim/core/tree';
import { CODE, EMPTY, init, isDone, parse, step, type Order, type State } from './logic';

const PRESETS = [
  // BinaryTREE_8 p.14–27
  { label: 'สไลด์ p.15: ราก 35', value: '35 29 40 20 32 _ 50 10 25 _ _ _ _ 45 _' },
  // BinaryTREE_8 p.9
  { label: 'สไลด์ p.9: ราก B', value: 'B C D E _ F H _ _ _ _ _ G _ _' },
  // BinaryTREE_8 p.12: (3*2)+(7-(3*1))
  { label: 'สไลด์ p.12: นิพจน์', value: '+ * - 3 2 7 * _ _ _ _ _ _ 3 1' },
];

const ORDERS: { value: Order; label: string }[] = [
  { value: 'pre', label: 'Preorder' },
  { value: 'in', label: 'Inorder' },
  { value: 'post', label: 'Postorder' },
];
const RULE: Record<Order, string> = { pre: 'ปม → ซ้าย → ขวา', in: 'ซ้าย → ปม → ขวา', post: 'ซ้าย → ขวา → ปม' };
const VISIT_LINE: Record<Order, number> = { pre: 2, in: 3, post: 4 };

const W = 320;
const TOP = 24;
const LEVEL = 46;
const R = 14;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const last = state.tree.reduce((m, v, k) => (v !== null ? k : m), 0);
  const levels = Math.floor(Math.log2(last + 1)) + 1;
  const pos = (k: number) => slotPosition(k, W, TOP, LEVEL);
  const onStack = new Set(state.stack.map((f) => f.k));
  const order = (k: number) => state.visited.indexOf(k);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${TOP + (levels - 1) * LEVEL + R + 10}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`ต้นไม้ทวิภาค แวะแล้ว ${state.visited.length} ปม: ${state.visited.map((k) => state.tree[k]).join(' ') || 'ยังไม่ได้แวะ'}`}
      >
        {state.tree.map((v, k) => {
          if (v === null || k === 0) return null;
          const a = pos(Math.floor((k - 1) / 2));
          const b = pos(k);
          return <line key={`e${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.5} className="stroke-faint" />;
        })}
        {state.tree.map((v, k) => {
          if (v === null) return null;
          const p = pos(k);
          const current = e.kind === 'visit' && e.k === k;
          const done = order(k) >= 0;
          let cls = 'fill-surface stroke-faint';
          let width = 1.5;
          let dash: string | undefined;
          if (current) {
            cls = 'fill-accent-soft stroke-accent';
            width = 3;
          } else if (done) {
            cls = 'fill-ok-soft stroke-ok';
            width = 2.5;
          } else if (onStack.has(k)) {
            cls = 'fill-warn-soft stroke-warn';
            width = 2.5;
            dash = '5 4';
          }
          return (
            <g key={`n${k}`}>
              <circle cx={p.x} cy={p.y} r={R} strokeWidth={width} strokeDasharray={dash} className={cls} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[12px] font-semibold">
                {v}
              </text>
              {done ? (
                <text x={p.x + R + 1} y={p.y - R + 3} className="fill-ok font-mono text-[9px] font-semibold">
                  {order(k) + 1}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="px-1.5">
        <p className="text-[12px] font-medium leading-[18px] text-faint">ลำดับที่แวะ ({RULE[state.order]})</p>
        <p className="min-h-7 font-mono text-[15px] font-semibold leading-7 text-ink">
          {state.visited.length ? state.visited.map((k) => state.tree[k]).join('  ') : '—'}
        </p>
      </div>
      <div className="px-1.5">
        <CodeTrace lines={CODE[state.order]} active={e.kind === 'visit' ? [VISIT_LINE[state.order]] : []} />
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const { tree, order } = state;
  switch (e.kind) {
    case 'init':
      return { title: `เริ่มที่ราก (${tree[0]})`, body: `การแวะผ่านแบบ ${ORDERS.find((o) => o.value === order)!.label} ทำ 3 อย่างกับทุกปมตามลำดับ: ${RULE[order]} โดย "ซ้าย" และ "ขวา" หมายถึงทำกระบวนการเดียวกันนี้กับต้นไม้ย่อยทั้งต้น ไม่ใช่แค่ปมลูก` };
    case 'visit': {
      const left = 2 * e.k + 1 < tree.length && tree[2 * e.k + 1] != null ? tree[2 * e.k + 1] : null;
      const right = 2 * e.k + 2 < tree.length && tree[2 * e.k + 2] != null ? tree[2 * e.k + 2] : null;
      const sub = (v: string | null | undefined, side: string) => (v == null ? `ไม่มีต้นไม้ย่อย${side}` : `ต้นไม้ย่อย${side} (ราก ${v})`);
      const why =
        order === 'pre'
          ? `Preorder แวะปมก่อนเสมอ จึงแวะ ${e.value} ทันทีที่มาถึง แล้วจึงไป${sub(left, 'ซ้าย')} ตามด้วย${sub(right, 'ขวา')}`
          : order === 'in'
            ? `Inorder แวะปมหลังจากทำ${sub(left, 'ซ้าย')}เสร็จทั้งต้นแล้ว จึงถึงคิวของ ${e.value} จากนั้นไป${sub(right, 'ขวา')}`
            : `Postorder แวะปมเป็นอย่างสุดท้าย ${e.value} ถูกแวะได้เพราะ${sub(left, 'ซ้าย')}และ${sub(right, 'ขวา')}ทำเสร็จหมดแล้ว`;
      return { title: `แวะ ${e.value} (ลำดับที่ ${state.visited.length})`, body: `${why} ปมเส้นประคือปมที่เรียกค้างอยู่ รอให้ต้นไม้ย่อยทำเสร็จ` };
    }
    case 'done':
      return { title: 'แวะครบทุกปมแล้ว', body: `ผลลัพธ์: ${state.visited.map((k) => tree[k]).join(' ')} ทุกปมถูกแวะครั้งเดียวพอดี ทั้งสามแบบแวะปมชุดเดียวกัน ต่างกันที่ลำดับเท่านั้น${order === 'post' ? ' สังเกตว่ารากถูกแวะเป็นตัวสุดท้าย' : order === 'pre' ? ' สังเกตว่ารากถูกแวะเป็นตัวแรก' : ''}` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.event.kind === 'done') return { tone: 'done', label: 'เสร็จ' };
  return state.event.kind === 'init' ? { tone: 'normal', label: 'เริ่มต้น' } : { tone: 'active', label: 'แวะปม' };
}

const render = (state: State) => <Canvas state={state} />;

export function TreeTraversalSim() {
  const tree = useParsedText(PRESETS[0]!.value, parse);
  const [order, setOrder] = useState<Order>('pre');
  const initialState = useMemo(() => init(tree.value, order), [tree.value, order]);

  return (
    <SimulationPlayer
      title="การแวะผ่านต้นไม้: Preorder / Inorder / Postorder"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === tree.text)} onPick={tree.apply} />
          <SimTextInput
            label="ต้นไม้ (เรียงทีละระดับ จากซ้ายไปขวา)"
            hint={`คั่นด้วยเว้นวรรค ใช้ ${EMPTY} แทนตำแหน่งที่ไม่มีปม เช่น A B C ${EMPTY} D`}
            text={tree.text}
            error={tree.error}
            onChange={tree.apply}
          />
          <SimToggle label="แบบการแวะ" value={order} onChange={setOrder} options={ORDERS} />
        </div>
      }
      legend={
        <>
          <span>เลขเขียว = ลำดับที่แวะ</span>
          <span>เส้นประ = ปมที่เรียกค้างอยู่</span>
        </>
      }
    />
  );
}
