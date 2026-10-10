'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import {
  MAX_CAPACITY,
  formatOp,
  initStack,
  isDone,
  parseOps,
  step,
  type StackOp,
  type StackState,
} from './logic';

const DEFAULT_OPS = 'push 5, push 3, peek, push 8, pop, pop, pop, pop';
const DEFAULT_CAPACITY = 4;

// SVG geometry (viewBox units)
const W = 320;
const H = 250;
const BOX_X = 100;
const BOX_W = 120;
const BOX_BOTTOM = 232;
const BOX_H = 192;

function StackCanvas({ state }: { state: StackState }) {
  const slotH = BOX_H / state.capacity;
  const slotY = (i: number) => BOX_BOTTOM - (i + 1) * slotH;
  const boxTop = BOX_BOTTOM - BOX_H;
  const topIndex = state.items.length - 1;
  const { event } = state;
  // A value that left (pop) or bounced off (overflow) floats above the stack.
  const floating =
    event.kind === 'pop' || event.kind === 'overflow'
      ? { value: event.value, failed: event.kind === 'overflow' }
      : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`stack มีสมาชิก ${state.items.length} จาก ${state.capacity} ช่อง: ${
          state.items.length ? state.items.join(', ') : 'ว่าง'
        } (ซ้ายคือล่างสุด)`}
      >
        {/* empty slots */}
        {Array.from({ length: state.capacity }, (_, i) => (
          <g key={i}>
            <rect
              x={BOX_X}
              y={slotY(i)}
              width={BOX_W}
              height={slotH}
              className="fill-surface stroke-line"
            />
            <text
              x={BOX_X - 10}
              y={slotY(i) + slotH / 2}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-faint font-mono text-[11px]"
            >
              [{i}]
            </text>
          </g>
        ))}

        {/* items, bottom first */}
        {state.items.map((value, i) => {
          const isTop = i === topIndex;
          const highlight = isTop && (event.kind === 'push' || event.kind === 'peek');
          return (
            <g key={i}>
              <rect
                x={BOX_X + 3}
                y={slotY(i) + 2}
                width={BOX_W - 6}
                height={slotH - 4}
                rx={5}
                strokeWidth={highlight ? 3 : 1.5}
                className={highlight ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-faint'}
              />
              <text
                x={BOX_X + BOX_W / 2}
                y={slotY(i) + slotH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-ink font-mono text-[15px] font-semibold"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* container walls: open at the top, the only way in or out */}
        <path
          d={`M${BOX_X} ${boxTop - 6} V${BOX_BOTTOM} H${BOX_X + BOX_W} V${boxTop - 6}`}
          fill="none"
          strokeWidth={2.5}
          className="stroke-faint"
        />

        {/* top pointer */}
        <text
          x={BOX_X + BOX_W + 10}
          y={topIndex >= 0 ? slotY(topIndex) + slotH / 2 : BOX_BOTTOM - 8}
          dominantBaseline="central"
          className="fill-accent font-mono text-[12px] font-semibold"
        >
          {topIndex >= 0 ? '← top' : 'ว่าง'}
        </text>

        {floating ? (
          <g>
            <rect
              x={BOX_X + BOX_W / 2 - 28}
              y={4}
              width={56}
              height={24}
              rx={5}
              strokeWidth={floating.failed ? 3.5 : 2.5}
              className={floating.failed ? 'fill-bad-soft stroke-bad' : 'fill-ok-soft stroke-ok'}
            />
            <text
              x={BOX_X + BOX_W / 2}
              y={16}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-ink font-mono text-[13px] font-semibold"
            >
              {floating.value}
            </text>
            <text
              x={BOX_X + BOX_W / 2 + 36}
              y={16}
              dominantBaseline="central"
              className={`text-[11px] font-semibold ${floating.failed ? 'fill-bad' : 'fill-ok'}`}
            >
              {floating.failed ? 'เต็ม!' : 'ออก'}
            </text>
          </g>
        ) : null}
      </svg>

      <ol className="mt-2 flex flex-wrap justify-center gap-1.5 px-2" aria-label="ลำดับคำสั่ง">
        {state.ops.map((op, i) => {
          const status = i === state.pc - 1 ? 'current' : i < state.pc ? 'done' : 'todo';
          return (
            <li
              key={i}
              aria-current={status === 'current' ? 'step' : undefined}
              className={`rounded-sm border px-2 font-mono text-[12px] leading-[22px] ${
                status === 'current'
                  ? 'border-accent bg-accent text-accent-ink'
                  : status === 'done'
                    ? 'border-line text-faint line-through'
                    : 'border-line bg-surface text-ink'
              }`}
            >
              {formatOp(op)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function explain(state: StackState): SimExplanation {
  const { event, items, capacity } = state;
  const size = `${items.length}/${capacity}`;
  const nextOp = state.ops[state.pc];
  const upNext = nextOp ? `คำสั่งถัดไป: ${formatOp(nextOp)}` : 'ทำครบทุกคำสั่งแล้ว';

  let title: string;
  let what: ReactNode;
  switch (event.kind) {
    case 'init':
      title = 'สถานะเริ่มต้น';
      what = `stack ว่าง ความจุ ${capacity} ช่อง ข้อมูลเข้าและออกได้ทางเดียวคือด้านบน (top) จึงทำงานแบบ LIFO — เข้าทีหลัง ออกก่อน`;
      break;
    case 'push':
      title = `push(${event.value})`;
      what = `วาง ${event.value} ไว้บนสุด เพราะทางเข้ามีแค่ด้านบน สมาชิกใหม่จึงกลายเป็น top ทันที ตอนนี้มี ${size} ช่อง`;
      break;
    case 'overflow':
      title = `push(${event.value}) → stack overflow`;
      what = `stack เต็มแล้ว (${size}) ไม่มีช่องว่างให้วาง ${event.value} ข้อมูลเดิมจึงไม่เปลี่ยน ต้องตรวจ isFull ก่อน push เสมอ`;
      break;
    case 'pop':
      title = `pop() ได้ ${event.value}`;
      what = `หยิบตัวบนสุดออก เพราะ ${event.value} เป็นตัวที่เข้ามาหลังสุดในบรรดาที่เหลืออยู่ จึงออกก่อน (LIFO) ${
        items.length > 0 ? `top ใหม่คือ ${items.at(-1)}` : 'ตอนนี้ stack ว่าง'
      }`;
      break;
    case 'underflow':
      title = 'pop() → stack underflow';
      what = 'stack ว่าง ไม่มีอะไรให้หยิบออก ต้องตรวจ isEmpty ก่อน pop เสมอ';
      break;
    case 'peek':
      title = event.value === null ? 'peek() บน stack ว่าง' : `peek() ได้ ${event.value}`;
      what =
        event.value === null
          ? 'stack ว่าง จึงไม่มีค่า top ให้ดู'
          : `แค่อ่านค่าบนสุดโดยไม่เอาออก จำนวนสมาชิกยังเท่าเดิม (${size}) — ต่างจาก pop ที่อ่านแล้วเอาออกด้วย`;
      break;
  }

  return {
    title,
    body: (
      <>
        <p>{what}</p>
        <p className="mt-1 font-mono text-[13px] text-faint">{upNext}</p>
      </>
    ),
  };
}

function status(state: StackState): { tone: SimTone; label: string } {
  switch (state.event.kind) {
    case 'init':
      return { tone: 'normal', label: 'ปกติ' };
    case 'overflow':
      return { tone: 'error', label: 'Overflow' };
    case 'underflow':
      return { tone: 'error', label: 'Underflow' };
    case 'pop':
      return { tone: 'done', label: 'Pop' };
    case 'push':
      return { tone: 'active', label: 'Push' };
    case 'peek':
      return { tone: 'active', label: 'Peek' };
  }
}

const render = (state: StackState) => <StackCanvas state={state} />;

export function StackSim() {
  const opsId = useId();
  const [text, setText] = useState(DEFAULT_OPS);
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  // The sim keeps running the last valid program while the user is mid-edit.
  const [ops, setOps] = useState<StackOp[]>(() => {
    const parsed = parseOps(DEFAULT_OPS);
    return 'ops' in parsed ? parsed.ops : [];
  });
  const parsed = useMemo(() => parseOps(text), [text]);
  const initialState = useMemo(() => initStack(ops, capacity), [ops, capacity]);

  const onTextChange = (value: string) => {
    setText(value);
    const result = parseOps(value);
    if ('ops' in result) setOps(result.ops);
  };

  const stepper =
    'grid h-11 w-11 place-items-center rounded-md bg-surface-2 text-[18px] text-ink ' +
    'hover:brightness-95 disabled:cursor-not-allowed disabled:text-faint disabled:opacity-60';

  const inputs = (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor={opsId} className="mb-1 block text-[14px] font-medium leading-[22px]">
          คำสั่ง (คั่นด้วย ,)
        </label>
        <textarea
          id={opsId}
          rows={2}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
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
          {'error' in parsed ? parsed.error : 'ใช้ได้: push <ตัวเลข>, pop, peek — แก้แล้ว simulation เริ่มใหม่'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium leading-[22px]">ความจุ (capacity)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={stepper}
            onClick={() => setCapacity((c) => c - 1)}
            disabled={capacity <= 1}
            aria-label="ลดความจุ"
          >
            −
          </button>
          <output className="w-6 text-center font-mono font-semibold">{capacity}</output>
          <button
            type="button"
            className={stepper}
            onClick={() => setCapacity((c) => c + 1)}
            disabled={capacity >= MAX_CAPACITY}
            aria-label="เพิ่มความจุ"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <SimulationPlayer
      title="Stack: push / pop / peek"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={inputs}
      legend={
        <>
          <span>▭ ช่องว่าง</span>
          <span>▮ สมาชิก</span>
          <span>← top = ตัวบนสุด</span>
        </>
      }
    />
  );
}
