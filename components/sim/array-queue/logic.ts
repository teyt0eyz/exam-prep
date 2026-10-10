// ArrayQueue on a circular array: docs/OOD/QUEUE_6.pdf p.10–19.
import { VALUE, splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op = { type: 'enqueue'; value: string } | { type: 'dequeue' } | { type: 'peek' };

export type Ev =
  | { kind: 'init' }
  | { kind: 'expand'; from: number; to: number; oldFront: number }
  | { kind: 'enqueue'; value: string; index: number; front: number; size: number; length: number }
  | { kind: 'dequeue'; value: string; index: number; newFront: number; length: number }
  | { kind: 'peek'; value: string; index: number }
  | { kind: 'empty'; op: 'dequeue' | 'peek' };

export interface State {
  ops: readonly Op[];
  pc: number;
  data: readonly (string | null)[];
  front: number;
  size: number;
  event: Ev;
  output: readonly string[];
}

export const MAX_OPS = 14;

export const init = (ops: readonly Op[], capacity: number): State => ({
  ops,
  pc: 0,
  data: Array.from({ length: capacity }, () => null),
  front: 0,
  size: 0,
  event: { kind: 'init' },
  output: [],
});
export const isDone = (s: State) => s.pc >= s.ops.length;

export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;
  const length = s.data.length;

  if (op.type === 'enqueue') {
    if (s.size === length) {
      // copy in queue order starting at front, so the queue starts at index 0 again
      const a: (string | null)[] = Array.from({ length: 2 * length }, () => null);
      for (let i = 0, j = s.front; i < s.size; i++, j = (j + 1) % length) a[i] = s.data[j] ?? null;
      return { ...s, data: a, front: 0, event: { kind: 'expand', from: length, to: 2 * length, oldFront: s.front } };
    }
    const b = (s.front + s.size) % length;
    return {
      ...s,
      pc: s.pc + 1,
      data: s.data.map((v, i) => (i === b ? op.value : v)),
      size: s.size + 1,
      event: { kind: 'enqueue', value: op.value, index: b, front: s.front, size: s.size, length },
    };
  }

  if (s.size === 0)
    return { ...s, pc: s.pc + 1, event: { kind: 'empty', op: op.type }, output: [...s.output, `${op.type}() → NoSuchElementException`] };

  const value = s.data[s.front] as string;
  if (op.type === 'peek')
    return { ...s, pc: s.pc + 1, event: { kind: 'peek', value, index: s.front }, output: [...s.output, `peek() = ${value}`] };

  const newFront = (s.front + 1) % length;
  return {
    ...s,
    pc: s.pc + 1,
    data: s.data.map((v, i) => (i === s.front ? null : v)),
    front: newFront,
    size: s.size - 1,
    event: { kind: 'dequeue', value, index: s.front, newFront, length },
    output: [...s.output, `dequeue() = ${value}`],
  };
}

export const formatOp = (op: Op) => (op.type === 'enqueue' ? `enqueue ${op.value}` : op.type);

export function parse(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น enqueue A, dequeue' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  const ops: Op[] = [];
  let live = 0;
  for (const token of tokens) {
    const m = new RegExp(`^enqueue\\s+(${VALUE}{1,3})$`, 'iu').exec(token);
    const word = token.toLowerCase();
    if (m) {
      ops.push({ type: 'enqueue', value: m[1]! });
      if (++live > 8) return { error: 'มีข้อมูลในคิวพร้อมกันได้ไม่เกิน 8 ตัว (พื้นที่วาดจำกัด)' };
    } else if (word === 'dequeue' || word === 'peek') {
      ops.push({ type: word });
      if (word === 'dequeue') live = Math.max(0, live - 1);
    } else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้แค่ enqueue <ค่า>, dequeue, peek` };
  }
  return { value: ops };
}

const ENQUEUE = [
  'public void enqueue(Object e) {',
  '  if (size == elementData.length) {',
  '    Object[] a = new Object[2 * elementData.length];',
  '    for (int i = 0, j = front; i < size;',
  '         i++, j = (j + 1) % elementData.length)',
  '      a[i] = elementData[j];',
  '    front = 0; elementData = a;',
  '  }',
  '  int b = (front + size) % elementData.length;',
  '  elementData[b] = e; size++;',
  '}',
] as const;
const DEQUEUE = [
  'public Object peek() {',
  '  if (isEmpty()) throw new NoSuchElementException();',
  '  return elementData[front];',
  '}',
  'public Object dequeue() {',
  '  Object e = peek();',
  '  elementData[front] = null;',
  '  front = (front + 1) % elementData.length;',
  '  size--;',
  '  return e;',
  '}',
] as const;

export function codeFor(e: Ev): { lines: readonly string[]; active: number[] } {
  switch (e.kind) {
    case 'init':
      return { lines: ENQUEUE, active: [] };
    case 'expand':
      return { lines: ENQUEUE, active: [1, 2, 3, 4, 5, 6] };
    case 'enqueue':
      return { lines: ENQUEUE, active: [8, 9] };
    case 'peek':
      return { lines: DEQUEUE, active: [2] };
    case 'dequeue':
      return { lines: DEQUEUE, active: [5, 6, 7, 8] };
    case 'empty':
      return { lines: DEQUEUE, active: e.op === 'dequeue' ? [5, 1] : [1] };
  }
}
