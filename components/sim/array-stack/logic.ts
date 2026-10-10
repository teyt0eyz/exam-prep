// ArrayStack as taught in docs/OOD/STACK_5 (1).pdf p.9–12:
// add/remove at the end of the array, and double the array when it is full.

export type StackOp = { type: 'push'; value: string } | { type: 'pop' } | { type: 'peek' };

export type StackEvent =
  | { kind: 'init' }
  | { kind: 'expand'; from: number; to: number }
  | { kind: 'push'; value: string; index: number }
  | { kind: 'pop'; value: string; index: number }
  | { kind: 'peek'; value: string; index: number }
  | { kind: 'empty'; op: 'pop' | 'peek' };

export interface ArrayStackState {
  ops: readonly StackOp[];
  /** Index of the next operation to run. */
  pc: number;
  /** elementData: slots 0..size-1 hold data, the rest are null. */
  data: readonly (string | null)[];
  size: number;
  event: StackEvent;
  /** Values returned so far, as the test program would print them. */
  output: readonly string[];
}

export const MAX_OPS = 16;
export const MAX_INITIAL_CAPACITY = 8;

export function initArrayStack(ops: readonly StackOp[], capacity: number): ArrayStackState {
  return {
    ops,
    pc: 0,
    data: Array.from({ length: capacity }, () => null),
    size: 0,
    event: { kind: 'init' },
    output: [],
  };
}

export const isDone = (s: ArrayStackState) => s.pc >= s.ops.length;

/** Pure. A push onto a full array takes two steps: expand, then write. */
export function step(s: ArrayStackState): ArrayStackState {
  const op = s.ops[s.pc];
  if (!op) return s;

  if (op.type === 'push') {
    if (s.size === s.data.length) {
      const to = 2 * s.size;
      const data = [...s.data, ...Array.from({ length: to - s.size }, () => null)];
      return { ...s, data, event: { kind: 'expand', from: s.size, to } };
    }
    const data = s.data.map((v, i) => (i === s.size ? op.value : v));
    return {
      ...s,
      pc: s.pc + 1,
      data,
      size: s.size + 1,
      event: { kind: 'push', value: op.value, index: s.size },
    };
  }

  const top = s.size > 0 ? s.data[s.size - 1] : null;
  if (top === null || top === undefined) {
    return {
      ...s,
      pc: s.pc + 1,
      event: { kind: 'empty', op: op.type },
      output: [...s.output, `${op.type}() → NoSuchElementException`],
    };
  }

  if (op.type === 'peek') {
    return {
      ...s,
      pc: s.pc + 1,
      event: { kind: 'peek', value: top, index: s.size - 1 },
      output: [...s.output, `peek() = ${top}`],
    };
  }

  const index = s.size - 1;
  return {
    ...s,
    pc: s.pc + 1,
    data: s.data.map((v, i) => (i === index ? null : v)),
    size: index,
    event: { kind: 'pop', value: top, index },
    output: [...s.output, `pop() = ${top}`],
  };
}

export const formatOp = (op: StackOp) => (op.type === 'push' ? `push ${op.value}` : op.type);
export const formatOps = (ops: readonly StackOp[]) => ops.map(formatOp).join(', ');

/** Parses "push A, push B, pop, peek". Returns ops or a Thai error message. */
export function parseOps(text: string): { ops: StackOp[] } | { error: string } {
  const tokens = text
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น push A, pop' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };

  const ops: StackOp[] = [];
  for (const token of tokens) {
    const push = /^push\s+([A-Za-z0-9]{1,3})$/i.exec(token);
    const word = token.toLowerCase();
    if (push?.[1]) ops.push({ type: 'push', value: push[1] });
    else if (word === 'pop' || word === 'peek') ops.push({ type: word });
    else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้แค่ push <ค่า>, pop, peek (ค่ายาวไม่เกิน 3 ตัวอักษร)` };
  }
  return { ops };
}

/** Source shown next to the simulation (STACK_5 p.11–12), one listing per method. */
const PUSH = [
  'public void push(Object e) {',
  '  if (size == elementData.length) {',
  '    Object[] a = new Object[2 * size];',
  '    for (int i = 0; i < size; i++) a[i] = elementData[i];',
  '    elementData = a;',
  '  }',
  '  elementData[size++] = e;',
  '}',
] as const;

const PEEK_POP = [
  'public Object peek() {',
  '  if (isEmpty()) throw new NoSuchElementException();',
  '  return elementData[size - 1];',
  '}',
  'public Object pop() {',
  '  Object e = peek();',
  '  elementData[--size] = null;',
  '  return e;',
  '}',
] as const;

/** The method the current step ran, and which of its lines. Only that method is shown, to keep the sim short on a phone. */
export function codeFor(event: StackEvent): { lines: readonly string[]; active: number[] } {
  switch (event.kind) {
    case 'init':
      return { lines: PUSH, active: [] };
    case 'expand':
      return { lines: PUSH, active: [1, 2, 3, 4] };
    case 'push':
      return { lines: PUSH, active: [6] };
    case 'peek':
      return { lines: PEEK_POP, active: [2] };
    case 'pop':
      return { lines: PEEK_POP, active: [5, 6, 7] };
    case 'empty':
      return { lines: PEEK_POP, active: event.op === 'pop' ? [5, 1] : [1] };
  }
}
