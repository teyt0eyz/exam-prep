'use client';

import { useMemo, useState } from 'react';
import {
  NumberStepper,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { countMisses, init, isDone, parse, step, type Policy, type State } from './logic';

const POLICIES = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'min', label: 'MIN' },
  { value: 'lru', label: 'LRU' },
  { value: 'lfu', label: 'LFU' },
] as const;

const BELADY = 'A B C D A B E A B C D E';
const PRESETS: { label: string; value: { text: string; frames: number; policy: Policy } }[] = [
  // VM p.26: Belady's anomaly, FIFO with 3 slots (9 misses) and 4 slots (10 misses)
  { label: 'สไลด์ p.26: Belady 3 ช่อง', value: { text: BELADY, frames: 3, policy: 'fifo' } },
  { label: 'สไลด์ p.26: Belady 4 ช่อง', value: { text: BELADY, frames: 4, policy: 'fifo' } },
  // VM p.22: FIFO strides through memory larger than the cache
  { label: 'สไลด์ p.22: FIFO scan', value: { text: 'A B C D E A B C D E A B C D E', frames: 4, policy: 'fifo' } },
  // VM p.24: same scan under MIN
  { label: 'สไลด์ p.24: MIN scan', value: { text: 'A B C D E A B C D E A B C D E', frames: 4, policy: 'min' } },
  // VM p.25: LRU / FIFO / MIN compared on one string
  { label: 'สไลด์ p.25: LRU', value: { text: 'A B A C B D A D E D A E B A C', frames: 4, policy: 'lru' } },
];

const NAME: Record<Policy, string> = { fifo: 'FIFO', min: 'MIN', lru: 'LRU', lfu: 'LFU' };

