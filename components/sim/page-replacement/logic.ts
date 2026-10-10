// Cache/page replacement policies: docs/OS/08-Virtual memory_v3.pdf p.20–26.
import { type Parsed } from '@/components/sim/core/inputs';

export type Policy = 'fifo' | 'min' | 'lru' | 'lfu';

export interface Slot {
  page: string;
  /** Reference index when the page was brought in. */
  loaded: number;
  /** Reference index of the latest use. */
  used: number;
  /** Number of uses since it was brought in. */
  count: number;
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'hit'; page: string; slot: number }
  | { kind: 'fill'; page: string; slot: number }
  | { kind: 'evict'; page: string; slot: number; victim: string; /** One number per slot: what the policy compared. */ scores: readonly (number | null)[] };

export interface State {
  refs: readonly string[];
  policy: Policy;
  slots: readonly (Slot | null)[];
  /** Next reference to process. */
  i: number;
  misses: number;
  /** Slot contents after each processed reference, for the table. */
  columns: readonly { pages: readonly (string | null)[]; hit: boolean; slot: number }[];
  event: Ev;
}

export const MAX_REFS = 24;

export function parse(text: string): Parsed<string[]> {
  const refs = text.split(/[\s,]+/).filter(Boolean);
  if (refs.length === 0) return { error: 'ใส่ reference string เช่น A B C D A B E' };
  if (refs.length > MAX_REFS) return { error: `ใส่ได้ไม่เกิน ${MAX_REFS} ตัว` };
  const bad = refs.find((r) => !/^[\p{L}\p{N}]{1,2}$/u.test(r));
  if (bad) return { error: `"${bad}" ใช้ไม่ได้ ชื่อ page ต้องเป็นตัวอักษรหรือตัวเลข 1–2 ตัว` };
  return { value: refs.map((r) => r.toUpperCase()) };
}

export const init = (refs: readonly string[], frames: number, policy: Policy): State => ({
  refs,
  policy,
  slots: Array.from({ length: frames }, () => null),
  i: 0,
  misses: 0,
  columns: [],
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.i >= s.refs.length;

/** Index of the next use of `page` after position `from`, or Infinity. */
function nextUse(refs: readonly string[], page: string, from: number) {
  const k = refs.indexOf(page, from + 1);
  return k === -1 ? Infinity : k;
}

export function step(s: State): State {
  const page = s.refs[s.i];
  if (page === undefined) return s;
  const done = (slots: readonly (Slot | null)[], hit: boolean, slot: number, event: Ev): State => ({
    ...s,
    slots,
    i: s.i + 1,
    misses: s.misses + (hit ? 0 : 1),
    columns: [...s.columns, { pages: slots.map((x) => x?.page ?? null), hit, slot }],
    event,
  });

  const at = s.slots.findIndex((x) => x?.page === page);
  if (at >= 0)
    return done(
      s.slots.map((x, k) => (k === at && x ? { ...x, used: s.i, count: x.count + 1 } : x)),
      true,
      at,
      { kind: 'hit', page, slot: at },
    );

  const fresh: Slot = { page, loaded: s.i, used: s.i, count: 1 };
  const free = s.slots.findIndex((x) => x === null);
  if (free >= 0) return done(s.slots.map((x, k) => (k === free ? fresh : x)), false, free, { kind: 'fill', page, slot: free });

  const full = s.slots as readonly Slot[];
  // lower score = better victim, except MIN where the farthest next use loses
  const scores = full.map((x) =>
    s.policy === 'fifo' ? x.loaded : s.policy === 'lru' ? x.used : s.policy === 'lfu' ? x.count : nextUse(s.refs, x.page, s.i),
  );
  let victim = 0;
  for (let k = 1; k < full.length; k++) {
    const a = scores[k]!;
    const b = scores[victim]!;
    if (s.policy === 'min' ? a > b : a < b) victim = k;
    // LFU tie: the page that has been in the cache longer goes first
    else if (s.policy === 'lfu' && a === b && full[k]!.loaded < full[victim]!.loaded) victim = k;
  }
  return done(s.slots.map((x, k) => (k === victim ? fresh : x)), false, victim, {
    kind: 'evict',
    page,
    slot: victim,
    victim: full[victim]!.page,
    scores: scores.map((v) => (v === Infinity ? null : v)),
  });
}

export function countMisses(refs: readonly string[], frames: number, policy: Policy): number {
  let s = init(refs, frames, policy);
  while (!isDone(s)) s = step(s);
  return s.misses;
}
