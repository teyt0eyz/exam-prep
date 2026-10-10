'use client';

import { useMemo, useState } from 'react';
import {
  NumberStepper,
  OpChips,
  PresetBar,
  SimTextInput,
  SimulationPlayer,
  useParsedText,
  type SimExplanation,
  type SimTone,
} from '@/components/sim/core';
import { init, isDone, parse, step, type State } from './logic';

const PRESETS = [
  // VM p.12: one reference to a page that is not in memory walks all 13 steps
  { label: 'สไลด์ p.12: page fault 13 ขั้น', value: { text: 'r 0, r 0', tlb: 2, frames: 2 } },
  // VM p.13–16: eviction, dirty bit and write-back
  { label: 'สไลด์ p.13: evict และ dirty bit', value: { text: 'w 0, r 1, r 2, r 0', tlb: 2, frames: 2 } },
  // ADR p.32: TLB smaller than the working set
  { label: 'สไลด์ ADR p.32: TLB เล็ก', value: { text: 'r 0, r 1, r 0, r 1, r 2, r 0', tlb: 1, frames: 3 } },
];

// assumed costs for the formula on ADR p.32 (the slides give no numbers)
const TLB_NS = 1;
const WALK_NS = 100;

const th = 'px-2 font-medium';
const td = 'px-2';