function Canvas({ state }: { state: State }) {
  const frames = state.slots.length;
  const last = state.columns.length - 1;
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1.5 font-mono text-[13px] leading-5 text-muted">
        อ้างอิงแล้ว <b className="text-ink">{state.i}</b>/{state.refs.length} · miss = <b className="text-bad">{state.misses}</b> · hit ={' '}
        <b className="text-ok">{state.i - state.misses}</b>
      </p>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-max border-collapse text-center font-mono text-[13px] leading-[30px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="sticky left-0 bg-surface-2 px-2 text-left text-[11px] font-medium text-muted">ref</th>
              {state.refs.map((r, c) => (
                <th key={c} className={`min-w-[30px] px-1 font-semibold ${c === last ? 'bg-accent text-accent-ink' : c < state.i ? 'text-ink' : 'text-faint'}`}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: frames }, (_, row) => (
              <tr key={row} className="border-t border-line">
                <td className="sticky left-0 bg-surface px-2 text-left text-[11px] text-muted">ช่อง {row + 1}</td>
                {state.refs.map((_, c) => {
                  const col = state.columns[c];
                  const touched = col?.slot === row;
                  return (
                    <td key={c} className={`px-1 ${touched ? (col.hit ? 'bg-ok-soft font-semibold text-ok' : 'bg-bad-soft font-semibold text-bad') : 'text-ink'}`}>
                      {col ? (col.pages[row] ?? '') : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-line bg-surface-2 text-[11px]">
              <td className="sticky left-0 bg-surface-2 px-2 text-left text-muted">ผล</td>
              {state.refs.map((_, c) => {
                const col = state.columns[c];
                return (
                  <td key={c} className={col ? (col.hit ? 'text-ok' : 'text-bad') : ''}>
                    {col ? (col.hit ? 'hit' : 'miss') : ''}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {isDone(state) ? (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[22px] text-muted">
          สตริงเดียวกัน {frames} ช่อง: {POLICIES.map((p) => `${p.label} ${countMisses(state.refs, frames, p.value)} miss`).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const frames = state.slots.length;
  switch (e.kind) {
    case 'init': {
      const rule: Record<Policy, string> = {
        fifo: 'FIFO แทนตัวที่อยู่ใน cache นานที่สุด (เข้ามาก่อนสุด) โดยไม่สนว่าเพิ่งถูกใช้หรือไม่',
        min: 'MIN แทนตัวที่จะไม่ถูกใช้ไปอีกนานที่สุดในอนาคต เป็นวิธีที่ miss น้อยที่สุด แต่ต้องรู้อนาคต',
        lru: 'LRU แทนตัวที่ไม่ถูกใช้มานานที่สุดในอดีต เป็นการประมาณ MIN',
        lfu: 'LFU แทนตัวที่ถูกใช้น้อยครั้งที่สุด (ถ้าเท่ากัน simulation นี้แทนตัวที่เข้ามาก่อน)',
      };
      return { title: `${NAME[state.policy]} กับ ${frames} ช่อง`, body: `${rule[state.policy]} ช่องว่างจะถูกเติมก่อนเสมอ` };
    }
    case 'hit':
      return {
        title: `อ้างอิง ${e.page}: hit`,
        body: `${e.page} อยู่ในช่อง ${e.slot + 1} แล้ว ไม่ต้องอ่านจาก disk${state.policy === 'lru' ? ' LRU บันทึกว่า page นี้เพิ่งถูกใช้ จึงกลายเป็นตัวที่จะถูกแทนช้าที่สุด' : state.policy === 'lfu' ? ' LFU นับจำนวนครั้งที่ใช้เพิ่มอีกหนึ่ง' : state.policy === 'fifo' ? ' FIFO ไม่เปลี่ยนลำดับอะไร เพราะดูแค่เวลาที่เข้ามา' : ''}`,
      };
    case 'fill':
      return { title: `อ้างอิง ${e.page}: miss (ยังมีช่องว่าง)`, body: `${e.page} ไม่อยู่ใน cache จึงเป็น miss แต่ช่อง ${e.slot + 1} ยังว่าง จึงใส่ได้โดยไม่ต้องแทนใคร` };
    case 'evict': {
      const col = state.columns[state.columns.length - 2];
      const detail = e.scores
        .map((v, k) => {
          const p = col?.pages[k] ?? '?';
          if (state.policy === 'min') return `${p}: ${v === null ? 'ไม่ถูกใช้อีก' : `ใช้อีกครั้งที่ตำแหน่ง ${v + 1}`}`;
          if (state.policy === 'lfu') return `${p}: ใช้ ${v} ครั้ง`;
          return `${p}: ${state.policy === 'fifo' ? 'เข้ามา' : 'ใช้ล่าสุด'}ที่ตำแหน่ง ${(v ?? 0) + 1}`;
        })
        .join(', ');
      const why: Record<Policy, string> = {
        fifo: 'เข้ามาก่อนสุด',
        min: 'จะไม่ถูกใช้ไปอีกนานที่สุด',
        lru: 'ไม่ถูกใช้มานานที่สุด',
        lfu: 'ถูกใช้น้อยครั้งที่สุด',
      };
      return { title: `อ้างอิง ${e.page}: miss แทน ${e.victim}`, body: `cache เต็ม ต้องเลือกตัวออก — ${detail} → ${e.victim} ${why[state.policy]} จึงถูกแทนด้วย ${e.page} ในช่อง ${e.slot + 1}` };
    }
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (isDone(state)) return { tone: 'done', label: `จบ: ${state.misses} miss` };
  return e.kind === 'hit' ? { tone: 'done', label: 'hit' } : { tone: 'error', label: 'miss' };
}

const render = (state: State) => <Canvas state={state} />;

export function PageReplacementSim() {
  const refs = useParsedText(PRESETS[0]!.value.text, parse);
  const [frames, setFrames] = useState(PRESETS[0]!.value.frames);
  const [policy, setPolicy] = useState<Policy>(PRESETS[0]!.value.policy);
  const initialState = useMemo(() => init(refs.value, frames, policy), [refs.value, frames, policy]);

  return (
    <SimulationPlayer
      title="Page Replacement: FIFO, MIN, LRU, LFU"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === refs.text && p.value.frames === frames && p.value.policy === policy)}
            onPick={(p) => {
              setFrames(p.frames);
              setPolicy(p.policy);
              refs.apply(p.text);
            }}
          />
          <SimTextInput label="reference string (คั่นด้วยช่องว่าง)" hint="ชื่อ page เป็นตัวอักษรหรือตัวเลข — แก้แล้ว simulation เริ่มใหม่" text={refs.text} error={refs.error} onChange={refs.apply} />
          <SimToggle label="นโยบาย" value={policy} options={POLICIES} onChange={setPolicy} />
          <NumberStepper label="จำนวนช่อง (frame)" value={frames} min={1} max={6} onChange={setFrames} />
        </div>
      }
      legend={
        <>
          <span className="text-bad">แดง = miss (ช่องที่ถูกเขียน)</span>
          <span className="text-ok">เขียว = hit</span>
        </>
      }
    />
  );
}
