// ArrayCollection as taught in docs/OOD/COLLECTION_1_2n.pdf p.32–41 and p.54–56.
import { VALUE, splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op = { type: 'add' | 'remove' | 'contains'; value: string };

export type Ev =
  | { kind: 'init' }
  | { kind: 'expand'; from: number; to: number }
  | { kind: 'add'; value: string; index: number }
  | { kind: 'compare'; op: 'remove' | 'contains'; value: string; index: number; match: boolean }
  | { kind: 'notFound'; op: 'remove' | 'contains'; value: string }
  | { kind: 'removed'; value: string; index: number; moved: string | null; last: number };

export interface State {
  ops: readonly Op[];
  pc: number;
  data: readonly (string | null)[];
  size: number;
  /** Next slot indexOf will compare, while a remove/contains is in progress. */
  scan: number | null;
  /** Slot found by indexOf that remove still has to overwrite. */
  hit: number | null;
  event: Ev;
  output: readonly string[];
}

export const MAX_OPS = 12;

export function init(ops: readonly Op[], capacity: number): State {
  return {
    ops,
    pc: 0,
    data: Array.from({ length: capacity }, () => null),
    size: 0,
    scan: null,
    hit: null,
    event: { kind: 'init' },
    output: [],
  };
}

export const isDone = (s: State) => s.pc >= s.ops.length;

/** Pure. indexOf advances one comparison per step so the linear search is visible. */
export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;

  if (op.type === 'add') {
    if (s.size === s.data.length) {
      const to = Math.max(s.size + 1, 2 * s.data.length);
      return { ...s, data: [...s.data, ...Array.from({ length: to - s.data.length }, () => null)], event: { kind: 'expand', from: s.data.length, to } };
    }
    return {
      ...s,
      pc: s.pc + 1,
      data: s.data.map((v, i) => (i === s.size ? op.value : v)),
      size: s.size + 1,
      event: { kind: 'add', value: op.value, index: s.size },
    };
  }

  // remove: second half, after indexOf found the slot
  if (s.hit !== null) {
    const last = s.size - 1;
    const moved = s.hit === last ? null : (s.data[last] as string);
    const data = s.data.map((v, i) => (i === last ? null : i === s.hit ? s.data[last] ?? null : v));
    return { ...s, pc: s.pc + 1, data, size: last, hit: null, scan: null, event: { kind: 'removed', value: op.value, index: s.hit, moved, last } };
  }

  const i = s.scan ?? 0;
  if (i >= s.size) {
    return {
      ...s,
      pc: s.pc + 1,
      scan: null,
      event: { kind: 'notFound', op: op.type, value: op.value },
      output: op.type === 'contains' ? [...s.output, `contains(${op.value}) = false`] : s.output,
    };
  }
  const match = s.data[i] === op.value;
  const event: Ev = { kind: 'compare', op: op.type, value: op.value, index: i, match };
  if (!match) return { ...s, scan: i + 1, event };
  if (op.type === 'contains') return { ...s, pc: s.pc + 1, scan: null, event, output: [...s.output, `contains(${op.value}) = true`] };
  return { ...s, hit: i, event };
}

export const formatOp = (op: Op) => `${op.type} ${op.value}`;

export function parse(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น add A, remove A' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  const ops: Op[] = [];
  for (const token of tokens) {
    const m = new RegExp(`^(add|remove|contains)\\s+(${VALUE}{1,4})$`, 'iu').exec(token);
    if (!m) return { error: `ไม่เข้าใจ "${token}" — ใช้ได้แค่ add, remove, contains ตามด้วยค่ายาวไม่เกิน 4 ตัวอักษร` };
    ops.push({ type: m[1]!.toLowerCase() as Op['type'], value: m[2]! });
  }
  return { value: ops };
}

const ADD = [
  'public void add(Object e) {',
  '  ensureCapacity(size + 1);',
  '  elementData[size++] = e;',
  '}',
  'private void ensureCapacity(int capacity) {',
  '  if (capacity > elementData.length) {',
  '    int s = Math.max(capacity, 2 * elementData.length);',
  '    Object[] arr = new Object[s];',
  '    for (int i = 0; i < size; i++) arr[i] = elementData[i];',
  '    elementData = arr;',
  '  }',
  '}',
] as const;

const SEARCH = [
  'private int indexOf(Object e) {',
  '  for (int i = 0; i < size; i++)',
  '    if (elementData[i].equals(e)) return i;',
  '  return -1;',
  '}',
  'public boolean contains(Object e) {',
  '  return indexOf(e) != -1;',
  '}',
  'public void remove(Object e) {',
  '  int i = indexOf(e);',
  '  if (i != -1) {',
  '    elementData[i] = elementData[--size];',
  '    elementData[size] = null;',
  '  }',
  '}',
] as const;

export function codeFor(event: Ev): { lines: readonly string[]; active: number[] } {
  switch (event.kind) {
    case 'init':
      return { lines: ADD, active: [] };
    case 'expand':
      return { lines: ADD, active: [1, 5, 6, 7, 8, 9] };
    case 'add':
      return { lines: ADD, active: [2] };
    case 'compare':
      return { lines: SEARCH, active: event.match ? [2] : [1, 2] };
    case 'notFound':
      return { lines: SEARCH, active: event.op === 'contains' ? [3, 6] : [3, 9, 10] };
    case 'removed':
      return { lines: SEARCH, active: [11, 12] };
  }
}
