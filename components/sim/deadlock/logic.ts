// Deadlock and the resource allocation graph: docs/OS/05-Synchronization-part4-Conclusion_v2_1.pdf p.14–21.
import { type Parsed } from '@/components/sim/core/inputs';

export interface Op {
  type: 'acquire' | 'release';
  lock: number;
}
export interface Program {
  name: string;
  ops: readonly Op[];
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'acquire'; thread: number; lock: number }
  | { kind: 'wait'; thread: number; lock: number; holder: number }
  | { kind: 'release'; thread: number; lock: number; waiters: readonly number[] }
  | { kind: 'deadlock'; cycle: readonly number[] }
  | { kind: 'finished' };

export interface State {
  programs: readonly Program[];
  locks: readonly number[];
  schedule: readonly number[];
  k: number;
  pc: readonly number[];
  /** Thread holding each lock (same order as `locks`). */
  holder: readonly (number | null)[];
  /** Lock each thread is blocked on after trying to acquire it. */
  waiting: readonly (number | null)[];
  last: number;
  /** Threads on the cycle, once one exists. */
  cycle: readonly number[] | null;
  ended: boolean;
  event: Ev;
}

export const MAX_THREADS = 5;

export function parsePrograms(text: string): Parsed<Program[]> {
  const rows = text.split(/[;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (rows.length < 2 || rows.length > MAX_THREADS) return { error: `ใส่ 2–${MAX_THREADS} thread คั่นด้วย ; เช่น A: +1 +2 -2 -1; B: +2 +1 -1 -2` };
  const programs: Program[] = [];
  for (const row of rows) {
    const m = /^([A-Za-z])\s*:\s*(.+)$/.exec(row);
    if (!m) return { error: `อ่าน "${row}" ไม่ได้ รูปแบบคือ ชื่อ: +1 +2 -2 -1 (+ = acquire, − = release)` };
    const name = m[1]!.toUpperCase();
    if (programs.some((p) => p.name === name)) return { error: `ชื่อ thread ${name} ซ้ำ` };
    const ops: Op[] = [];
    const held = new Set<number>();
    for (const token of m[2]!.trim().split(/\s+/)) {
      const t = /^([+-])([1-6])$/.exec(token);
      if (!t) return { error: `thread ${name}: "${token}" ใช้ไม่ได้ ใส่ +n หรือ -n โดย n คือ lock 1–6` };
      const lock = Number(t[2]);
      if (t[1] === '+') {
        if (held.has(lock)) return { error: `thread ${name} acquire lock ${lock} ซ้ำทั้งที่ถืออยู่` };
        held.add(lock);
      } else {
        if (!held.has(lock)) return { error: `thread ${name} release lock ${lock} ทั้งที่ไม่ได้ถือ` };
        held.delete(lock);
      }
      ops.push({ type: t[1] === '+' ? 'acquire' : 'release', lock });
    }
    if (held.size > 0) return { error: `thread ${name} ไม่ได้ release lock ${[...held].join(', ')}` };
    if (ops.length > 12) return { error: `thread ${name} ยาวเกินไป (ไม่เกิน 12 คำสั่ง)` };
    programs.push({ name, ops });
  }
  return { value: programs };
}

export const parseSchedule =
  (names: readonly string[]) =>
  (text: string): Parsed<string[]> => {
    const tokens = text.toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (tokens.length > 40) return { error: 'ลำดับยาวเกินไป (ไม่เกิน 40)' };
    const bad = tokens.find((t) => !names.includes(t));
    if (bad) return { error: `ไม่มี thread ชื่อ "${bad}" (มี ${names.join(', ')})` };
    return { value: tokens };
  };

/** Lock ordering: every thread acquires the locks it needs in ascending order, then releases in reverse. */
export function ordered(programs: readonly Program[]): Program[] {
  return programs.map((p) => {
    const locks = [...new Set(p.ops.map((o) => o.lock))].sort((a, b) => a - b);
    return { name: p.name, ops: [...locks.map((lock) => ({ type: 'acquire' as const, lock })), ...locks.reverse().map((lock) => ({ type: 'release' as const, lock }))] };
  });
}

export function init(programs: readonly Program[], schedule: readonly string[]): State {
  const locks = [...new Set(programs.flatMap((p) => p.ops.map((o) => o.lock)))].sort((a, b) => a - b);
  return {
    programs,
    locks,
    schedule: schedule.map((n) => programs.findIndex((p) => p.name === n)).filter((i) => i >= 0),
    k: 0,
    pc: programs.map(() => 0),
    holder: locks.map(() => null),
    waiting: programs.map(() => null),
    last: -1,
    cycle: null,
    ended: false,
    event: { kind: 'init' },
  };
}

export const isDone = (s: State) => s.ended;
const finished = (s: State, t: number) => s.pc[t]! >= s.programs[t]!.ops.length;
const holderOf = (s: State, lock: number) => s.holder[s.locks.indexOf(lock)] ?? null;

/** Follow thread → lock it waits for → holder; a return to the start is a circular chain of requests. */
function findCycle(waiting: readonly (number | null)[], s: State, start: number): number[] | null {
  const path = [start];
  let t = start;
  for (;;) {
    const lock = waiting[t];
    if (lock === null || lock === undefined) return null;
    const h = holderOf(s, lock);
    if (h === null) return null;
    if (h === start) return path;
    if (path.includes(h)) return null;
    path.push(h);
    t = h;
  }
}

export function step(s: State): State {
  if (s.ended) return s;
  if (s.cycle) return { ...s, ended: true, event: { kind: 'deadlock', cycle: s.cycle } };
  const n = s.programs.length;
  if (s.programs.every((_, t) => finished(s, t))) return { ...s, ended: true, event: { kind: 'finished' } };

  let k = s.k;
  while (k < s.schedule.length && finished(s, s.schedule[k]!)) k++;
  let t: number;
  if (k < s.schedule.length) t = s.schedule[k++]!;
  else {
    // round robin over threads that can make progress or have not yet tried their acquire
    const canGo = (i: number) => {
      if (finished(s, i)) return false;
      const op = s.programs[i]!.ops[s.pc[i]!]!;
      return !(op.type === 'acquire' && holderOf(s, op.lock) !== null && s.waiting[i] !== null);
    };
    const order = Array.from({ length: n }, (_, d) => (s.last + 1 + d) % n);
    t = order.find(canGo) ?? order.find((i) => !finished(s, i))!;
  }

  const op = s.programs[t]!.ops[s.pc[t]!]!;
  const li = s.locks.indexOf(op.lock);
  const base = { ...s, k, last: t };

  if (op.type === 'release') {
    const waiters = s.waiting.map((w, i) => (w === op.lock ? i : -1)).filter((i) => i >= 0);
    return { ...base, pc: s.pc.map((p, i) => (i === t ? p + 1 : p)), holder: s.holder.map((h, i) => (i === li ? null : h)), event: { kind: 'release', thread: t, lock: op.lock, waiters } };
  }
  const h = s.holder[li]!;
  if (h === null)
    return {
      ...base,
      pc: s.pc.map((p, i) => (i === t ? p + 1 : p)),
      holder: s.holder.map((x, i) => (i === li ? t : x)),
      waiting: s.waiting.map((w, i) => (i === t ? null : w)),
      event: { kind: 'acquire', thread: t, lock: op.lock },
    };
  const waiting = s.waiting.map((w, i) => (i === t ? op.lock : w));
  return { ...base, waiting, cycle: findCycle(waiting, s, t), event: { kind: 'wait', thread: t, lock: op.lock, holder: h } };
}
