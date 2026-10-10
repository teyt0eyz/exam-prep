// Multi-level Feedback Queue: docs/OS/06-scheduling_v5 (1).pdf p.17–19.
// Rules from the slides: a set of Round Robin queues, each with its own priority; high priority
// queues have short time slices; the scheduler picks the first thread in the highest priority
// queue; tasks start in the highest priority queue; if the time slice expires the task drops one level.
import { splitOps, type Parsed } from '@/components/sim/core/inputs';

export interface Task {
  name: string;
  /** Total CPU time needed. */
  length: number;
  /** CPU time between I/O requests; 0 = compute-bound (never does I/O). */
  burst: number;
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'idle'; from: number; to: number; woke: readonly number[] }
  | {
      kind: 'run';
      task: number;
      level: number;
      from: number;
      to: number;
      outcome: 'finished' | 'io' | 'expired' | 'preempted';
      /** Level after the run. */
      newLevel: number;
      woke: readonly number[];
      by?: number;
    };

export interface State {
  tasks: readonly Task[];
  slices: readonly number[];
  ioTime: number;
  time: number;
  remaining: readonly number[];
  level: readonly number[];
  /** CPU time used out of the current time slice. */
  used: readonly number[];
  /** CPU time left before the next I/O request. */
  burstLeft: readonly number[];
  queues: readonly (readonly number[])[];
  blocked: readonly { task: number; until: number }[];
  finish: readonly (number | null)[];
  segments: readonly { task: number; from: number; to: number; level: number }[];
  event: Ev;
}

export const MAX_TASKS = 5;
export const MAX_LENGTH = 400;

export function parse(text: string): Parsed<Task[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่งานอย่างน้อย 1 งาน เช่น A 200' };
  if (tokens.length > MAX_TASKS) return { error: `ใส่ได้ไม่เกิน ${MAX_TASKS} งาน` };
  const tasks: Task[] = [];
  for (const token of tokens) {
    const m = /^([A-Za-z]\w?)\s+(\d+)(?:\s+(\d+))?$/.exec(token);
    if (!m) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ ชื่อ เวลาCPUรวม [เวลาCPUก่อนทำ I/O] เช่น A 200 หรือ B 30 5` };
    const name = m[1]!.toUpperCase();
    const length = Number(m[2]);
    const burst = m[3] ? Number(m[3]) : 0;
    if (tasks.some((t) => t.name === name)) return { error: `ชื่องาน ${name} ซ้ำ` };
    if (length < 1 || length > MAX_LENGTH) return { error: `งาน ${name}: เวลา CPU รวมต้องอยู่ระหว่าง 1 ถึง ${MAX_LENGTH}` };
    if (m[3] && burst < 1) return { error: `งาน ${name}: เวลา CPU ก่อนทำ I/O ต้องอย่างน้อย 1` };
    tasks.push({ name, length, burst });
  }
  return { value: tasks };
}

export function parseSlices(text: string): Parsed<number[]> {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return { error: 'ใส่ time slice 2–4 ระดับ เช่น 10, 20, 40, 80' };
  const slices = parts.map(Number);
  if (slices.some((n) => !Number.isInteger(n) || n < 1 || n > 200)) return { error: 'time slice ต้องเป็นจำนวนเต็ม 1–200' };
  return { value: slices };
}

export function init(tasks: readonly Task[], slices: readonly number[], ioTime: number): State {
  return {
    tasks,
    slices,
    ioTime,
    time: 0,
    remaining: tasks.map((t) => t.length),
    level: tasks.map(() => 0),
    used: tasks.map(() => 0),
    burstLeft: tasks.map((t) => t.burst || Infinity),
    // every task starts in the highest priority queue
    queues: slices.map((_, q) => (q === 0 ? tasks.map((_, i) => i) : [])),
    blocked: [],
    finish: tasks.map(() => null),
    segments: [],
    event: { kind: 'init' },
  };
}

export const isDone = (s: State) => s.remaining.every((r) => r === 0);

const set = <T,>(a: readonly T[], i: number, v: T) => a.map((x, k) => (k === i ? v : x));

export function step(s: State): State {
  if (isDone(s)) return s;
  const top = s.queues.findIndex((q) => q.length > 0);

  if (top === -1) {
    // everything is waiting for I/O: jump to the first completion
    const to = Math.min(...s.blocked.map((b) => b.until));
    const woke = s.blocked.filter((b) => b.until <= to).map((b) => b.task);
    return {
      ...s,
      time: to,
      queues: s.queues.map((q, lv) => [...q, ...woke.filter((t) => s.level[t] === lv)]),
      blocked: s.blocked.filter((b) => b.until > to),
      event: { kind: 'idle', from: s.time, to, woke },
    };
  }

  const task = s.queues[top]![0]!;
  const slice = s.slices[top]!;
  const natural = Math.min(slice - s.used[task]!, s.remaining[task]!, s.burstLeft[task]!);
  // a task finishing I/O at a higher priority level preempts the running task
  const higher = s.blocked.filter((b) => s.level[b.task]! < top && b.until < s.time + natural);
  const cut = higher.length > 0 ? Math.min(...higher.map((b) => b.until)) : Infinity;
  const run = Math.max(Math.min(natural, cut - s.time), 0);
  const to = s.time + run;

  const remaining = set(s.remaining, task, s.remaining[task]! - run);
  let used = set(s.used, task, s.used[task]! + run);
  let burstLeft = set(s.burstLeft, task, s.burstLeft[task]! - run);
  let level = s.level;
  let blocked = s.blocked;
  let finish = s.finish;
  let queues = s.queues.map((q, lv) => (lv === top ? q.slice(1) : q));
  let outcome: 'finished' | 'io' | 'expired' | 'preempted';
  let newLevel = top;

  const woke = blocked.filter((b) => b.until <= to).map((b) => b.task);
  blocked = blocked.filter((b) => b.until > to);
  const enqueue = (t: number, lv: number, front = false) => {
    queues = queues.map((q, k) => (k === lv ? (front ? [t, ...q] : [...q, t]) : q));
  };

  if (remaining[task] === 0) {
    outcome = 'finished';
    finish = set(finish, task, to);
  } else if (burstLeft[task] === 0) {
    // gave up the processor before the slice ran out: stays at the same level
    outcome = 'io';
    blocked = [...blocked, { task, until: to + s.ioTime }];
    used = set(used, task, 0);
    burstLeft = set(burstLeft, task, s.tasks[task]!.burst);
  } else if (used[task]! >= slice) {
    outcome = 'expired';
    newLevel = Math.min(top + 1, s.slices.length - 1);
    level = set(level, task, newLevel);
    used = set(used, task, 0);
  } else {
    outcome = 'preempted';
  }

  for (const t of woke) enqueue(t, level[t]!);
  if (outcome === 'expired') enqueue(task, newLevel);
  if (outcome === 'preempted') enqueue(task, top, true);

  return {
    ...s,
    time: to,
    remaining,
    used,
    burstLeft,
    level,
    blocked,
    finish,
    queues,
    segments: run > 0 ? [...s.segments, { task, from: s.time, to, level: top }] : s.segments,
    event: { kind: 'run', task, level: top, from: s.time, to, outcome, newLevel, woke, by: outcome === 'preempted' ? woke[0] : undefined },
  };
}
