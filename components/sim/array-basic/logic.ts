// Array basics: docs/WEB/JavaScript - Array.pdf p.1–4 (index, length, push/pop, shift/unshift, includes, slice).
import { splitOps, type Parsed } from '@/components/sim/core/inputs';

export type Op =
  | { type: 'push' | 'unshift' | 'includes'; value: string }
  | { type: 'pop' | 'shift' | 'length' }
  | { type: 'get'; index: number }
  | { type: 'slice'; start: number; end?: number };

export function parseArray(text: string): Parsed<string[]> {
  const items = text.split(',').map((t) => t.trim()).filter(Boolean);
  if (items.length > 8) return { error: 'ใส่ได้ไม่เกิน 8 ตัว' };
  if (items.some((t) => t.length > 9)) return { error: 'แต่ละค่ายาวได้ไม่เกิน 9 ตัวอักษร' };
  return { value: items };
}

export function parseOps(text: string): Parsed<Op[]> {
  const tokens = splitOps(text);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น push Suzuki' };
  if (tokens.length > 12) return { error: 'ใส่ได้ไม่เกิน 12 คำสั่ง' };
  const ops: Op[] = [];
  for (const token of tokens) {
    const [name, ...rest] = token.split(/\s+/);
    const arg = rest.join(' ');
    switch (name?.toLowerCase()) {
      case 'push':
      case 'unshift':
      case 'includes':
        if (!arg || arg.length > 9) return { error: `"${token}": ต้องตามด้วยค่า 1 ค่า (ไม่เกิน 9 ตัวอักษร)` };
        ops.push({ type: name.toLowerCase() as 'push' | 'unshift' | 'includes', value: arg });
        break;
      case 'pop':
      case 'shift':
      case 'length':
        ops.push({ type: name.toLowerCase() as 'pop' | 'shift' | 'length' });
        break;
      case 'get':
        if (!/^\d+$/.test(arg)) return { error: `"${token}": get ต้องตามด้วย index เช่น get 0` };
        ops.push({ type: 'get', index: Number(arg) });
        break;
      case 'slice': {
        const m = /^(\d+)(?:\s+(\d+))?$/.exec(arg);
        if (!m) return { error: `"${token}": slice ต้องตามด้วย start และ end (ไม่บังคับ) เช่น slice 2 หรือ slice 1 3` };
        ops.push({ type: 'slice', start: Number(m[1]), end: m[2] ? Number(m[2]) : undefined });
        break;
      }
      default:
        return { error: `ไม่รู้จัก "${token}" ใช้ได้: push x, pop, shift, unshift x, get i, length, includes x, slice a b` };
    }
  }
  return { value: ops };
}

export const format = (op: Op): string => {
  switch (op.type) {
    case 'push':
    case 'unshift':
    case 'includes':
      return `${op.type}("${op.value}")`;
    case 'get':
      return `[${op.index}]`;
    case 'length':
      return 'length';
    case 'slice':
      return `slice(${op.start}${op.end === undefined ? '' : `, ${op.end}`})`;
    default:
      return `${op.type}()`;
  }
};

export type Ev = { kind: 'init' } | { kind: 'op'; op: Op; result: string; mutated: boolean; touched: readonly number[]; removedAt?: 'start' | 'end' };

export interface State {
  ops: readonly Op[];
  array: readonly string[];
  pc: number;
  output: readonly string[];
  event: Ev;
}

export const init = (array: readonly string[], ops: readonly Op[]): State => ({ ops, array, pc: 0, output: [], event: { kind: 'init' } });
export const isDone = (s: State) => s.pc >= s.ops.length;

const q = (v: string) => `"${v}"`;

export function step(s: State): State {
  const op = s.ops[s.pc];
  if (!op) return s;
  const a = s.array;
  const done = (array: readonly string[], result: string, mutated: boolean, touched: readonly number[], removedAt?: 'start' | 'end'): State => ({
    ...s,
    array,
    pc: s.pc + 1,
    output: [...s.output, `cars.${format(op).replace(/^\[/, '[').replace(/^(\[\d+\])$/, '$1')} → ${result}`.replace('cars.[', 'cars[')],
    event: { kind: 'op', op, result, mutated, touched, removedAt },
  });
  switch (op.type) {
    case 'push':
      return done([...a, op.value], String(a.length + 1), true, [a.length]);
    case 'unshift':
      return done([op.value, ...a], String(a.length + 1), true, [0]);
    case 'pop':
      return a.length === 0 ? done(a, 'undefined', false, []) : done(a.slice(0, -1), q(a[a.length - 1]!), true, [], 'end');
    case 'shift':
      return a.length === 0 ? done(a, 'undefined', false, []) : done(a.slice(1), q(a[0]!), true, [], 'start');
    case 'get':
      return done(a, op.index < a.length ? q(a[op.index]!) : 'undefined', false, op.index < a.length ? [op.index] : []);
    case 'length':
      return done(a, String(a.length), false, []);
    case 'includes': {
      const at = a.indexOf(op.value);
      return done(a, String(at >= 0), false, at >= 0 ? [at] : []);
    }
    default: {
      const end = op.end ?? a.length;
      const idx = a.map((_, k) => k).filter((k) => k >= op.start && k < end);
      return done(a, `[${idx.map((k) => q(a[k]!)).join(', ')}]`, false, idx);
    }
  }
}
