// BinaryHeap (max heap in an array): docs/OOD/QUEUE_7.pdf p.14–39.
import { splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op = { type: 'enqueue'; value: number } | { type: 'dequeue' };
export interface Program {
  /** Starting array. `build` = arbitrary data that still has to be turned into a heap. */
  start: readonly number[];
  build: boolean;
  ops: readonly Op[];
}

export type Ev =
  | { kind: 'init'; build: boolean }
  | { kind: 'leaves'; from: number; count: number }
  | { kind: 'append'; value: number; k: number }
  | { kind: 'swapUp'; k: number; p: number; child: number; parent: number }
  | { kind: 'settledUp'; k: number; atRoot: boolean; value: number; parent: number | null }
  | { kind: 'takeRoot'; max: number; moved: number | null }
  | { kind: 'swapDown'; k: number; c: number; parent: number; child: number; other: number | null }
  | { kind: 'settledDown'; k: number; leaf: boolean; value: number; building: boolean }
  | { kind: 'empty' };

type Task = { kind: 'up'; k: number } | { kind: 'down'; k: number } | null;

export interface State {
  ops: readonly Op[];
  pc: number;
  data: readonly number[];
  /** Next index the build loop will call fixDown on; -1 when the build is finished or not needed. */
  buildAt: number;
  task: Task;
  event: Ev;
  output: readonly string[];
}

export const MAX_NODES = 15;
export const MAX_OPS = 10;

export const init = (p: Program): State => ({
  ops: p.ops,
  pc: 0,
  data: p.start,
  buildAt: p.build ? p.start.length - 1 : -1,
  task: null,
  event: { kind: 'init', build: p.build },
  output: [],
});

export const isDone = (s: State) => s.buildAt < 0 && s.task === null && s.pc >= s.ops.length;
const swap = (d: readonly number[], i: number, j: number) => d.map((v, k) => (k === i ? (d[j] as number) : k === j ? (d[i] as number) : v));

function fixDownStep(s: State, k: number, building: boolean): State {
  const d = s.data;
  let c = 2 * k + 1;
  const finish = (leaf: boolean): State => ({
    ...s,
    task: null,
    buildAt: building ? s.buildAt - 1 : s.buildAt,
    pc: building ? s.pc : s.pc + 1,
    event: { kind: 'settledDown', k, leaf, value: d[k] as number, building },
  });
  if (c >= d.length) return finish(true);
  const other = c + 1 < d.length ? c + 1 : null;
  if (other !== null && (d[other] as number) > (d[c] as number)) c = other;
  if (!((d[c] as number) > (d[k] as number))) return finish(false);
  const sibling = c === 2 * k + 1 ? other : 2 * k + 1;
  return { ...s, data: swap(d, k, c), task: { kind: 'down', k: c }, event: { kind: 'swapDown', k, c, parent: d[k] as number, child: d[c] as number, other: sibling === null ? null : (d[sibling] as number) } };
}

export function step(s: State): State {
  const d = s.data;

  if (s.task?.kind === 'up') {
    const k = s.task.k;
    const p = Math.floor((k - 1) / 2);
    if (k === 0 || !((d[k] as number) > (d[p] as number)))
      return { ...s, task: null, pc: s.pc + 1, event: { kind: 'settledUp', k, atRoot: k === 0, value: d[k] as number, parent: k === 0 ? null : (d[p] as number) } };
    return { ...s, data: swap(d, k, p), task: { kind: 'up', k: p }, event: { kind: 'swapUp', k, p, child: d[k] as number, parent: d[p] as number } };
  }
  if (s.task?.kind === 'down') return fixDownStep(s, s.task.k, s.buildAt >= 0);

  if (s.buildAt >= 0) {
    // Leaves have no children, so fixDown returns at once: skip them all in a single step.
    const firstLeaf = Math.floor(d.length / 2);
    if (s.buildAt >= firstLeaf && s.event.kind === 'init')
      return { ...s, buildAt: firstLeaf - 1, event: { kind: 'leaves', from: firstLeaf, count: d.length - firstLeaf } };
    return fixDownStep(s, s.buildAt, true);
  }

  const op = s.ops[s.pc];
  if (!op) return s;
  if (op.type === 'enqueue') return { ...s, data: [...d, op.value], task: { kind: 'up', k: d.length }, event: { kind: 'append', value: op.value, k: d.length } };

  if (d.length === 0) return { ...s, pc: s.pc + 1, event: { kind: 'empty' }, output: [...s.output, 'dequeue() → NoSuchElementException'] };
  const max = d[0] as number;
  const output = [...s.output, `dequeue() = ${max}`];
  if (d.length === 1) return { ...s, data: [], pc: s.pc + 1, event: { kind: 'takeRoot', max, moved: null }, output };
  const moved = d[d.length - 1] as number;
  const data = [moved, ...d.slice(1, -1)];
  // if (size > 1) fixDown(0)
  return data.length > 1
    ? { ...s, data, task: { kind: 'down', k: 0 }, event: { kind: 'takeRoot', max, moved }, output }
    : { ...s, data, pc: s.pc + 1, event: { kind: 'takeRoot', max, moved }, output };
}

export const formatOp = (op: Op) => (op.type === 'enqueue' ? `enqueue ${op.value}` : 'dequeue');
export const isHeap = (d: readonly number[]) => d.every((v, k) => k === 0 || (d[Math.floor((k - 1) / 2)] as number) >= v);

export function parse(text: string): Parsed<Program> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น enqueue 5, dequeue' };
  let start: number[] = [];
  let build = false;
  const ops: Op[] = [];
  let size = 0;
  for (const [i, token] of tokens.entries()) {
    const head = /^(heap|build)\s+((?:\d{1,2}\s*)+)$/i.exec(token);
    if (head) {
      if (i !== 0) return { error: `"${head[1]}" ต้องเป็นคำสั่งแรกเท่านั้น` };
      start = head[2]!.trim().split(/\s+/).map(Number);
      build = head[1]!.toLowerCase() === 'build';
      if (!build && !isHeap(start)) return { error: 'ข้อมูลหลัง "heap" ยังไม่เป็น max heap (มีลูกที่มากกว่าพ่อ) — ใช้ "build" แทนเพื่อให้ปรับให้' };
      size = start.length;
    } else {
      const m = /^enqueue\s+(\d{1,2})$/i.exec(token);
      if (m) {
        ops.push({ type: 'enqueue', value: Number(m[1]) });
        size += 1;
      } else if (/^dequeue$/i.test(token)) {
        ops.push({ type: 'dequeue' });
        size = Math.max(0, size - 1);
      } else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้: heap <เลข...>, build <เลข...>, enqueue <เลข 0–99>, dequeue` };
    }
    if (size > MAX_NODES) return { error: `มีข้อมูลพร้อมกันได้ไม่เกิน ${MAX_NODES} ตัว` };
  }
  if (ops.length > MAX_OPS) return { error: `enqueue/dequeue ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  return { value: { start, build, ops } };
}

const ENQUEUE = [
  'public void enqueue(Object e) {',
  '  ensureCapacity(size + 1);',
  '  elementData[size] = e;',
  '  fixUp(size++);',
  '}',
  'private void fixUp(int k) {',
  '  while (k > 0) {',
  '    int p = (k - 1) / 2;',
  '    if (!greaterThan(k, p)) break;',
  '    swap(k, p);',
  '    k = p;',
  '  }',
  '}',
] as const;
const DEQUEUE = [
  'public Object dequeue() {',
  '  Object max = peek();',
  '  elementData[0] = elementData[--size];',
  '  elementData[size] = null;',
  '  if (size > 1) fixDown(0);',
  '  return max;',
  '}',
  'private void fixDown(int k) {',
  '  int c;',
  '  while ((c = 2 * k + 1) < size) {',
  '    if (c + 1 < size && greaterThan(c + 1, c)) c++;',
  '    if (!greaterThan(c, k)) break;',
  '    swap(k, c);',
  '    k = c;',
  '  }',
  '}',
] as const;
const BUILD = [
  'public BinaryHeap(Object[] d) {',
  '  elementData = (Object[]) d.clone();',
  '  size = d.length;',
  '  for (int i = size - 1; i >= 0; i--) fixDown(i);',
  '}',
  ...DEQUEUE.slice(7),
] as const;

export function codeFor(s: State): { lines: readonly string[]; active: number[] } {
  const e = s.event;
  const building = e.kind === 'leaves' || (e.kind === 'init' && e.build) || s.buildAt >= 0 || (e.kind === 'settledDown' && e.building);
  const down = building ? BUILD : DEQUEUE;
  const off = building ? -2 : 0; // fixDown starts 2 lines earlier in BUILD
  switch (e.kind) {
    case 'init':
      return e.build ? { lines: BUILD, active: [1, 2] } : { lines: ENQUEUE, active: [] };
    case 'leaves':
      return { lines: BUILD, active: [3, 7] };
    case 'append':
      return { lines: ENQUEUE, active: [2, 3] };
    case 'swapUp':
      return { lines: ENQUEUE, active: [7, 9, 10] };
    case 'settledUp':
      return { lines: ENQUEUE, active: e.atRoot ? [6] : [8] };
    case 'takeRoot':
      return { lines: DEQUEUE, active: [1, 2, 3, 4] };
    case 'swapDown':
      return { lines: down, active: [10 + off, 12 + off, 13 + off] };
    case 'settledDown':
      return { lines: down, active: e.leaf ? [9 + off] : [11 + off] };
    case 'empty':
      return { lines: DEQUEUE, active: [1] };
  }
}
