'use client';

import { useMemo } from 'react';
import {
  CodeTrace,
  OpChips,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { codeFor, formatOp, init, isDone, parse, step, type State } from './logic';

const PRESETS = [
  // LIST_4 p.37
  { label: 'สไลด์ p.37: ตัวอย่างการใช้งาน', value: 'add 0 A, add B, add 0 C, add 1 Z, remove 2' },
  // LIST_4 p.49–53 exercises
  { label: 'สไลด์ p.49: addFirst / removeLast', value: 'add A, add B, addFirst X, removeLast, removeLast' },
  { label: 'รายการว่าง', value: 'add A, remove 0, removeLast' },
];

const SLOT = 52;
const BOX = 38;
const X0 = 12;
const Y = 40;

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const n = state.items.length;
  const x = (k: number) => X0 + k * SLOT; // k = 0 is the header, item i is at k = i + 1
  const cy = Y + BOX / 2;
  const pending = e.kind === 'locate' || e.kind === 'create';
  const running = pending ? state.pc : state.pc - 1;

  // Slots of p, q (and x for a removal) while an operation is in progress.
  let kp: number | null = null;
  let kq: number | null = null;
  let kx: number | null = null;
  if (e.kind === 'locate' || e.kind === 'create') {
    kq = e.qi === n ? 0 : e.qi + 1;
    kp = e.qi === 0 ? 0 : e.qi;
    if (e.kind === 'locate' && e.mode === 'remove') kx = e.qi + 2 > n ? 0 : e.qi + 2;
  }
  const newX = e.kind === 'create' ? (kq === 0 ? x(kp ?? 0) + SLOT / 2 + 6 : (x(kp ?? 0) + x(kq ?? 0)) / 2) : null;
  const label = (k: number | null, name: string, dy: number) =>
    k === null ? null : (
      <text x={x(k) + BOX / 2} y={Y + BOX + dy} textAnchor="middle" className="fill-accent font-mono text-[12px] font-semibold">
        ↑ {name}
      </text>
    );
  const same = (a: number | null, b: number | null) => a !== null && a === b;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        size = <b className="text-ink">{n}</b>
      </p>
      <svg
        viewBox="0 0 320 150"
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`รายการโยงคู่แบบวนมีปมหัว มี ${n} ตัว: ${n ? state.items.join(', ') : 'ว่าง'}`}
      >
        <defs>
          <marker id="ll-next" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0L10,5L0,10z" className="fill-muted" />
          </marker>
          <marker id="ll-prev" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0L10,5L0,10z" className="fill-warn" />
          </marker>
          <marker id="ll-new" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0L10,5L0,10z" className="fill-accent" />
          </marker>
        </defs>

        {/* circular links: last.next -> header (top), header.prev -> last (drawn as the same arc) */}
        <path
          d={`M${x(n) + BOX / 2 + 6} ${Y - 2} C${x(n) + BOX / 2 + 6} ${Y - 30}, ${x(0) + BOX / 2 - 6} ${Y - 30}, ${x(0) + BOX / 2 - 6} ${Y - 4}`}
          fill="none"
          strokeWidth={1.8}
          markerEnd="url(#ll-next)"
          className="stroke-muted"
        />
        <text x={8} y={10} className="fill-faint text-[9px]">
          เส้นโค้ง = วนกลับ: next ของตัวท้าย และ prev ของ header
        </text>

        {Array.from({ length: n + 1 }, (_, k) => {
          const isHeader = k === 0;
          const hot = k === kp || k === kq || k === kx;
          const fresh = e.kind === 'link' && k === e.qi + 1;
          return (
            <g key={k}>
              {k > 0 ? (
                <>
                  <line x1={x(k - 1) + BOX} y1={cy - 6} x2={x(k) - 3} y2={cy - 6} strokeWidth={1.8} markerEnd="url(#ll-next)" className="stroke-muted" />
                  <line x1={x(k)} y1={cy + 6} x2={x(k - 1) + BOX + 3} y2={cy + 6} strokeWidth={1.8} strokeDasharray="4 3" markerEnd="url(#ll-prev)" className="stroke-warn" />
                </>
              ) : null}
              <rect
                x={x(k)}
                y={Y}
                width={BOX}
                height={BOX}
                rx={6}
                strokeWidth={hot || fresh ? 3 : 1.5}
                className={fresh ? 'fill-accent-soft stroke-accent' : hot ? 'fill-accent-soft stroke-accent' : isHeader ? 'fill-surface-2 stroke-faint' : 'fill-surface stroke-faint'}
              />
              <text x={x(k) + BOX / 2} y={cy} textAnchor="middle" dominantBaseline="central" className={`font-mono font-semibold ${isHeader ? 'fill-faint text-[9px]' : 'fill-ink text-[14px]'}`}>
                {isHeader ? 'header' : state.items[k - 1]}
              </text>
            </g>
          );
        })}

        {same(kp, kq) ? label(kp, 'p, q', 16) : (
          <>
            {label(kp, 'p', 16)}
            {label(kq, 'q', 16)}
          </>
        )}
        {kx !== null && kx !== kp ? label(kx, 'x', 16) : null}
        {kx !== null && kx === kp ? (
          <text x={x(kx) + BOX / 2} y={Y + BOX + 30} textAnchor="middle" className="fill-accent font-mono text-[12px] font-semibold">
            (x ด้วย)
          </text>
        ) : null}

        {/* the new node, created but not linked in yet */}
        {newX !== null && e.kind === 'create' ? (
          <g>
            <rect x={newX} y={Y + 66} width={BOX} height={BOX - 6} rx={6} strokeWidth={3} className="fill-accent-soft stroke-accent" />
            <text x={newX + BOX / 2} y={Y + 66 + (BOX - 6) / 2} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[14px] font-semibold">
              {e.value}
            </text>
            <text x={newX + BOX + 6} y={Y + 66 + (BOX - 6) / 2} dominantBaseline="central" className="fill-accent font-mono text-[12px] font-semibold">
              x
            </text>
            <line x1={newX + 6} y1={Y + 66} x2={x(kp ?? 0) + BOX / 2 + 8} y2={Y + BOX + 22} strokeWidth={1.8} strokeDasharray="4 3" markerEnd="url(#ll-new)" className="stroke-accent" />
            <line x1={newX + BOX - 6} y1={Y + 66} x2={x(kq ?? 0) + BOX / 2 + (kq === 0 ? 14 : -8)} y2={Y + BOX + 22} strokeWidth={1.8} markerEnd="url(#ll-new)" className="stroke-accent" />
          </g>
        ) : null}
      </svg>
      <OpChips ops={state.ops.map(formatOp)} current={running} />
      <div className="px-1.5">
        <CodeTrace {...codeFor(e)} label="LinkedList.java" />
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const n = state.items.length;
  switch (e.kind) {
    case 'init':
      return { title: 'สถานะเริ่มต้น: มีแต่ปมหัว', body: 'constructor ทำ header.prev = header.next = header ปมหัวจึงชี้กลับมาที่ตัวเองทั้งสองทาง รายการแบบวนไม่มีตัวโยงที่เป็น null เลย ทุกปมมีทั้งปมก่อนหน้าและปมถัดไปเสมอ โค้ดจึงไม่มีกรณีพิเศษ' };
    case 'locate':
      if (e.mode === 'add')
        return {
          title: `${e.call}: หา q แล้ว p = q.prev`,
          body: e.walk === 0
            ? `จะแทรกปมใหม่ไว้ "ก่อน" q ${e.qi === n ? 'การเพิ่มท้ายรายการคือการแทรกก่อน header (เพราะรายการวน ตัวก่อน header คือตัวท้าย)' : 'การเพิ่มหน้าสุดคือการแทรกก่อน header.next'} จึงได้ q มาโดยไม่ต้องเดิน แล้วได้ p จาก q.prev ทันที ทั้งหมดใช้ Θ(1)`
            : `จะแทรกปมใหม่ไว้ "ก่อน" q ซึ่งคือ nodeAt(${e.qi}) ต้องเดินจากปมหัวไป ${e.walk} ก้าว ส่วนนี้ใช้ O(n) เมื่อได้ q แล้วได้ p จาก q.prev ทันทีโดยไม่ต้องเดินหา เพราะมีตัวโยง prev`,
        };
      return {
        title: `${e.call}: หา q แล้ว p = q.prev, x = q.next`,
        body: e.walk === 0
          ? 'ตัวท้ายรายการคือ header.prev จึงได้ q มาโดยไม่ต้องเดิน แล้วเก็บปมก่อนหน้า (p) และปมถัดไป (x) ของ q ไว้ ทั้งหมดใช้ Θ(1)'
          : `q คือ nodeAt(${e.qi}) ต้องเดินจากปมหัวไป ${e.walk} ก้าว ส่วนนี้ใช้ O(n) จากนั้นเก็บปมก่อนหน้า (p) และปมถัดไป (x) ของ q ไว้`,
      };
    case 'create':
      return { title: `x = new LinkedNode(${e.value}, p, q)`, body: 'สร้างปมใหม่ x โดยกำหนด x.prev = p และ x.next = q ตั้งแต่ใน constructor ตอนนี้ x รู้จักเพื่อนบ้านแล้ว แต่ p กับ q ยังไม่รู้จัก x รายการเดิมยังไม่เปลี่ยน' };
    case 'link':
      return { title: 'p.next = q.prev = x; ++size', body: `คำสั่งกำหนดค่าแบบต่อกันทำจากขวาไปซ้าย: q.prev = x ก่อน แล้ว p.next = x ทั้งสองปมจึงชี้มาที่ x ทำให้ ${e.value} เข้าไปอยู่ในรายการสมบูรณ์ ส่วนของ addBefore ทั้งหมดใช้ Θ(1) ตอนนี้ size = ${n}` };
    case 'bypass':
      return { title: `p.next = x; x.prev = p; --size (ลบ ${e.value})`, body: `แก้ตัวโยงสองเส้นให้ p กับ x ชี้หากันโดยข้าม q ไป ปม q ไม่มีใครอ้างถึงจึงกลายเป็น garbage ต่างจากรายการโยงเดี่ยวที่ต้องเดินหาปมก่อนหน้า ที่นี่ได้จาก q.prev ทันที removeNode จึงใช้ Θ(1) ตอนนี้ size = ${n}` };
    case 'bad':
      return { title: `${e.call}: ทำไม่ได้`, body: `${e.reason} (simulation ข้ามคำสั่งนี้ไป)` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'locate':
      return e.walk === 0 ? { tone: 'active', label: 'หา q: Θ(1)' } : { tone: 'waiting', label: 'nodeAt: O(n)' };
    case 'create':
      return { tone: 'active', label: 'สร้างปม x' };
    case 'link':
      return { tone: 'done', label: 'เชื่อมแล้ว' };
    case 'bypass':
      return { tone: 'done', label: 'ลบแล้ว' };
    case 'bad':
      return { tone: 'error', label: 'ทำไม่ได้' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function LinkedListSim() {
  const ops = useParsedText(PRESETS[0]!.value, parse);
  const initialState = useMemo(() => init(ops.value), [ops.value]);

  return (
    <SimulationPlayer
      title="LinkedList: addBefore และ removeNode"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === ops.text)} onPick={ops.apply} />
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="ใช้ได้: add <ค่า>, add <i> <ค่า>, addFirst <ค่า>, remove <i>, removeLast" text={ops.text} error={ops.error} onChange={ops.apply} rows={3} />
        </div>
      }
      legend={
        <>
          <span>→ เส้นทึบ = next</span>
          <span>⇠ เส้นประ = prev</span>
        </>
      }
    />
  );
}
