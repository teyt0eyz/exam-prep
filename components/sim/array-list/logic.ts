// ArrayList: docs/OOD/LIST_4.pdf p.8–16.
import { VALUE, splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op =
  | { type: 'add'; index: number | null; value: string }
  | { type: 'set'; index: number; value: string }
  | { type: 'remove'; index: number }
  | { type: 'get'; index: number };

export type Ev =
  | { kind: 'init' }
  | { kind: 'shiftRight'; from: number; to: number; value: string }
  | { kind: 'insert'; index: number; value: string; moves: number }
  | { kind: 'shiftLeft'; from: number; to: number; value: string }
  | { kind: 'removed'; index: number; value: string; moves: number }
  | { kind: 'set'; index: number; value: string; old: string }
  | { kind: 'get'; index: number; value: string }
  | { kind: 'badIndex'; op: string; index: number; range: string };

export interface State {
  ops: readonly Op[];
  pc: number;
  data: readonly (string | null)[];
  size: number;
  /** Loop variable i of the shift in progress. */
  cursor: number | null;
  /** Moves made so far by the current add/remove. */
  moves: number;
  /** Value being removed, kept until the shift finishes. */
  held: string | null;
  event: Ev;
  output: readonly string[];
}

export const CAPACITY = 8;
export const MAX_OPS = 12;

export function init(ops: readonly Op[]): State {
  return { ops, pc: 0, data: Array.from({ length: CAPACITY }, () => null), size: 0, cursor: null, moves: 0, held: null, event: { kind: 'init' }, output: [] };
}

export const isDone = (s: State) => s.pc >= s.ops.length;
const put = (data: readonly (string | null)[], i: number, v: string | null) => data.map((x, k) => (k === i ? v : x));

export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;
  const done = { pc: s.pc + 1, cursor: null, moves: 0, held: null };

  if (op.type === 'add') {
    const index = op.index ?? s.size;
    if (index < 0 || index > s.size)
      return { ...s, ...done, event: { kind: 'badIndex', op: `add(${index}, ${op.value})`, index, range: `0 ถึง ${s.size}` } };
    const i = s.cursor ?? s.size;
    if (i > index) {
      const value = s.data[i - 1] as string;
      return { ...s, data: put(s.data, i, value), cursor: i - 1, moves: s.moves + 1, event: { kind: 'shiftRight', from: i - 1, to: i, value } };
    }
    return { ...s, ...done, data: put(s.data, index, op.value), size: s.size + 1, event: { kind: 'insert', index, value: op.value, moves: s.moves } };
  }

  const bad = op.index < 0 || op.index >= s.size;
  if (bad)
    return { ...s, ...done, event: { kind: 'badIndex', op: `${op.type}(${op.index}${op.type === 'set' ? `, ${op.value}` : ''})`, index: op.index, range: s.size === 0 ? 'ไม่มี (รายการว่าง)' : `0 ถึง ${s.size - 1}` } };

  if (op.type === 'get') {
    const value = s.data[op.index] as string;
    return { ...s, ...done, event: { kind: 'get', index: op.index, value }, output: [...s.output, `get(${op.index}) = ${value}`] };
  }
  if (op.type === 'set') {
    const old = s.data[op.index] as string;
    return { ...s, ...done, data: put(s.data, op.index, op.value), event: { kind: 'set', index: op.index, value: op.value, old } };
  }

  // remove(index): shift left one element per step
  const held = s.held ?? (s.data[op.index] as string);
  const i = s.cursor ?? op.index + 1;
  if (i < s.size) {
    const value = s.data[i] as string;
    return { ...s, data: put(s.data, i - 1, value), cursor: i + 1, moves: s.moves + 1, held, event: { kind: 'shiftLeft', from: i, to: i - 1, value } };
  }
  return { ...s, ...done, data: put(s.data, s.size - 1, null), size: s.size - 1, event: { kind: 'removed', index: op.index, value: held, moves: s.moves } };
}

export function formatOp(op: Op): string {
  if (op.type === 'add') return op.index === null ? `add ${op.value}` : `add ${op.index} ${op.value}`;
  if (op.type === 'set') return `set ${op.index} ${op.value}`;
  return `${op.type} ${op.index}`;
}

export function parse(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น add A, add 0 B' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  const ops: Op[] = [];
  let adds = 0;
  for (const token of tokens) {
    const v = `(${VALUE}{1,3})`;
    let m: RegExpExecArray | null;
    if ((m = new RegExp(`^add\\s+(\\d{1,2})\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'add', index: Number(m[1]), value: m[2]! });
    else if ((m = new RegExp(`^add\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'add', index: null, value: m[1]! });
    else if ((m = new RegExp(`^set\\s+(\\d{1,2})\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'set', index: Number(m[1]), value: m[2]! });
    else if ((m = /^(remove|get)\s+(\d{1,2})$/i.exec(token))) ops.push({ type: m[1]!.toLowerCase() as 'remove' | 'get', index: Number(m[2]) });
    else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้: add <ค่า>, add <i> <ค่า>, set <i> <ค่า>, remove <i>, get <i>` };
    if (ops.at(-1)!.type === 'add' && ++adds > CAPACITY) return { error: `add ได้ไม่เกิน ${CAPACITY} ครั้ง` };
  }
  return { value: ops };
}

const ADD = [
  'public void add(int index, Object e) {',
  '  ensureCapacity(size + 1);',
  '  for (int i = size; i > index; i--)',
  '    elementData[i] = elementData[i - 1];',
  '  elementData[index] = e;',
  '  size++;',
  '}',
] as const;
const REMOVE = [
  'public void remove(int index) {',
  '  for (int i = index + 1; i < size; i++)',
  '    elementData[i - 1] = elementData[i];',
  '  size--;',
  '  elementData[size] = null;',
  '}',
] as const;
const GET_SET = [
  'public Object get(int index) {',
  '  return elementData[index];',
  '}',
  'public void set(int index, Object e) {',
  '  elementData[index] = e;',
  '}',
] as const;

export function codeFor(event: Ev): { lines: readonly string[]; active: number[] } {
  switch (event.kind) {
    case 'init':
      return { lines: ADD, active: [] };
    case 'shiftRight':
      return { lines: ADD, active: [2, 3] };
    case 'insert':
      return { lines: ADD, active: [4, 5] };
    case 'shiftLeft':
      return { lines: REMOVE, active: [1, 2] };
    case 'removed':
      return { lines: REMOVE, active: [3, 4] };
    case 'get':
      return { lines: GET_SET, active: [1] };
    case 'set':
      return { lines: GET_SET, active: [4] };
    case 'badIndex':
      return { lines: event.op.startsWith('add') ? ADD : event.op.startsWith('remove') ? REMOVE : GET_SET, active: [0] };
  }
}
