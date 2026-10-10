// LinkedList = circular doubly linked list with a header node: docs/OOD/LIST_4.pdf p.28–53.
import { VALUE, splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op =
  | { type: 'add'; index: number | null; value: string }
  | { type: 'addFirst'; value: string }
  | { type: 'remove'; index: number }
  | { type: 'removeLast' };

export type Ev =
  | { kind: 'init' }
  | { kind: 'locate'; mode: 'add' | 'remove'; qi: number; walk: number; call: string }
  | { kind: 'create'; qi: number; value: string }
  | { kind: 'link'; qi: number; value: string }
  | { kind: 'bypass'; qi: number; value: string }
  | { kind: 'bad'; call: string; reason: string };

export interface State {
  ops: readonly Op[];
  pc: number;
  items: readonly string[];
  /** 0 = op not started, 1 = q located, 2 = x created (add only). */
  phase: 0 | 1 | 2;
  event: Ev;
}

export const MAX_OPS = 12;
export const MAX_NODES = 5;

export const init = (ops: readonly Op[]): State => ({ ops, pc: 0, items: [], phase: 0, event: { kind: 'init' } });
export const isDone = (s: State) => s.pc >= s.ops.length;

/** Index of q for an op: where addBefore inserts, or which node removeNode deletes. items.length = the header. */
function target(op: Op, n: number): { mode: 'add' | 'remove'; qi: number; call: string; value: string } | { bad: string; call: string } {
  switch (op.type) {
    case 'add': {
      const qi = op.index ?? n;
      const call = op.index === null ? `add(${op.value})` : `add(${op.index}, ${op.value})`;
      return qi > n ? { bad: `index ต้องอยู่ในช่วง 0 ถึง ${n}`, call } : { mode: 'add', qi, call, value: op.value };
    }
    case 'addFirst':
      return { mode: 'add', qi: 0, call: `addFirst(${op.value})`, value: op.value };
    case 'remove':
      return op.index >= n ? { bad: n === 0 ? 'รายการว่าง' : `index ต้องอยู่ในช่วง 0 ถึง ${n - 1}`, call: `remove(${op.index})` } : { mode: 'remove', qi: op.index, call: `remove(${op.index})`, value: '' };
    case 'removeLast':
      return n === 0 ? { bad: 'รายการว่าง จึง throw IllegalStateException', call: 'removeLast()' } : { mode: 'remove', qi: n - 1, call: 'removeLast()', value: '' };
  }
}

export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;
  const n = s.items.length;
  const t = target(op, n);
  if ('bad' in t) return { ...s, pc: s.pc + 1, phase: 0, event: { kind: 'bad', call: t.call, reason: t.bad } };

  if (s.phase === 0) {
    // add(e), addFirst and removeLast reach q straight from the header; add(i, e) and remove(i) walk with nodeAt(i)
    const direct = (op.type === 'add' && op.index === null) || op.type === 'addFirst' || op.type === 'removeLast';
    return { ...s, phase: 1, event: { kind: 'locate', mode: t.mode, qi: t.qi, walk: direct ? 0 : t.qi + 1, call: t.call } };
  }
  if (t.mode === 'add') {
    if (s.phase === 1) return { ...s, phase: 2, event: { kind: 'create', qi: t.qi, value: t.value } };
    const items = [...s.items.slice(0, t.qi), t.value, ...s.items.slice(t.qi)];
    return { ...s, pc: s.pc + 1, phase: 0, items, event: { kind: 'link', qi: t.qi, value: t.value } };
  }
  return { ...s, pc: s.pc + 1, phase: 0, items: s.items.filter((_, i) => i !== t.qi), event: { kind: 'bypass', qi: t.qi, value: s.items[t.qi] as string } };
}

export function formatOp(op: Op): string {
  switch (op.type) {
    case 'add':
      return op.index === null ? `add ${op.value}` : `add ${op.index} ${op.value}`;
    case 'addFirst':
      return `addFirst ${op.value}`;
    case 'remove':
      return `remove ${op.index}`;
    case 'removeLast':
      return 'removeLast';
  }
}

export function parse(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น add A, add 0 B' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  const ops: Op[] = [];
  let live = 0;
  const v = `(${VALUE}{1,3})`;
  for (const token of tokens) {
    let m: RegExpExecArray | null;
    if ((m = new RegExp(`^add\\s+(\\d{1,2})\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'add', index: Number(m[1]), value: m[2]! });
    else if ((m = new RegExp(`^addFirst\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'addFirst', value: m[1]! });
    else if ((m = new RegExp(`^add\\s+${v}$`, 'iu').exec(token))) ops.push({ type: 'add', index: null, value: m[1]! });
    else if ((m = /^remove\s+(\d{1,2})$/i.exec(token))) ops.push({ type: 'remove', index: Number(m[1]) });
    else if (/^removeLast$/i.test(token)) ops.push({ type: 'removeLast' });
    else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้: add <ค่า>, add <i> <ค่า>, addFirst <ค่า>, remove <i>, removeLast` };
    const last = ops.at(-1)!;
    if (last.type === 'add' || last.type === 'addFirst') live += 1;
    else live = Math.max(0, live - 1);
    if (live > MAX_NODES) return { error: `มีข้อมูลพร้อมกันได้ไม่เกิน ${MAX_NODES} ตัว (พื้นที่วาดจำกัด)` };
  }
  return { value: ops };
}

const ADD = [
  'private void addBefore(LinkedNode q, Object e) {',
  '  LinkedNode p = q.prev;',
  '  LinkedNode x = new LinkedNode(e, p, q);',
  '  p.next = q.prev = x;',
  '  ++size;',
  '}',
] as const;
const REMOVE = [
  'private void removeNode(LinkedNode q) {',
  '  LinkedNode p = q.prev;',
  '  LinkedNode x = q.next;',
  '  p.next = x;',
  '  x.prev = p;',
  '  --size;',
  '}',
] as const;

export function codeFor(e: Ev): { lines: readonly string[]; active: number[] } {
  switch (e.kind) {
    case 'init':
      return { lines: ADD, active: [] };
    case 'locate':
      return e.mode === 'add' ? { lines: ADD, active: [0, 1] } : { lines: REMOVE, active: [0, 1, 2] };
    case 'create':
      return { lines: ADD, active: [2] };
    case 'link':
      return { lines: ADD, active: [3, 4] };
    case 'bypass':
      return { lines: REMOVE, active: [3, 4, 5] };
    case 'bad':
      return { lines: e.call.startsWith('remove') ? REMOVE : ADD, active: [] };
  }
}
