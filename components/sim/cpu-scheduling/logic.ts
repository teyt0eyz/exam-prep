// Uniprocessor scheduling: docs/OS/06-scheduling_v5 (1).pdf p.5–13.
// SJF follows the slides: "shortest remaining amount of work" (preemptive, aka SRTF).
import { splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Policy = 'fifo' | 'sjf' | 'rr';
export interface Task {
  name: string;
  arrival: number;
  length: number;
}
export interface Segment {
  task: number;
  from: number;
  to: number;
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'idle'; from: number; to: number }
  | {
      kind: 'run';
      task: number;
      from: number;
      to: number;
      /** Ready tasks (including the chosen one) when the choice was made. */
      ready: readonly number[];
      remainingBefore: number;
      outcome: 'finished' | 'quantum' | 'preempted';
      /** Task whose arrival forced a new decision (SJF). */
      arrived: readonly number[];
    };

export interface State {
  tasks: readonly Task[];
  policy: Policy;
  quantum: number;
  time: number;
  remaining: readonly number[];
  /** Ready queue in arrival order (FIFO, RR); SJF picks from it by remaining work. */
  queue: readonly number[];
  /** Tasks that have not arrived yet. */
  future: readonly number[];
  segments: readonly Segment[];
  finish: readonly (number | null)[];
  event: Ev;
}

export const MAX_TASKS = 6;
export const MAX_TOTAL = 60;

export function parse(text: string): Parsed<Task[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่งานอย่างน้อย 1 งาน เช่น A 0 5' };
  if (tokens.length > MAX_TASKS) return { error: `ใส่ได้ไม่เกิน ${MAX_TASKS} งาน` };
  const tasks: Task[] = [];
  for (const token of tokens) {
    const m = /^([A-Za-z]\w?)\s+(\d+)\s+(\d+)$/.exec(token);
    if (!m) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ ชื่อ เวลามาถึง ความยาว เช่น A 0 5` };
    const name = m[1]!.toUpperCase();
    const arrival = Number(m[2]);
    const length = Number(m[3]);
    if (tasks.some((t) => t.name === name)) return { error: `ชื่องาน ${name} ซ้ำ` };
    if (length < 1) return { error: `งาน ${name} ต้องยาวอย่างน้อย 1` };
    tasks.push({ name, arrival, length });
  }
  const end = Math.max(...tasks.map((t) => t.arrival)) + tasks.reduce((a, t) => a + t.length, 0);
  if (end > MAX_TOTAL) return { error: `เวลารวมยาวเกินไป (เกิน ${MAX_TOTAL}) ลดความยาวหรือเวลามาถึง` };
  return { value: tasks };
}

const byArrival = (tasks: readonly Task[]) => (a: number, b: number) => tasks[a]!.arrival - tasks[b]!.arrival || a - b;

export function init(tasks: readonly Task[], policy: Policy, quantum: number): State {
  const order = tasks.map((_, i) => i).sort(byArrival(tasks));
  return {
    tasks,
    policy,
    quantum,
    time: 0,
    remaining: tasks.map((t) => t.length),
    queue: order.filter((i) => tasks[i]!.arrival === 0),
    future: order.filter((i) => tasks[i]!.arrival > 0),
    segments: [],
    finish: tasks.map(() => null),
    event: { kind: 'init' },
  };
}

export const isDone = (s: State) => s.remaining.every((r) => r === 0);

export function step(s: State): State {
  if (isDone(s)) return s;
  const { tasks } = s;

  if (s.queue.length === 0) {
    const to = tasks[s.future[0]!]!.arrival;
    return {
      ...s,
      time: to,
      queue: s.future.filter((i) => tasks[i]!.arrival <= to),
      future: s.future.filter((i) => tasks[i]!.arrival > to),
      event: { kind: 'idle', from: s.time, to },
    };
  }

  const ready = s.queue;
  // FIFO and RR take the head of the queue; SJF takes the least remaining work (ties: earlier in queue).
  const task =
    s.policy === 'sjf' ? ready.reduce((best, i) => (s.remaining[i]! < s.remaining[best]! ? i : best), ready[0]!) : ready[0]!;
  const left = s.remaining[task]!;
  const nextArrival = s.future.length > 0 ? tasks[s.future[0]!]!.arrival : Infinity;

  let run = left;
  let outcome: 'finished' | 'quantum' | 'preempted' = 'finished';
  if (s.policy === 'rr' && s.quantum < left) {
    run = s.quantum;
    outcome = 'quantum';
  } else if (s.policy === 'sjf' && nextArrival - s.time < left) {
    // a new arrival may have less remaining work: stop and decide again
    run = nextArrival - s.time;
    outcome = 'preempted';
  }

  const to = s.time + run;
  const arrived = s.future.filter((i) => tasks[i]!.arrival <= to);
  const rest = ready.filter((i) => i !== task);
  let queue: number[];
  if (outcome === 'finished') queue = [...rest, ...arrived];
  // RR: tasks that arrived during the slice line up ahead of the task that just used its quantum
  else if (outcome === 'quantum') queue = [...rest, ...arrived, task];
  // SJF: order in the queue does not matter for the choice; keep arrival order
  else queue = [...ready, ...arrived];

  return {
    ...s,
    time: to,
    remaining: s.remaining.map((r, i) => (i === task ? r - run : r)),
    queue,
    future: s.future.filter((i) => tasks[i]!.arrival > to),
    segments: [...s.segments, { task, from: s.time, to }],
    finish: s.finish.map((f, i) => (i === task && outcome === 'finished' ? to : f)),
    event: { kind: 'run', task, from: s.time, to, ready, remainingBefore: left, outcome, arrived },
  };
}

/** Response time as the slides define it: how long the task takes to complete, from arrival. */
export const responseTime = (s: State, i: number) => (s.finish[i] === null ? null : s.finish[i]! - s.tasks[i]!.arrival);

export function averageResponse(s: State): number | null {
  if (!isDone(s)) return null;
  return s.tasks.reduce((a, _, i) => a + responseTime(s, i)!, 0) / s.tasks.length;
}
