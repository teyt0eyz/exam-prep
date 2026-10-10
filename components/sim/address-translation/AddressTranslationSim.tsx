'use client';

import { useMemo, useState } from 'react';
import {
  NumberStepper,
  OpChips,
  PresetBar,
  SimTextInput,
  SimToggle,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { hex, init, isDone, parseNumber, parsePageTable, parseRefs, parseSegments, step, type Config, type Mode, type State } from './logic';

const MODES = [
  { value: 'base', label: 'Base & Bounds' },
  { value: 'segment', label: 'Segmentation' },
  { value: 'page', label: 'Paging' },
] as const;

interface Preset {
  mode: Mode;
  refs: string;
  base: string;
  bound: string;
  segments: string;
  pages: string;
  bits: number;
}
const BASE = { base: '0x4000', bound: '0x1000', segments: 'code 0x4000 0x700 rx; data 0 0x500 rw; heap -; stack 0x2000 0x1000 rw', pages: '4, 3, 1' };

const PRESETS: { label: string; value: Preset }[] = [
  // ADR p.13: 2-bit segment number + 12-bit offset; main at 0x240 → 0x4240, x at 0x1108 → 0x108
  { label: 'สไลด์ p.13: Segmentation', value: { ...BASE, mode: 'segment', bits: 12, refs: 'x 0x240, r 0x1108, w 0x240, r 0x2004, r 0x1600' } },
  // ADR p.21: pages of 4 bytes (A–D, E–H, I–L), page table [4, 3, 1]
  { label: 'สไลด์ p.21: Paging', value: { ...BASE, mode: 'page', bits: 2, refs: 'r 0, r 5, r 10, r 13' } },
  // ADR p.7: base and bounds
  { label: 'สไลด์ p.7: Base & Bounds', value: { ...BASE, mode: 'base', bits: 12, refs: 'r 0x240, w 0x240, r 0x1200' } },
];

const cell = 'px-2 text-center';

function Canvas({ state }: { state: State }) {
  const c = state.config;
  const stage = state.stages[state.stage];
  const ref = c.refs[state.ref]!;
  const split = c.mode !== 'base' && stage?.index !== undefined;
  const totalBits = c.mode === 'base' ? 0 : c.offsetBits + (c.mode === 'segment' ? 2 : Math.max(Math.ceil(Math.log2(Math.max(c.pageTable.length, 2))), 1));
  const bits = ref.address.toString(2).padStart(totalBits, '0');
  const fmt = (n: number) => (c.mode === 'page' ? `${n}` : hex(n));

  return (
    <div className="flex flex-col gap-3">
      <OpChips ops={c.refs.map((r, i) => `${r.access} ${fmt(r.address)}${state.results[i] !== undefined ? ` → ${state.results[i] === null ? '✕' : fmt(state.results[i]!)}` : ''}`)} current={state.stage >= 0 ? state.ref : -1} />

      <div className="flex flex-wrap items-stretch justify-center gap-2 font-mono text-[13px]">
        <div className="rounded-md border border-line bg-surface px-3 py-1.5 text-center">
          <p className="text-[11px] leading-4 text-faint">virtual address</p>
          <p className="font-semibold leading-6">{fmt(ref.address)}</p>
          {c.mode !== 'base' ? (
            <p className="text-[11px] leading-4 text-muted">
              <span className={split ? 'rounded-sm bg-accent-soft px-0.5 text-accent' : ''}>{bits.slice(0, bits.length - c.offsetBits)}</span>
              <span className={split ? 'ml-0.5 rounded-sm bg-warn-soft px-0.5 text-warn' : ''}>{bits.slice(bits.length - c.offsetBits)}</span>
            </p>
          ) : null}
        </div>
        {split ? (
          <>
            <div className="rounded-md border border-accent bg-accent-soft px-3 py-1.5 text-center">
              <p className="text-[11px] leading-4 text-accent">{c.mode === 'segment' ? 'segment #' : 'page #'}</p>
              <p className="font-semibold leading-6">{stage.index}</p>
            </div>
            <div className="rounded-md border border-warn bg-warn-soft px-3 py-1.5 text-center">
              <p className="text-[11px] leading-4 text-warn">offset</p>
              <p className="font-semibold leading-6">{fmt(stage.offset ?? 0)}</p>
            </div>
          </>
        ) : null}
        {stage?.tone === 'done' || stage?.tone === 'error' ? (
          <div className={`rounded-md border px-3 py-1.5 text-center ${stage.tone === 'done' ? 'border-ok bg-ok-soft' : 'border-bad bg-bad-soft'}`}>
            <p className={`text-[11px] leading-4 ${stage.tone === 'done' ? 'text-ok' : 'text-bad'}`}>physical address</p>
            <p className="font-semibold leading-6">{stage.physical !== undefined ? fmt(stage.physical) : 'exception'}</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        {c.mode === 'base' ? (
          <table className="w-full border-collapse font-mono text-[13px] leading-[30px]">
            <tbody>
              <tr className={stage && state.stage === 0 ? 'bg-accent-soft' : ''}>
                <td className="px-3 text-muted">bound register</td>
                <td className="px-3 text-right font-semibold">{hex(c.bound)}</td>
              </tr>
              <tr className={`border-t border-line ${stage?.tone === 'done' ? 'bg-accent-soft' : ''}`}>
                <td className="px-3 text-muted">base register</td>
                <td className="px-3 text-right font-semibold">{hex(c.base)}</td>
              </tr>
            </tbody>
          </table>
        ) : c.mode === 'segment' ? (
          <table className="w-full min-w-max border-collapse font-mono text-[13px] leading-[30px]">
            <thead>
              <tr className="bg-surface-2 text-[12px] text-muted">
                <th className={`${cell} font-medium`}>#</th>
                <th className="px-2 text-left font-medium">segment</th>
                <th className={`${cell} font-medium`}>start</th>
                <th className={`${cell} font-medium`}>length</th>
                <th className={`${cell} font-medium`}>สิทธิ์</th>
              </tr>
            </thead>
            <tbody>
              {c.segments.map((s, i) => (
                <tr key={i} className={`border-t border-line ${stage?.row === i ? (stage.tone === 'error' ? 'bg-bad-soft' : 'bg-accent-soft') : ''}`}>
                  <td className={cell}>{i}</td>
                  <td className="px-2">{s.name}</td>
                  <td className={cell}>{s.start === null ? '–' : hex(s.start)}</td>
                  <td className={cell}>{s.start === null ? '–' : hex(s.length)}</td>
                  <td className={cell}>{s.perms || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse font-mono text-[13px] leading-[30px]">
            <thead>
              <tr className="bg-surface-2 text-[12px] text-muted">
                <th className={`${cell} font-medium`}>page #</th>
                <th className={`${cell} font-medium`}>virtual address</th>
                <th className={`${cell} font-medium`}>frame #</th>
                <th className={`${cell} font-medium`}>physical address</th>
              </tr>
            </thead>
            <tbody>
              {c.pageTable.map((f, i) => {
                const size = 1 << c.offsetBits;
                return (
                  <tr key={i} className={`border-t border-line ${stage?.row === i ? (stage.tone === 'error' ? 'bg-bad-soft' : 'bg-accent-soft') : ''}`}>
                    <td className={cell}>{i}</td>
                    <td className={cell}>
                      {i * size}–{i * size + size - 1}
                    </td>
                    <td className={`${cell} font-semibold`}>{f ?? 'invalid'}</td>
                    <td className={cell}>{f === null ? '–' : `${f * size}–${f * size + size - 1}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function explain(state: State): SimExplanation {
  const stage = state.stages[state.stage];
  if (!stage) {
    const intro: Record<Mode, string> = {
      base: 'Base and Bounds: แต่ละ process มี register สองตัว ตรวจว่า virtual address น้อยกว่า bound แล้วบวกด้วย base',
      segment: 'Segmentation: virtual address แบ่งเป็นหมายเลข segment กับ offset แต่ละ segment มี start, length และสิทธิ์การเข้าถึงของตัวเองใน segment table',
      page: 'Paging: memory แบ่งเป็น page ขนาดคงที่ virtual address แบ่งเป็นหมายเลข page กับ offset แล้วใช้ page table แปลงหมายเลข page เป็นหมายเลข frame',
    };
    return { title: 'สถานะเริ่มต้น', body: `${intro[state.config.mode]} กด step เพื่อแปล address ทีละขั้น` };
  }
  return { title: stage.title, body: stage.body };
}

function status(state: State): { tone: SimTone; label: string } {
  const stage = state.stages[state.stage];
  if (!stage) return { tone: 'normal', label: 'เริ่มต้น' };
  const label = stage.tone === 'done' ? 'แปลสำเร็จ' : stage.tone === 'error' ? 'exception' : stage.tone === 'waiting' ? 'เปิดตาราง' : 'แยก address';
  return { tone: stage.tone, label: state.config.mode === 'base' && stage.tone === 'active' ? 'ตรวจ bound' : label };
}

const render = (state: State) => <Canvas state={state} />;

export function AddressTranslationSim() {
  const first = PRESETS[0]!.value;
  const [mode, setMode] = useState<Mode>(first.mode);
  const [bits, setBits] = useState(first.bits);
  const refs = useParsedText(first.refs, parseRefs);
  const base = useParsedText(first.base, parseNumber);
  const bound = useParsedText(first.bound, parseNumber);
  const segments = useParsedText(first.segments, parseSegments);
  const pages = useParsedText(first.pages, parsePageTable);

  const load = (p: Preset) => {
    setMode(p.mode);
    setBits(p.bits);
    refs.apply(p.refs);
    base.apply(p.base);
    bound.apply(p.bound);
    segments.apply(p.segments);
    pages.apply(p.pages);
  };

  const config: Config = useMemo(
    () => ({ mode, refs: refs.value, base: base.value, bound: bound.value, segments: segments.value, offsetBits: bits, pageTable: pages.value }),
    [mode, refs.value, base.value, bound.value, segments.value, bits, pages.value],
  );
  const initialState = useMemo(() => init(config), [config]);

  return (
    <SimulationPlayer
      title="Address Translation"
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
            activeIndex={PRESETS.findIndex((p) => p.value.mode === mode && p.value.refs === refs.text && p.value.bits === bits && p.value.base === base.text && p.value.bound === bound.text && p.value.segments === segments.text && p.value.pages === pages.text)}
            onPick={load}
          />
          <SimToggle label="วิธี" value={mode} options={MODES} onChange={(m) => load(PRESETS.find((p) => p.value.mode === m)!.value)} />
          <SimTextInput label="address ที่จะแปล (คั่นด้วย ,)" hint="r = อ่าน, w = เขียน, x = execute ตามด้วย address (ฐานสิบ หรือ 0x ฐานสิบหก)" text={refs.text} error={refs.error} onChange={refs.apply} />
          {mode === 'base' ? (
            <>
              <SimTextInput label="base" hint="ตำแหน่งเริ่มของ process ใน physical memory" text={base.text} error={base.error} onChange={base.apply} rows={1} />
              <SimTextInput label="bound" hint="ขนาดพื้นที่ของ process — virtual address ต้องน้อยกว่าค่านี้" text={bound.text} error={bound.error} onChange={bound.apply} rows={1} />
            </>
          ) : null}
          {mode === 'segment' ? <SimTextInput label="segment table (คั่นด้วย ;)" hint="ชื่อ start length สิทธิ์ (r, w, x) — segment ที่ยังไม่จองเขียนว่า heap -" text={segments.text} error={segments.error} onChange={segments.apply} rows={3} /> : null}
          {mode === 'page' ? <SimTextInput label="page table: frame ของ page 0, 1, 2, ..." hint="ใช้ - สำหรับ page ที่ invalid" text={pages.text} error={pages.error} onChange={pages.apply} rows={1} /> : null}
          {mode !== 'base' ? <NumberStepper label="จำนวน bit ของ offset" value={bits} min={1} max={12} onChange={setBits} /> : null}
        </div>
      }
      legend={
        <>
          <span>✕ = exception</span>
          <span>{mode === 'page' ? 'ขนาด page = 2^(bit ของ offset)' : 'เลข 0x = ฐานสิบหก'}</span>
        </>
      }
    />
  );
}
