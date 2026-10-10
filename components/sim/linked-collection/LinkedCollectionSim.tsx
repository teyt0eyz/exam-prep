'use client';

import { useMemo, useState } from 'react';
import {
  CodeTrace,
  OpChips,
  OutputLog,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { codeFor, formatOp, init, isDone, parse, step, type State } from './logic';

type Mode = 'none' | 'header';

const PRESETS: { label: string; value: { text: string; mode: Mode } }[] = [
  // COLLECTION_3 p.43–49: add A, B, C, D; remove B -> toArray gives [D, C, A]
  { label: 'สไลด์ p.43: มีปมหัว', value: { text: 'add A, add B, add C, add D, remove B', mode: 'header' } },
  // p.32–36: removing the first node is a special case without a header
  { label: 'สไลด์ p.32: ลบปมแรก', value: { text: 'add A, add B, add C, remove C, remove A', mode: 'none' } },
  { label: 'contains', value: { text: 'add A, add B, add C, contains A, contains X', mode: 'none' } },
];

const SLOT = 52;
const BOX = 38;
const X0 = 12;
const Y = 34;

function Canvas({ state }: { state: State }) {
  const { event } = state;
  const x = (k: number) => X0 + k * SLOT; // k = 0 is the head slot, data node i is at k = i + 1
  const cy = Y + BOX / 2;
  const searching = event.kind === 'visit' || event.kind === 'startP' || event.kind === 'advance';
  const running = searching ? state.pc : state.pc - 1;
  const pAt = event.kind === 'unlink' ? event.p : state.p;

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox="0 0 320 104"
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label={`รายการโยง${state.header ? 'แบบมีปมหัว' : 'แบบไม่มีปมหัว'} มี ${state.nodes.length} ปม: ${state.nodes.length ? state.nodes.join(' → ') : 'ว่าง'}`}
      >
        <defs>
          <marker id="lc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0L10,5L0,10z" className="fill-muted" />
          </marker>
        </defs>

        {/* head slot: the `first` reference, or the header node */}
        <text x={x(0) + BOX / 2} y={Y - 10} textAnchor="middle" className="fill-faint font-mono text-[10px]">
          {state.header ? 'header' : 'first'}
        </text>
        <rect
          x={x(0)}
          y={Y}
          width={BOX}
          height={BOX}
          rx={state.header ? 6 : 19}
          strokeWidth={pAt === -1 ? 3 : 2}
          strokeDasharray={state.header ? undefined : '4 3'}
          className={pAt === -1 ? 'fill-accent-soft stroke-accent' : 'fill-surface-2 stroke-faint'}
        />
        {state.nodes.length === 0 ? (
          <text x={x(0) + BOX + 8} y={cy} dominantBaseline="central" className="fill-faint font-mono text-[11px]">
            → null
          </text>
        ) : null}

        {state.nodes.map((value, i) => {
          const k = i + 1;
          const isScan = event.kind === 'visit' && event.index === i;
          const isP = pAt === i;
          const isNew = event.kind === 'add' && i === 0;
          let box = 'fill-surface stroke-faint';
          let width = 1.5;
          if (isScan) {
            box = event.match ? 'fill-ok-soft stroke-ok' : 'fill-warn-soft stroke-warn';
            width = 3;
          } else if (isP || isNew) {
            box = 'fill-accent-soft stroke-accent';
            width = 3;
          }
          return (
            <g key={i}>
              <line x1={x(k - 1) + BOX} y1={cy} x2={x(k) - 3} y2={cy} strokeWidth={2} markerEnd="url(#lc-arrow)" className="stroke-muted" />
              <rect x={x(k)} y={Y} width={BOX} height={BOX} rx={6} strokeWidth={width} strokeDasharray={isScan && !event.match ? '5 4' : undefined} className={box} />
              <text x={x(k) + BOX / 2} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[14px] font-semibold">
                {value}
              </text>
              {i === state.nodes.length - 1 ? (
                <text x={x(k) + BOX + 3} y={cy} dominantBaseline="central" className="fill-faint font-mono text-[9px]">
                  ⏚
                </text>
              ) : null}
            </g>
          );
        })}

        {pAt !== null ? (
          <text x={x(pAt + 1) + BOX / 2} y={Y + BOX + 16} textAnchor="middle" className="fill-accent font-mono text-[12px] font-semibold">
            ↑ p
          </text>
        ) : null}
        {event.kind === 'visit' ? (
          <text x={x(event.index + 1) + BOX / 2} y={Y + BOX + 16} textAnchor="middle" className="fill-warn font-mono text-[12px] font-semibold">
            ↑ node
          </text>
        ) : null}
      </svg>
      <OpChips ops={state.ops.map(formatOp)} current={running} />
      <div className="px-1.5">
        <CodeTrace {...codeFor(state)} label={state.header ? 'LinkedCollection.java (มีปมหัว)' : 'LinkedCollection.java (ไม่มีปมหัว)'} />
      </div>
      <OutputLog lines={state.output} />
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const head = state.header ? 'header' : 'first';
  switch (e.kind) {
    case 'init':
      return {
        title: 'สถานะเริ่มต้น: รายการว่าง',
        body: state.header
          ? 'แบบมีปมหัว: มีปม header อยู่หน้าสุดเสมอ ไม่เก็บข้อมูลและไม่ถูกลบ ตอนนี้ header.next เป็น null'
          : 'แบบไม่มีปมหัว: ตัวแปร first เก็บตัวโยงไปปมแรก ตอนนี้ first เป็น null เพราะยังไม่มีข้อมูล',
      };
    case 'add':
      return { title: `add(${e.value}): แทรกหน้าสุด`, body: `สร้างปมใหม่เก็บ ${e.value} ให้ next ของปมใหม่ชี้ไปปมที่เคยอยู่หน้าสุด แล้วให้ ${head}${state.header ? '.next' : ''} ชี้มาที่ปมใหม่ ไม่ต้องเดินไปไหนเลยจึงใช้ Θ(1) ผลข้างเคียงคือข้อมูลที่เพิ่มทีหลังจะอยู่หน้าเสมอ ลำดับจึงกลับกับลำดับที่ add` };
    case 'visit':
      return e.match
        ? { title: `contains: พบ ${e.value}`, body: `node.element.equals(${e.value}) เป็นจริงที่ปมนี้ จึงคืน true ทันที` }
        : { title: `contains: ปมนี้ไม่ใช่ ${e.value}`, body: 'ไม่ตรง จึงทำ node = node.next ไปปมถัดไป รายการโยงเข้าถึงปมกลาง ๆ โดยตรงไม่ได้ ต้องเดินตามตัวโยงจากปมแรกเท่านั้น จึงใช้ O(n)' };
    case 'notFound':
      if (e.op === 'contains') return { title: `contains(${e.value}) = false`, body: 'เดินจน node เป็น null (หมดรายการ) โดยไม่พบ จึงคืน false' };
      return e.empty
        ? { title: `remove(${e.value}): รายการว่าง`, body: 'first == null จึง return ทันที ถ้าไม่ตรวจข้อนี้ก่อน บรรทัดถัดไปที่อ่าน first.element จะเกิด NullPointerException' }
        : { title: `remove(${e.value}): ไม่พบ`, body: 'p เดินถึงปมสุดท้าย (p.next == null) โดยไม่พบ จึงไม่ลบอะไร' };
    case 'removeFirst':
      return { title: `remove(${e.value}): กรณีพิเศษ ลบปมแรก`, body: `ปมที่จะลบเป็นปมแรก ซึ่งไม่มีปมก่อนหน้าให้ p ชี้ จึงใช้ p.next = p.next.next ไม่ได้ ต้องเขียนแยกเป็น first = first.next นี่คือความยุ่งยากของแบบไม่มีปมหัว` };
    case 'startP':
      return state.header
        ? { title: `remove(${e.value}): เริ่มที่ p = header`, body: 'การลบปมต้องแก้ตัวโยงของปม "ก่อนหน้า" จึงใช้ p ชี้ปมก่อนหน้าตัวที่กำลังตรวจ เมื่อมีปมหัว ปมแรกก็มีปมก่อนหน้าเหมือนปมอื่น จึงเริ่มที่ header ได้เลยโดยไม่มีกรณีพิเศษ' }
        : { title: `remove(${e.value}): ปมแรกไม่ใช่ เริ่ม p = first`, body: 'ตรวจปมแรกแล้วไม่ตรง จึงให้ p ชี้ปมแรก แล้วจะตรวจปมถัดจาก p (p.next) ไปเรื่อย ๆ เพราะการลบต้องแก้ตัวโยงของปมก่อนหน้า' };
    case 'advance':
      return { title: `p.next ไม่ใช่ ${e.value} → p = p.next`, body: 'ตรวจข้อมูลของปมถัดจาก p แล้วไม่ตรง จึงเลื่อน p ไปหนึ่งปม สังเกตว่าเราดู p.next.element ไม่ใช่ p.element เพื่อให้ p หยุดอยู่ที่ปมก่อนหน้าตัวที่จะลบ' };
    case 'unlink':
      return { title: `remove(${e.value}): p.next = p.next.next`, body: `ปมถัดจาก p เก็บ ${e.value} จึงให้ p.next ข้ามปมนั้นไปชี้ปมถัดไปอีกหนึ่ง ปมที่ถูกข้ามไม่มีใครอ้างถึงแล้ว กลายเป็น garbage การลบเองใช้ Θ(1) แต่การเดินหาใช้ O(n)` };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  switch (e.kind) {
    case 'init':
      return { tone: 'normal', label: 'เริ่มต้น' };
    case 'add':
      return { tone: 'active', label: 'add Θ(1)' };
    case 'visit':
      return e.match ? { tone: 'done', label: 'พบ' } : { tone: 'waiting', label: 'กำลังเดิน O(n)' };
    case 'startP':
    case 'advance':
      return { tone: 'waiting', label: 'กำลังเดิน O(n)' };
    case 'notFound':
      return { tone: 'error', label: 'ไม่พบ' };
    case 'removeFirst':
      return { tone: 'error', label: 'กรณีพิเศษ' };
    case 'unlink':
      return { tone: 'done', label: 'ลบแล้ว' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function LinkedCollectionSim() {
  const ops = useParsedText(PRESETS[0]!.value.text, parse);
  const [mode, setMode] = useState<Mode>(PRESETS[0]!.value.mode);
  const initialState = useMemo(() => init(ops.value, mode === 'header'), [ops.value, mode]);

  return (
    <SimulationPlayer
      title="LinkedCollection: มีและไม่มีปมหัว"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === ops.text && p.value.mode === mode)}
            onPick={(p) => {
              setMode(p.mode);
              ops.apply(p.text);
            }}
          />
          <SimTextInput label="คำสั่ง (คั่นด้วย ,)" hint="ใช้ได้: add <ค่า>, remove <ค่า>, contains <ค่า> — แก้แล้ว simulation เริ่มใหม่" text={ops.text} error={ops.error} onChange={ops.apply} />
          <SimToggle label="รูปแบบการโยง" value={mode} onChange={setMode} options={[{ value: 'none', label: 'ไม่มีปมหัว' }, { value: 'header', label: 'มีปมหัว' }]} />
        </div>
      }
      legend={
        <>
          <span>↑ p = ปมก่อนหน้าตัวที่ตรวจ</span>
          <span>⏚ = next เป็น null</span>
        </>
      }
    />
  );
}
