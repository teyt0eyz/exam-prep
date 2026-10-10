// Order of synchronous code, promise callbacks (microtasks) and timers (macrotasks).
// Supplementary to docs/WEB/JavaScript - for React.pdf p.1 (Asynchronous JavaScript: Promises, Async/Await).
import type { Parsed } from '@/components/sim/core/inputs';

export type Kind = 'log' | 'timeout' | 'promise';
export interface Line {
  kind: Kind;
  label: string;
}

export type Phase = 'sync' | 'micro' | 'macro' | 'done';
export type Event =
  | { kind: 'init' }
  | { kind: 'run'; line: number }
  | { kind: 'drain'; from: 'micro' | 'macro'; label: string }
  | { kind: 'stack-empty' };

export interface State {
  lines: readonly Line[];
  /** Next line of synchronous code to run. */
  pc: number;
  phase: Phase;
  micro: readonly string[];
  macro: readonly string[];
  output: readonly string[];
  event: Event;
}

/** One statement per line: "log A", "timeout B" (setTimeout 0) or "promise C" (Promise.then). */
export function parseProgram(text: string): Parsed<Line[]> {
  const rows = text.split(/[\n;,]+/).map((l) => l.trim()).filter(Boolean);
  if (rows.length === 0) return { error: 'ใส่อย่างน้อย 1 บรรทัด เช่น log A' };
  if (rows.length > 10) return { error: 'ใส่ได้ไม่เกิน 10 บรรทัด' };
  const lines: Line[] = [];
  for (const row of rows) {
    const [name, ...rest] = row.split(/\s+/);
    const label = rest.join(' ');
    const kind = name?.toLowerCase();
    if (kind !== 'log' && kind !== 'timeout' && kind !== 'promise') return { error: `ไม่รู้จัก "${row}" ใช้ได้: log X, timeout X, promise X` };
    if (!label || label.length > 8) return { error: `"${row}": ต้องตามด้วยข้อความ 1 คำ (ไม่เกิน 8 ตัวอักษร)` };
    lines.push({ kind, label });
  }
  return { value: lines };
}

export const source = (line: Line) =>
  line.kind === 'log'
    ? `console.log("${line.label}");`
    : line.kind === 'timeout'
      ? `setTimeout(() => console.log("${line.label}"), 0);`
      : `Promise.resolve().then(() => console.log("${line.label}"));`;

export const init = (lines: readonly Line[]): State => ({ lines, pc: 0, phase: 'sync', micro: [], macro: [], output: [], event: { kind: 'init' } });
export const isDone = (state: State) => state.phase === 'done';

export function step(state: State): State {
  if (state.phase === 'sync') {
    if (state.pc >= state.lines.length) {
      const phase: Phase = state.micro.length > 0 ? 'micro' : state.macro.length > 0 ? 'macro' : 'done';
      return { ...state, phase, event: { kind: 'stack-empty' } };
    }
    const line = state.lines[state.pc]!;
    const next = { ...state, pc: state.pc + 1, event: { kind: 'run', line: state.pc } as Event };
    if (line.kind === 'log') return { ...next, output: [...state.output, line.label] };
    if (line.kind === 'promise') return { ...next, micro: [...state.micro, line.label] };
    return { ...next, macro: [...state.macro, line.label] };
  }
  if (state.phase === 'micro') {
    const [label = '', ...rest] = state.micro;
    const phase: Phase = rest.length > 0 ? 'micro' : state.macro.length > 0 ? 'macro' : 'done';
    return { ...state, micro: rest, output: [...state.output, label], phase, event: { kind: 'drain', from: 'micro', label } };
  }
  if (state.phase === 'macro') {
    const [label = '', ...rest] = state.macro;
    return { ...state, macro: rest, output: [...state.output, label], phase: rest.length > 0 ? 'macro' : 'done', event: { kind: 'drain', from: 'macro', label } };
  }
  return state;
}
