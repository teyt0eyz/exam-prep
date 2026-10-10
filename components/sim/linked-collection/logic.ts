// LinkedCollection, with and without a header node: docs/OOD/COLLECTION_3(LINKED).pdf p.9–49.
import { VALUE, splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op = { type: 'add' | 'remove' | 'contains'; value: string };

export type Ev =
  | { kind: 'init' }
  | { kind: 'add'; value: string }
  | { kind: 'visit'; index: number; value: string; match: boolean }
  | { kind: 'notFound'; op: 'remove' | 'contains'; value: string; empty: boolean }
  | { kind: 'removeFirst'; value: string }
  | { kind: 'startP'; value: string }
  | { kind: 'advance'; to: number; value: string }
  | { kind: 'unlink'; p: number; value: string };

export interface State {
  ops: readonly Op[];
  pc: number;
  header: boolean;
  /** Data nodes, first node first. */
  nodes: readonly string[];
  /** contains: node being compared. */
  scan: number | null;
  /** remove: where pointer p is. -1 = the header node. null = not searching. */
  p: number | null;
  event: Ev;
  output: readonly string[];
}

export const MAX_OPS = 12;
export const MAX_NODES = 5;

export function init(ops: readonly Op[], header: boolean): State {
  return { ops, pc: 0, header, nodes: [], scan: null, p: null, event: { kind: 'init' }, output: [] };
}

export const isDone = (s: State) => s.pc >= s.ops.length;

export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;
  const done = { pc: s.pc + 1, scan: null, p: null };

  if (op.type === 'add') return { ...s, ...done, nodes: [op.value, ...s.nodes], event: { kind: 'add', value: op.value } };

  if (op.type === 'contains') {
    const i = s.scan ?? 0;
    if (i >= s.nodes.length)
      return { ...s, ...done, event: { kind: 'notFound', op: 'contains', value: op.value, empty: s.nodes.length === 0 }, output: [...s.output, `contains(${op.value}) = false`] };
    const match = s.nodes[i] === op.value;
    const event: Ev = { kind: 'visit', index: i, value: op.value, match };
    return match ? { ...s, ...done, event, output: [...s.output, `contains(${op.value}) = true`] } : { ...s, scan: i + 1, event };
  }

  // remove
  if (s.p === null) {
    if (s.header) return { ...s, p: -1, event: { kind: 'startP', value: op.value } };
    if (s.nodes.length === 0) return { ...s, ...done, event: { kind: 'notFound', op: 'remove', value: op.value, empty: true } };
    if (s.nodes[0] === op.value) return { ...s, ...done, nodes: s.nodes.slice(1), event: { kind: 'removeFirst', value: op.value } };
    return { ...s, p: 0, event: { kind: 'startP', value: op.value } };
  }
  const next = s.p + 1;
  if (next >= s.nodes.length) return { ...s, ...done, event: { kind: 'notFound', op: 'remove', value: op.value, empty: false } };
  if (s.nodes[next] === op.value)
    return { ...s, ...done, nodes: s.nodes.filter((_, i) => i !== next), event: { kind: 'unlink', p: s.p, value: op.value } };
  return { ...s, p: next, event: { kind: 'advance', to: next, value: op.value } };
}

export const formatOp = (op: Op) => `${op.type} ${op.value}`;

export function parse(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น add A, remove A' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };
  const ops: Op[] = [];
  let live = 0;
  for (const token of tokens) {
    const m = new RegExp(`^(add|remove|contains)\\s+(${VALUE}{1,3})$`, 'iu').exec(token);
    if (!m) return { error: `ไม่เข้าใจ "${token}" — ใช้ได้แค่ add, remove, contains ตามด้วยค่ายาวไม่เกิน 3 ตัวอักษร` };
    const type = m[1]!.toLowerCase() as Op['type'];
    if (type === 'add' && ++live > MAX_NODES) return { error: `add ได้ไม่เกิน ${MAX_NODES} ครั้ง (พื้นที่วาดจำกัด)` };
    ops.push({ type, value: m[2]! });
  }
  return { value: ops };
}

const NO_HEADER = [
  'public void add(Object e) {',
  '  first = new LinkedNode(e, first);',
  '  ++size;',
  '}',
  'public boolean contains(Object e) {',
  '  LinkedNode node = first;',
  '  while (node != null) {',
  '    if (node.element.equals(e)) return true;',
  '    node = node.next;',
  '  }',
  '  return false;',
  '}',
  'public void remove(Object e) {',
  '  if (first == null) return;',
  '  if (first.element.equals(e)) {',
  '    first = first.next; --size;',
  '  } else {',
  '    LinkedNode p = first;',
  '    while (p.next != null && !p.next.element.equals(e))',
  '      p = p.next;',
  '    if (p.next != null) { p.next = p.next.next; --size; }',
  '  }',
  '}',
] as const;

const WITH_HEADER = [
  'public void add(Object e) {',
  '  header.next = new LinkedNode(e, header.next);',
  '  ++size;',
  '}',
  'public boolean contains(Object e) {',
  '  LinkedNode node = header.next;',
  '  while (node != null) {',
  '    if (node.element.equals(e)) return true;',
  '    node = node.next;',
  '  }',
  '  return false;',
  '}',
  'public void remove(Object e) {',
  '  LinkedNode p = header;',
  '  while (p.next != null && !p.next.element.equals(e))',
  '    p = p.next;',
  '  if (p.next != null) { p.next = p.next.next; --size; }',
  '}',
] as const;

/** Only the method that is running, so the listing stays short. */
export function codeFor(s: State): { lines: readonly string[]; active: number[] } {
  const all = s.header ? WITH_HEADER : NO_HEADER;
  const slice = (from: number, to: number, active: number[]) => ({ lines: all.slice(from, to), active: active.map((a) => a - from) });
  const e = s.event;
  const removeEnd = all.length;
  switch (e.kind) {
    case 'init':
      return slice(0, 4, []);
    case 'add':
      return slice(0, 4, [1, 2]);
    case 'visit':
      return slice(4, 12, e.match ? [7] : [7, 8]);
    case 'notFound':
      if (e.op === 'contains') return slice(4, 12, [10]);
      return slice(12, removeEnd, s.header ? [14, 16] : e.empty ? [13] : [18, 20]);
    case 'removeFirst':
      return slice(12, removeEnd, [14, 15]);
    case 'startP':
      return slice(12, removeEnd, s.header ? [13] : [14, 17]);
    case 'advance':
      return slice(12, removeEnd, s.header ? [14, 15] : [18, 19]);
    case 'unlink':
      return slice(12, removeEnd, s.header ? [16] : [20]);
  }
}
