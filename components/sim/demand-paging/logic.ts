// TLB + demand paging: docs/OS/07-address_v4.pdf p.32–34 and docs/OS/08-Virtual memory_v3.pdf p.10–17.
import { type Parsed } from '@/components/sim/core/inputs';

export interface Ref {
  write: boolean;
  page: number;
}
export interface Pte {
  frame: number | null;
  use: boolean;
  dirty: boolean;
}

export type Phase = 'start' | 'walk' | 'fault' | 'alloc' | 'read' | 'resume' | 'exec';

export type Ev =
  | { kind: 'init' }
  | { kind: 'tlb-hit'; page: number; frame: number }
  | { kind: 'tlb-miss'; page: number }
  | { kind: 'walk-ok'; page: number; frame: number; tlbOut: number | null }
  | { kind: 'fault'; page: number }
  | { kind: 'alloc-free'; page: number; frame: number }
  | { kind: 'alloc-evict'; page: number; frame: number; victim: number; dirty: boolean; inTlb: boolean }
  | { kind: 'read'; page: number; frame: number }
  | { kind: 'resume'; page: number; frame: number; tlbOut: number | null }
  | { kind: 'exec'; page: number; frame: number; write: boolean };

export interface State {
  refs: readonly Ref[];
  tlbSize: number;
  pt: readonly Pte[];
  /** TLB entries, oldest first (replaced FIFO). */
  tlb: readonly { page: number; frame: number }[];
  /** Page held by each frame. */
  frames: readonly (number | null)[];
  /** Frames in the order they were filled (evicted FIFO). */
  order: readonly number[];
  i: number;
  phase: Phase;
  /** Frame chosen for the page being faulted in. */
  target: number | null;
  lookups: number;
  misses: number;
  faults: number;
  diskReads: number;
  diskWrites: number;
  event: Ev;
}

export const MAX_PAGE = 7;

export function parse(text: string): Parsed<Ref[]> {
  const tokens = text.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 รายการ เช่น r 0' };
  if (tokens.length > 12) return { error: 'ใส่ได้ไม่เกิน 12 รายการ' };
  const refs: Ref[] = [];
  for (const token of tokens) {
    const m = /^([rw])\s*(\d)$/i.exec(token);
    if (!m || Number(m[2]) > MAX_PAGE) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ r หรือ w ตามด้วยหมายเลข page 0–${MAX_PAGE} เช่น w 2` };
    refs.push({ write: m[1]!.toLowerCase() === 'w', page: Number(m[2]) });
  }
  return { value: refs };
}

export function init(refs: readonly Ref[], tlbSize: number, frames: number): State {
  const pages = Math.max(...refs.map((r) => r.page)) + 1;
  return {
    refs,
    tlbSize,
    pt: Array.from({ length: pages }, () => ({ frame: null, use: false, dirty: false })),
    tlb: [],
    frames: Array.from({ length: frames }, () => null),
    order: [],
    i: 0,
    phase: 'start',
    target: null,
    lookups: 0,
    misses: 0,
    faults: 0,
    diskReads: 0,
    diskWrites: 0,
    event: { kind: 'init' },
  };
}

export const isDone = (s: State) => s.i >= s.refs.length;

const setPte = (pt: readonly Pte[], page: number, patch: Partial<Pte>) => pt.map((p, k) => (k === page ? { ...p, ...patch } : p));

function loadTlb(s: State, page: number, frame: number) {
  const full = s.tlb.length >= s.tlbSize;
  return { tlb: [...(full ? s.tlb.slice(1) : s.tlb), { page, frame }], tlbOut: full ? s.tlb[0]!.page : null };
}

export function step(s: State): State {
  const ref = s.refs[s.i];
  if (!ref) return s;
  const { page } = ref;

  switch (s.phase) {
    case 'start': {
      const hit = s.tlb.find((t) => t.page === page);
      if (hit) return { ...s, lookups: s.lookups + 1, phase: 'exec', event: { kind: 'tlb-hit', page, frame: hit.frame } };
      return { ...s, lookups: s.lookups + 1, misses: s.misses + 1, phase: 'walk', event: { kind: 'tlb-miss', page } };
    }
    case 'walk': {
      const frame = s.pt[page]!.frame;
      if (frame === null) return { ...s, faults: s.faults + 1, phase: 'alloc', event: { kind: 'fault', page } };
      const { tlb, tlbOut } = loadTlb(s, page, frame);
      // use bit is set in the page table entry on a TLB miss
      return { ...s, tlb, pt: setPte(s.pt, page, { use: true }), phase: 'exec', event: { kind: 'walk-ok', page, frame, tlbOut } };
    }
    case 'alloc': {
      const free = s.frames.findIndex((f) => f === null);
      if (free >= 0) return { ...s, target: free, phase: 'read', event: { kind: 'alloc-free', page, frame: free } };
      const frame = s.order[0]!;
      const victim = s.frames[frame]!;
      const dirty = s.pt[victim]!.dirty;
      const inTlb = s.tlb.some((t) => t.page === victim);
      return {
        ...s,
        target: frame,
        order: s.order.slice(1),
        frames: s.frames.map((f, k) => (k === frame ? null : f)),
        // set the victim's page table entry to invalid and drop its TLB entry
        pt: setPte(s.pt, victim, { frame: null, use: false, dirty: false }),
        tlb: s.tlb.filter((t) => t.page !== victim),
        diskWrites: s.diskWrites + (dirty ? 1 : 0),
        phase: 'read',
        event: { kind: 'alloc-evict', page, frame, victim, dirty, inTlb },
      };
    }
    case 'read': {
      const frame = s.target!;
      return {
        ...s,
        frames: s.frames.map((f, k) => (k === frame ? page : f)),
        order: [...s.order, frame],
        pt: setPte(s.pt, page, { frame, use: false, dirty: false }),
        diskReads: s.diskReads + 1,
        phase: 'resume',
        event: { kind: 'read', page, frame },
      };
    }
    case 'resume': {
      const frame = s.pt[page]!.frame!;
      const { tlb, tlbOut } = loadTlb(s, page, frame);
      return { ...s, tlb, target: null, lookups: s.lookups + 1, misses: s.misses + 1, pt: setPte(s.pt, page, { use: true }), phase: 'exec', event: { kind: 'resume', page, frame, tlbOut } };
    }
    default: {
      const frame = s.pt[page]!.frame!;
      return { ...s, pt: ref.write ? setPte(s.pt, page, { dirty: true }) : s.pt, i: s.i + 1, phase: 'start', event: { kind: 'exec', page, frame, write: ref.write } };
    }
  }
}
