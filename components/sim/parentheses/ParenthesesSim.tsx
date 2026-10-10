'use client';

import { useId, useMemo, useState } from 'react';
import { CodeTrace, PresetBar, SimulationPlayer, type SimExplanation, type SimTone } from '@/components/sim/core';
import { CODE, MAX_LENGTH, OPEN, activeLines, initParen, isDone, step, validate, type ParenState } from './logic';

// The four examples of STACK_5 p.18–21.
const PRESETS = [
  { label: 'ตัวอย่าง ๑: ถูกต้อง', value: '({()[{}]})' },
  { label: 'ตัวอย่าง ๒: ไม่ตรงคู่', value: '({()[{)]})' },
  { label: 'ตัวอย่าง ๓: ปิดเกิน', value: '({()})]' },
  { label: 'ตัวอย่าง ๔: เปิดเกิน', value: '({()[{}' },
];

const W = 320;
const CHAR_W = 18;
const SLOT_H = 24;
const STACK_X = 124;
const STACK_W = 72;

function ParenCanvas({ state }: { state: ParenState }) {
  const { text, event } = state;
  const slots = Math.max(4, [...text].filter((c) => OPEN.includes(c)).length);
  const top = 64;
  const bottom = top + slots * SLOT_H;
  const x0 = (W - text.length * CHAR_W) / 2;
  const readIndex = event.kind === 'init' || event.kind === 'endOk' || event.kind === 'endExtraOpen' ? -1 : state.i - 1;
  const failed = state.result !== null && state.result !== 'ok';
  const popped = event.kind === 'match' || event.kind === 'mismatch' ? event.popped : null;

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${bottom + 12}`}
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`อ่านถึงตัวที่ ${state.i} จาก ${text.length} · stack มี ${state.stack.length} ตัว: ${
          state.stack.length ? state.stack.join(' ') : 'ว่าง'
        }`}
      >
        {[...text].map((ch, i) => {
          const current = i === readIndex;
          return (
            <g key={i}>
              {current ? (
                <rect
                  x={x0 + i * CHAR_W + 1}
                  y={6}
                  width={CHAR_W - 2}
                  height={26}
                  rx={4}
                  strokeWidth={failed ? 3 : 2.5}
                  className={failed ? 'fill-bad-soft stroke-bad' : 'fill-accent-soft stroke-accent'}
                />
              ) : null}
              <text
                x={x0 + i * CHAR_W + CHAR_W / 2}
                y={19}
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-mono text-[17px] font-semibold ${i < state.i ? 'fill-ink' : 'fill-faint'}`}
              >
                {ch}
              </text>
              {current ? (
                <text
                  x={x0 + i * CHAR_W + CHAR_W / 2}
                  y={46}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold ${failed ? 'fill-bad' : 'fill-accent'}`}
                >
                  ▲
                </text>
              ) : null}
            </g>
          );
        })}

        {/* stack: open at the top */}
        <path
          d={`M${STACK_X} ${top - 4} V${bottom} H${STACK_X + STACK_W} V${top - 4}`}
          fill="none"
          strokeWidth={2.5}
          className="stroke-faint"
        />
        {state.stack.map((ch, i) => {
          const y = bottom - (i + 1) * SLOT_H;
          const isTop = i === state.stack.length - 1;
          const justPushed = isTop && event.kind === 'push';
          return (
            <g key={i}>
              <rect
                x={STACK_X + 4}
                y={y + 2}
                width={STACK_W - 8}
                height={SLOT_H - 4}
                rx={4}
                strokeWidth={justPushed ? 3 : 1.5}
                className={justPushed ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-faint'}
              />
              <text
                x={STACK_X + STACK_W / 2}
                y={y + SLOT_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-ink font-mono text-[15px] font-semibold"
              >
                {ch}
              </text>
              {isTop ? (
                <text
                  x={STACK_X + STACK_W + 8}
                  y={y + SLOT_H / 2}
                  dominantBaseline="central"
                  className="fill-accent font-mono text-[11px] font-semibold"
                >
                  ← top
                </text>
              ) : null}
            </g>
          );
        })}
        {state.stack.length === 0 ? (
          <text
            x={STACK_X + STACK_W / 2}
            y={bottom - 12}
            textAnchor="middle"
            className="fill-faint text-[11px]"
          >
            ว่าง
          </text>
        ) : null}

        {/* the bracket that was just popped, next to the one that closed it */}
        {popped ? (
          <g>
            <rect
              x={24}
              y={top + 4}
              width={72}
              height={30}
              rx={5}
              strokeWidth={event.kind === 'mismatch' ? 3.5 : 2.5}
              className={event.kind === 'mismatch' ? 'fill-bad-soft stroke-bad' : 'fill-ok-soft stroke-ok'}
            />
            <text
              x={60}
              y={top + 19}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-ink font-mono text-[15px] font-semibold"
            >
              {popped} {event.kind === 'mismatch' ? '≠' : '↔'} {event.kind !== 'init' && 'token' in event ? event.token : ''}
            </text>
            <text x={60} y={top + 50} textAnchor="middle" className="fill-faint text-[11px]">
              pop ออกมาเทียบ
            </text>
          </g>
        ) : null}
      </svg>

      <div className="px-1.5">
        <CodeTrace lines={CODE} active={activeLines(event)} label="checkParentheses" />
      </div>
    </div>
  );
}

function explain(state: ParenState): SimExplanation {
  const { event } = state;
  const depth = state.stack.length;
  switch (event.kind) {
    case 'init':
      return {
        title: 'เริ่มต้น: stack ว่าง',
        body: 'จะอ่านสตริงทีละตัวจากซ้ายไปขวา วงเล็บเปิดให้ push เก็บไว้ ส่วนวงเล็บปิดให้ pop ตัวบนสุดออกมาเทียบ เพราะวงเล็บที่เปิดหลังสุดต้องถูกปิดก่อนเสมอ ซึ่งตรงกับลำดับ LIFO ของ stack',
      };
    case 'push':
      return {
        title: `พบ ${event.token} (วงเล็บเปิด) → push`,
        body: `open.indexOf("${event.token}") ≥ 0 แปลว่าเป็นวงเล็บเปิด จึง push ลง stack เพื่อจำไว้ว่ายังรอวงเล็บปิดของมันอยู่ ตอนนี้ stack มี ${depth} ตัว`,
      };
    case 'match':
      return {
        title: `พบ ${event.token} (วงเล็บปิด) → pop ได้ ${event.popped} ตรงคู่`,
        body: `stack ไม่ว่าง จึง pop ตัวบนสุดออกมาได้ ${event.popped} ซึ่งเป็นวงเล็บเปิดชนิดเดียวกับ ${event.token} คู่นี้จึงถูกต้อง อ่านตัวถัดไปต่อ ตอนนี้ stack เหลือ ${depth} ตัว`,
      };
    case 'mismatch':
      return {
        title: `พบ ${event.token} แต่ pop ได้ ${event.popped} → ผิด`,
        body: `วงเล็บปิด ${event.token} ต้องคู่กับ ${event.expected} แต่ตัวที่เปิดไว้หลังสุดคือ ${event.popped} จึงเป็นกรณี "วงเล็บปิดไม่ตรงกับวงเล็บเปิด" เมท็อด return false ทันทีโดยไม่อ่านส่วนที่เหลือ`,
      };
    case 'extraClose':
      return {
        title: `พบ ${event.token} แต่ stack ว่าง → ผิด`,
        body: `จะ pop แต่ s.isEmpty() เป็นจริง แปลว่าไม่มีวงเล็บเปิดเหลือให้จับคู่ ทั้งที่ยังอ่านไม่หมด จึงเป็นกรณี "วงเล็บปิดมากกว่าเปิด" เมท็อด return false`,
      };
    case 'skip':
      return {
        title: `พบ ${event.token} (ไม่ใช่วงเล็บ) → ข้าม`,
        body: 'ไม่อยู่ทั้งใน open และ close (k < 0) โค้ดจึงไม่ทำอะไรกับ stack แล้วอ่านตัวถัดไป',
      };
    case 'endOk':
      return {
        title: 'อ่านหมดแล้ว และ stack ว่าง → ถูกต้อง',
        body: 'ออกจากลูปแล้ว return s.isEmpty() ซึ่งเป็น true แปลว่าวงเล็บเปิดทุกตัวถูกจับคู่กับวงเล็บปิดครบ',
      };
    case 'endExtraOpen':
      return {
        title: `อ่านหมดแล้ว แต่ stack ยังเหลือ ${event.left} ตัว → ผิด`,
        body: 'ออกจากลูปแล้ว return s.isEmpty() ซึ่งเป็น false แปลว่ายังมีวงเล็บเปิดที่ไม่มีใครมาปิด จึงเป็นกรณี "วงเล็บเปิดมากกว่าปิด"',
      };
  }
}

function status(state: ParenState): { tone: SimTone; label: string } {
  if (state.result === 'ok') return { tone: 'done', label: 'ถูกต้อง' };
  if (state.result === 'mismatch') return { tone: 'error', label: 'ไม่ตรงคู่' };
  if (state.result === 'extraClose') return { tone: 'error', label: 'ปิดมากกว่าเปิด' };
  if (state.result === 'extraOpen') return { tone: 'error', label: 'เปิดมากกว่าปิด' };
  return state.event.kind === 'init' ? { tone: 'normal', label: 'เริ่มต้น' } : { tone: 'active', label: 'กำลังตรวจ' };
}

const render = (state: ParenState) => <ParenCanvas state={state} />;

export function ParenthesesSim() {
  const inputId = useId();
  const [draft, setDraft] = useState(PRESETS[0]!.value);
  // The sim keeps the last valid string while the user is mid-edit.
  const [text, setText] = useState(PRESETS[0]!.value);
  const error = validate(draft);
  const initialState = useMemo(() => initParen(text), [text]);

  const apply = (value: string) => {
    setDraft(value);
    if (validate(value) === null) setText(value);
  };

  const inputs = (
    <div className="flex flex-col gap-3">
      <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === draft)} onPick={apply} />
      <div>
        <label htmlFor={inputId} className="mb-1 block text-[14px] font-medium leading-[22px]">
          สตริงที่จะตรวจ
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => apply(e.target.value)}
          maxLength={MAX_LENGTH + 4}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={error !== null}
          aria-describedby={`${inputId}-hint`}
          className="block h-11 w-full rounded-md border border-line bg-canvas px-3 font-mono text-[16px] aria-invalid:border-bad"
        />
        <p id={`${inputId}-hint`} className={`mt-1 text-[12px] leading-[18px] ${error ? 'text-bad' : 'text-faint'}`}>
          {error ?? `ใช้วงเล็บ ( ) { } [ ] ได้สูงสุด ${MAX_LENGTH} ตัว ตัวอักษรอื่นจะถูกข้าม`}
        </p>
      </div>
    </div>
  );

  return (
    <SimulationPlayer
      title="ตรวจวงเล็บด้วย stack"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={inputs}
      legend={
        <>
          <span>▲ ตัวที่กำลังอ่าน</span>
          <span>เปิด → push</span>
          <span>ปิด → pop มาเทียบ</span>
        </>
      }
    />
  );
}
