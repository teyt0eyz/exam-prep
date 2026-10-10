'use client';

import { useMemo } from 'react';
import {
  CodeTrace,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { CODE, codesOf, fixedWidth, heightOf, init, isDone, leavesOf, parse, step, totalBits, type HNode, type State } from './logic';

const PRESETS = [
  // BinaryTREE_8 p.36–43
  { label: 'สไลด์ p.36: ช ม ย ป ส า', value: 'ช:40, ม:21, ย:15, ป:14, ส:8, า:2' },
  // BinaryTREE_8 p.46 / p.58: TestHuffmanTree
  { label: 'สไลด์ p.46: โปรแกรมทดสอบ', value: '5, 9, 12, 13, 16, 45' },
  { label: 'ความถี่เท่ากันหมด', value: 'a:1, b:1, c:1, d:1' },
];

const W = 320;
const LEVEL = 34;
const LEAF_H = 22;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const leaves = state.forest.flatMap(leavesOf);
  const slot = (W - 12) / leaves.length;
  const leafX = new Map(leaves.map((leaf, i) => [leaf.id, 6 + slot * (i + 0.5)]));
  const maxH = Math.max(...state.forest.map(heightOf));
  const bottom = 16 + maxH * LEVEL;
  const final = e.kind === 'codes';
  const fresh = e.kind === 'merge' ? e.id : -1;

  // Leaves sit on the bottom row; an internal node sits above its children, centred between them.
  const place = (t: HNode): { x: number; y: number } => {
    if (!t.left || !t.right) return { x: leafX.get(t.id) as number, y: bottom };
    const a = place(t.left);
    const b = place(t.right);
    return { x: (a.x + b.x) / 2, y: bottom - heightOf(t) * LEVEL };
  };
  const draw = (t: HNode): React.ReactNode => {
    const p = place(t);
    if (!t.left || !t.right) {
      const w = Math.min(slot - 4, 42);
      return (
        <g key={t.id}>
          <rect x={p.x - w / 2} y={p.y} width={w} height={LEAF_H} rx={4} strokeWidth={1.5} className="fill-surface stroke-faint" />
          <text x={p.x} y={p.y + LEAF_H / 2} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[10px] font-semibold">
            {t.label === String(t.freq) ? t.freq : `${t.label}:${t.freq}`}
          </text>
        </g>
      );
    }
    const a = place(t.left);
    const b = place(t.right);
    const hot = t.id === fresh;
    const edge = (c: { x: number; y: number }, bit: string) => (
      <g>
        <line x1={p.x} y1={p.y} x2={c.x} y2={c.y} strokeWidth={hot ? 2.5 : 1.5} className={hot ? 'stroke-accent' : 'stroke-faint'} />
        {final ? (
          <text x={(p.x + c.x) / 2 + (bit === '0' ? -7 : 7)} y={(p.y + c.y) / 2 - 2} textAnchor="middle" className="fill-accent font-mono text-[10px] font-semibold">
            {bit}
          </text>
        ) : null}
      </g>
    );
    return (
      <g key={t.id}>
        {edge(a, '0')}
        {edge(b, '1')}
        {draw(t.left)}
        {draw(t.right)}
        <circle cx={p.x} cy={p.y} r={12} strokeWidth={hot ? 3 : 1.5} className={hot ? 'fill-accent-soft stroke-accent' : 'fill-surface-2 stroke-faint'} />
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[10px] font-semibold">
          {t.freq}
        </text>
      </g>
    );
  };

  const rows = final ? codesOf(state.forest[0]) : [];
  const bits = totalBits(rows);
  const width = fixedWidth(rows.length);
  const totalFreq = rows.reduce((n, r) => n + r.freq, 0);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${bottom + LEAF_H + 6}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`ป่าของ Huffman มี ${state.forest.length} ต้น ความถี่ที่ราก: ${state.forest.map((t) => t.freq).join(', ')}`}
      >
        {state.forest.map(draw)}
      </svg>
      {final ? (
        <div className="overflow-x-auto px-1.5">
          <table className="w-full min-w-max border-collapse font-mono text-[13px] leading-[22px]">
            <thead>
              <tr className="text-left text-faint">
                <th className="pr-4 font-medium">ตัวอักษร</th>
                <th className="pr-4 font-medium">ความถี่</th>
                <th className="pr-4 font-medium">รหัส</th>
                <th className="font-medium">บิตรวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label + r.code} className="border-t border-line text-ink">
                  <td className="pr-4">{r.label}</td>
                  <td className="pr-4">{r.freq}</td>
                  <td className="pr-4 font-semibold">{r.code}</td>
                  <td>
                    {r.freq} × {r.code.length} = {r.freq * r.code.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 font-sans text-[14px] leading-[22px] text-ink">
            Huffman ใช้ <b>{bits}</b> บิต · รหัสความยาวคงที่ {width} บิตใช้ {totalFreq} × {width} = <b>{totalFreq * width}</b> บิต
          </p>
        </div>
      ) : null}
      <div className="px-1.5">
        <CodeTrace lines={CODE} active={e.kind === 'init' ? [1, 2, 3] : e.kind === 'merge' ? [5, 6, 7, 8] : [10]} label="HuffmanTree.coding" />
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { title: `สร้างปมให้ตัวอักษรทั้ง ${state.forest.length} ตัว`, body: 'แต่ละตัวอักษรเป็นต้นไม้ที่มีปมเดียว เก็บความถี่ไว้ แล้ว enqueue ทั้งหมดลง BinaryMinHeap ซึ่งจะ dequeue ต้นที่มีความถี่น้อยที่สุดออกมาก่อนเสมอ' };
    case 'merge':
      return {
        title: `รวมสองต้นที่น้อยสุด: ${e.a} + ${e.b} = ${e.sum}`,
        body: `dequeue สองครั้งได้ต้นที่ความถี่น้อยสุดสองต้น (${e.a} และ ${e.b}) สร้างปมใหม่เก็บผลรวม ${e.sum} ให้ต้นแรกที่ dequeue ได้เป็นลูกซ้ายและต้นที่สองเป็นลูกขวา แล้ว enqueue กลับ ตัวที่พบน้อยถูกรวมก่อนจึงอยู่ลึก ได้รหัสยาว ตัวที่พบบ่อยถูกรวมทีหลังจึงอยู่ใกล้ราก ได้รหัสสั้น เหลือ ${state.forest.length} ต้น${e.ties ? ' (รอบนี้มีความถี่เท่ากันมากกว่าสองต้น จะเลือกคู่ไหนก็ได้รหัสที่ดีเท่ากัน simulation เลือกต้นที่สร้างก่อน)' : ''}`,
      };
    case 'codes': {
      const rows = codesOf(state.forest[0]);
      return { title: 'เหลือต้นเดียว: อ่านรหัสจากรากลงไปที่ใบ', body: `ลูปรวมทำ n − 1 = ${rows.length - 1} รอบแล้วเหลือต้นเดียวคือต้นไม้ Huffman กำหนดให้เส้นซ้าย = 0 เส้นขวา = 1 รหัสของตัวอักษรคือบิตตามทางเดินจากรากถึงใบของมัน ตัวอักษรอยู่ที่ใบเท่านั้น จึงไม่มีรหัสของตัวใดเป็นส่วนต้นของรหัสอีกตัว ถอดรหัสได้ไม่กำกวม` };
    }
  }
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.event.kind === 'codes') return { tone: 'done', label: 'ได้รหัสแล้ว' };
  return state.event.kind === 'init' ? { tone: 'normal', label: 'เริ่มต้น' } : { tone: 'active', label: `เหลือ ${state.forest.length} ต้น` };
}

const render = (state: State) => <Canvas state={state} />;

export function HuffmanSim() {
  const symbols = useParsedText(PRESETS[0]!.value, parse);
  const initialState = useMemo(() => init(symbols.value), [symbols.value]);

  return (
    <SimulationPlayer
      title="สร้างต้นไม้ Huffman"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === symbols.text)} onPick={symbols.apply} />
          <SimTextInput label="ตัวอักษรและความถี่ (คั่นด้วย ,)" hint="รูปแบบ ตัวอักษร:ความถี่ เช่น a:5, b:9 หรือใส่แต่ความถี่ก็ได้ สูงสุด 8 ตัว" text={symbols.text} error={symbols.error} onChange={symbols.apply} />
        </div>
      }
      legend={
        <>
          <span>□ ใบ = ตัวอักษร:ความถี่</span>
          <span>○ ปมรวม = ผลบวกความถี่</span>
        </>
      }
    />
  );
}
