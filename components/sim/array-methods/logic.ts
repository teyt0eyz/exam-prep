// Array map / filter / find / reduce: docs/WEB/JavaScript - Array.pdf p.5–8.
import { type Parsed } from '@/components/sim/core/inputs';

export type Method = 'map' | 'filter' | 'find' | 'reduce';

export interface Callback {
  id: string;
  /** Source shown to the user. */
  code: string;
  /** Initial value for reduce. */
  initial?: number;
  run: (el: number, acc: number, arr: readonly number[]) => number | boolean;
}

const r = (n: number) => Number(n.toFixed(4));

export const CALLBACKS: Record<Method, readonly Callback[]> = {
  map: [
    { id: 'plus', code: 'el => el + 1000', run: (el) => el + 1000 },
    { id: 'times', code: 'n => n * 1000', run: (el) => el * 1000 },
    { id: 'double', code: 'el => el * 2', run: (el) => el * 2 },
  ],
  filter: [
    { id: 'gt4', code: 'e => e > 4', run: (el) => el > 4 },
    { id: 'even', code: 'e => e % 2 === 0', run: (el) => el % 2 === 0 },
    { id: 'ge50', code: 'el => el >= 50', run: (el) => el >= 50 },
  ],
  find: [
    { id: 'ge4', code: 'el => el >= 4', run: (el) => el >= 4 },
    { id: 'gt4', code: 'el => el > 4', run: (el) => el > 4 },
    { id: 'gt100', code: 'el => el > 100', run: (el) => el > 100 },
  ],
  reduce: [
    { id: 'sum', code: '(acc, el) => acc + el', initial: 0, run: (el, acc) => acc + el },
    { id: 'avg', code: '(acc, el, idx, arr) => acc + el / arr.length', initial: 0, run: (el, acc, arr) => r(acc + el / arr.length) },
    { id: 'max', code: '(acc, el) => acc > el ? acc : el', initial: 0, run: (el, acc) => (acc > el ? acc : el) },
  ],
};

export function parse(text: string): Parsed<number[]> {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return { error: 'ใส่ตัวเลขอย่างน้อย 1 ตัว เช่น 10, 12, 5' };
  if (parts.length > 10) return { error: 'ใส่ได้ไม่เกิน 10 ตัว' };
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || Math.abs(n) > 99999)) return { error: 'ใส่ได้เฉพาะตัวเลข (ไม่เกิน 5 หลัก)' };
  return { value: nums };
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'visit'; idx: number; el: number; result: number | boolean; accBefore: number }
  | { kind: 'end'; found: boolean };

export interface State {
  method: Method;
  callback: Callback;
  array: readonly number[];
  /** Next index to visit. */
  i: number;
  /** map / filter output so far. */
  out: readonly number[];
  acc: number;
  found: number | undefined;
  finished: boolean;
  event: Ev;
}

export const init = (array: readonly number[], method: Method, callback: Callback): State => ({
  method,
  callback,
  array,
  i: 0,
  out: [],
  acc: callback.initial ?? 0,
  found: undefined,
  finished: false,
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.finished;

export function step(s: State): State {
  if (s.finished) return s;
  // find stops as soon as the callback returns true; the others visit every element
  if (s.i >= s.array.length || (s.method === 'find' && s.found !== undefined)) return { ...s, finished: true, event: { kind: 'end', found: s.found !== undefined } };
  const el = s.array[s.i]!;
  const result = s.callback.run(el, s.acc, s.array);
  const next = { ...s, i: s.i + 1, event: { kind: 'visit' as const, idx: s.i, el, result, accBefore: s.acc } };
  switch (s.method) {
    case 'map':
      return { ...next, out: [...s.out, result as number] };
    case 'filter':
      return { ...next, out: result ? [...s.out, el] : s.out };
    case 'find':
      return { ...next, found: result ? el : undefined };
    default:
      return { ...next, acc: result as number };
  }
}