function Canvas({ state }: { state: State }) {
  const e = state.event;
  const page = 'page' in e ? e.page : -1;
  const running = state.phase === 'start' && e.kind !== 'init' ? state.i - 1 : state.i;
  const rate = state.lookups > 0 ? state.misses / state.lookups : 0;

  return (
    <div className="flex flex-col gap-3">
      <OpChips ops={state.refs.map((r) => `${r.write ? 'w' : 'r'} ${r.page}`)} current={running} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-line">
          <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">TLB ({state.tlbSize} ช่อง)</p>
          <table className="w-full border-collapse text-center font-mono text-[13px] leading-[28px]">
            <thead>
              <tr className="text-[11px] text-faint">
                <th className={th}>page</th>
                <th className={th}>frame</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: state.tlbSize }, (_, k) => {
                const t = state.tlb[k];
                return (
                  <tr key={k} className={`border-t border-line ${t && t.page === page ? 'bg-accent-soft' : ''}`}>
                    <td className={td}>{t ? t.page : '–'}</td>
                    <td className={td}>{t ? t.frame : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-md border border-line">
          <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">physical memory ({state.frames.length} frame)</p>
          <table className="w-full border-collapse text-center font-mono text-[13px] leading-[28px]">
            <thead>
              <tr className="text-[11px] text-faint">
                <th className={th}>frame</th>
                <th className={th}>เก็บ page</th>
              </tr>
            </thead>
            <tbody>
              {state.frames.map((p, k) => (
                <tr key={k} className={`border-t border-line ${k === state.target ? 'bg-warn-soft' : p !== null && p === page ? 'bg-accent-soft' : ''}`}>
                  <td className={td}>{k}</td>
                  <td className={td}>{p ?? (k === state.target ? 'กำลังอ่าน…' : 'ว่าง')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        <p className="bg-surface-2 px-2 text-[12px] font-medium leading-7 text-muted">page table</p>
        <table className="w-full border-collapse text-center font-mono text-[13px] leading-[28px]">
          <thead>
            <tr className="text-[11px] text-faint">
              <th className={th}>page</th>
              <th className={th}>valid</th>
              <th className={th}>frame</th>
              <th className={th}>use</th>
              <th className={th}>dirty</th>
            </tr>
          </thead>
          <tbody>
            {state.pt.map((p, k) => (
              <tr key={k} className={`border-t border-line ${k === page ? (e.kind === 'fault' ? 'bg-bad-soft' : 'bg-accent-soft') : ''}`}>
                <td className={td}>{k}</td>
                <td className={`${td} ${p.frame === null ? 'text-faint' : 'text-ok'}`}>{p.frame === null ? 'invalid' : 'valid'}</td>
                <td className={td}>{p.frame ?? '–'}</td>
                <td className={td}>{p.use ? 1 : 0}</td>
                <td className={`${td} ${p.dirty ? 'font-semibold text-warn' : ''}`}>{p.dirty ? 1 : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-1.5 font-mono text-[12px] leading-5 text-muted">
        TLB lookup {state.lookups} · TLB miss {state.misses} · page fault {state.faults} · disk read {state.diskReads} · disk write {state.diskWrites}
      </p>
      {isDone(state) ? (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[22px] text-muted">
          Prob(TLB miss) = {state.misses}/{state.lookups} = {rate.toFixed(2)} → ถ้าสมมติ TLB lookup {TLB_NS} ns และ page table lookup {WALK_NS} ns: cost of translation = {TLB_NS} + {rate.toFixed(2)} × {WALK_NS} ={' '}
          <b className="text-ink">{(TLB_NS + rate * WALK_NS).toFixed(0)} ns</b> (ยังไม่นับเวลาอ่าน disk ตอน page fault ซึ่งช้ากว่ามาก)
        </p>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  const e = state.event;
  const out = (p: number | null) => (p === null ? '' : ` TLB เต็ม จึงแทนรายการที่เก่าที่สุด (page ${p})`);
  switch (e.kind) {
    case 'init':
      return { title: 'ทุก page ยังอยู่บน disk', body: 'page table ทำเครื่องหมายทุก page ว่า invalid และ TLB ว่าง การอ้างอิงแต่ละครั้งเริ่มที่ TLB เสมอ ถ้าไม่พบจึงเดิน page table และถ้า page ไม่อยู่ใน memory จึงเกิด page fault' };
    case 'tlb-hit':
      return { title: `page ${e.page}: TLB hit`, body: `TLB มีรายการ page ${e.page} → frame ${e.frame} อยู่แล้ว จึงใช้ได้ทันทีโดยไม่ต้องเปิด page table เป็นกรณีที่เร็วที่สุด` };
    case 'tlb-miss':
      return { title: `ขั้น 1: TLB miss (page ${e.page})`, body: `TLB ไม่มีรายการของ page ${e.page} จึงต้องเดิน page table (page table walk) เพื่อหา frame` };
    case 'walk-ok':
      return { title: `page table walk: page ${e.page} valid → frame ${e.frame}`, body: `page อยู่ใน memory แล้ว จึงไม่เกิด page fault แค่นำรายการใส่ TLB และ hardware ตั้ง use bit ใน page table entry (ตั้งทุกครั้งที่ TLB miss)${out(e.tlbOut)}` };
    case 'fault':
      return { title: `ขั้น 2–5: page fault (page ${e.page})`, body: `page table walk พบว่า page ${e.page} เป็น invalid → page fault → trap เข้า kernel แล้ว kernel แปลง virtual address เป็นตำแหน่งบน disk (file + offset) ที่เก็บ page นี้` };
    case 'alloc-free':
      return { title: `ขั้น 6: จอง page frame ${e.frame}`, body: `frame ${e.frame} ยังว่าง จึงใช้ได้เลยโดยไม่ต้อง evict page ใด` };
    case 'alloc-evict':
      return {
        title: `ขั้น 6: memory เต็ม → evict page ${e.victim}`,
        body: `ไม่มี frame ว่าง จึงเลือก page ${e.victim} ใน frame ${e.frame} ออก (simulation นี้ใช้ FIFO) แล้วตั้ง page table entry ของมันเป็น invalid${e.inTlb ? ' และลบรายการของมันออกจาก TLB เพราะเป็นสำเนาที่ใช้ไม่ได้แล้ว' : ''} ${e.dirty ? 'dirty bit เป็น 1 แปลว่าถูกแก้ไข จึงต้องเขียนกลับ disk ก่อน' : 'dirty bit เป็น 0 แปลว่าไม่ถูกแก้ไข สำเนาบน disk ยังตรงกัน จึงไม่ต้องเขียนกลับ'}`,
      };
    case 'read':
      return { title: `ขั้น 7–9: อ่าน page ${e.page} จาก disk เข้า frame ${e.frame}`, body: 'kernel สั่งอ่าน disk block เข้า page frame ระหว่างรอ process นี้หยุดอยู่ เมื่อ DMA เสร็จ disk ส่ง interrupt แล้ว kernel ทำเครื่องหมาย page เป็น valid' };
    case 'resume':
      return { title: `ขั้น 10–12: ทำคำสั่งเดิมซ้ำ → TLB miss อีกครั้ง`, body: `kernel resume process ที่คำสั่งที่เกิด fault คำสั่งนั้นเริ่มใหม่ทั้งหมด จึง TLB miss อีกครั้ง แต่คราวนี้ page table walk พบว่า valid (frame ${e.frame}) จึงนำรายการใส่ TLB${out(e.tlbOut)}` };
    case 'exec':
      return { title: `${e.write ? 'เขียน' : 'อ่าน'} page ${e.page} ที่ frame ${e.frame} สำเร็จ`, body: e.write ? 'คำสั่ง store ทำให้ hardware ตั้ง dirty bit ของ page นี้ (ทั้งใน TLB และ page table entry) kernel จะรู้ว่าต้องเขียนกลับ disk ถ้า page นี้ถูก evict' : 'คำสั่ง load ไม่เปลี่ยนข้อมูล dirty bit จึงไม่ถูกตั้ง' };
  }
}

function status(state: State): { tone: SimTone; label: string } {
  const e = state.event;
  if (e.kind === 'init') return { tone: 'normal', label: 'เริ่มต้น' };
  if (isDone(state)) return { tone: 'done', label: 'จบ' };
  switch (e.kind) {
    case 'tlb-hit':
      return { tone: 'done', label: 'TLB hit' };
    case 'tlb-miss':
    case 'resume':
      return { tone: 'waiting', label: 'TLB miss' };
    case 'fault':
      return { tone: 'error', label: 'page fault' };
    case 'alloc-evict':
      return { tone: 'error', label: 'evict' };
    case 'read':
      return { tone: 'waiting', label: 'อ่าน disk' };
    case 'exec':
      return { tone: 'done', label: 'execute' };
    default:
      return { tone: 'active', label: 'kernel' };
  }
}

const render = (state: State) => <Canvas state={state} />;

export function DemandPagingSim() {
  const refs = useParsedText(PRESETS[0]!.value.text, parse);
  const [tlb, setTlb] = useState(PRESETS[0]!.value.tlb);
  const [frames, setFrames] = useState(PRESETS[0]!.value.frames);
  const initialState = useMemo(() => init(refs.value, tlb, frames), [refs.value, tlb, frames]);

  return (
    <SimulationPlayer
      title="TLB และ Demand Paging"
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
            activeIndex={PRESETS.findIndex((p) => p.value.text === refs.text && p.value.tlb === tlb && p.value.frames === frames)}
            onPick={(p) => {
              setTlb(p.tlb);
              setFrames(p.frames);
              refs.apply(p.text);
            }}
          />
          <SimTextInput label="ลำดับการเข้าถึง (คั่นด้วย ,)" hint="r = อ่าน, w = เขียน ตามด้วยหมายเลข page 0–7 เช่น w 0, r 1" text={refs.text} error={refs.error} onChange={refs.apply} />
          <NumberStepper label="ขนาด TLB" value={tlb} min={1} max={4} onChange={setTlb} />
          <NumberStepper label="จำนวน page frame" value={frames} min={1} max={4} onChange={setFrames} />
        </div>
      }
      legend={
        <>
          <span>use = ถูกใช้เมื่อเร็ว ๆ นี้</span>
          <span>dirty = ถูกแก้ไข</span>
        </>
      }
    />
  );
}
