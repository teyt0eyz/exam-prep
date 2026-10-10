// Java stack frames for the StackFrame program of docs/OOD/STACK_5 (1).pdf p.27–37.

export const CODE = [
  'public class StackFrame {',
  '  public static void main(String[] args) {',
  '    a(AX, AY);',
  '    b(BX);',
  '  }',
  '  static void a(int x, int y) {',
  '    int z = x/y;',
  '    b(z);',
  '  }',
  '  static void b(int x) {',
  '    ++x;',
  '  }',
  '}',
] as const;

export interface Frame {
  method: 'main' | 'a' | 'b';
  /** Parameters and local variables, in declaration order. null = not assigned yet. */
  vars: readonly (readonly [string, number | null])[];
  /** Return address: the line to continue at in the caller ("JVM" for main). */
  ra: string;
}

export type JvmEvent =
  | { kind: 'start' }
  | { kind: 'call'; method: 'a' | 'b'; args: string; ra: string; fromLine: number }
  | { kind: 'assign'; name: string; expr: string; value: number }
  | { kind: 'ret'; method: 'main' | 'a' | 'b'; ra: string };

export interface JvmInput {
  ax: number;
  ay: number;
  bx: number;
}

export interface JvmState {
  input: JvmInput;
  /** Position in the fixed script below. */
  k: number;
  /** Line being executed (1-based, as numbered on the slide). 0 = program finished. */
  line: number;
  /** Bottom frame first; the top frame is the last item. */
  frames: readonly Frame[];
  event: JvmEvent;
}

type Patch = Pick<JvmState, 'line' | 'frames' | 'event'>;

const pad = (n: number) => String(n).padStart(2, '0');
const top = (s: JvmState) => s.frames[s.frames.length - 1] as Frame;
const valueOf = (frame: Frame, name: string) => frame.vars.find(([n]) => n === name)?.[1] ?? 0;
const setVar = (s: JvmState, name: string, value: number): Frame[] => [
  ...s.frames.slice(0, -1),
  { ...top(s), vars: top(s).vars.map(([n, v]) => [n, n === name ? value : v] as const) },
];

/** The program has no branches, so its execution is a fixed list of transitions. */
const SCRIPT: readonly ((s: JvmState) => Patch)[] = [
  // line 03: a(ax, ay)
  (s) => ({
    line: 6,
    frames: [...s.frames, { method: 'a', vars: [['x', s.input.ax], ['y', s.input.ay], ['z', null]], ra: pad(4) }],
    event: { kind: 'call', method: 'a', args: `${s.input.ax}, ${s.input.ay}`, ra: pad(4), fromLine: 3 },
  }),
  // line 07: int z = x/y  (integer division)
  (s) => {
    const x = valueOf(top(s), 'x');
    const y = valueOf(top(s), 'y');
    const z = Math.trunc(x / y);
    return { line: 7, frames: setVar(s, 'z', z), event: { kind: 'assign', name: 'z', expr: `${x}/${y}`, value: z } };
  },
  // line 08: b(z)
  (s) => {
    const z = valueOf(top(s), 'z');
    return {
      line: 10,
      frames: [...s.frames, { method: 'b', vars: [['x', z]], ra: pad(9) }],
      event: { kind: 'call', method: 'b', args: String(z), ra: pad(9), fromLine: 8 },
    };
  },
  // line 11: ++x
  (s) => {
    const x = valueOf(top(s), 'x') + 1;
    return { line: 11, frames: setVar(s, 'x', x), event: { kind: 'assign', name: 'x', expr: '++x', value: x } };
  },
  // line 12: b returns to 09
  (s) => ({ line: 9, frames: s.frames.slice(0, -1), event: { kind: 'ret', method: 'b', ra: pad(9) } }),
  // line 09: a returns to 04
  (s) => ({ line: 4, frames: s.frames.slice(0, -1), event: { kind: 'ret', method: 'a', ra: pad(4) } }),
  // line 04: b(bx)
  (s) => ({
    line: 10,
    frames: [...s.frames, { method: 'b', vars: [['x', s.input.bx]], ra: pad(5) }],
    event: { kind: 'call', method: 'b', args: String(s.input.bx), ra: pad(5), fromLine: 4 },
  }),
  // line 11: ++x
  (s) => {
    const x = valueOf(top(s), 'x') + 1;
    return { line: 11, frames: setVar(s, 'x', x), event: { kind: 'assign', name: 'x', expr: '++x', value: x } };
  },
  // line 12: b returns to 05
  (s) => ({ line: 5, frames: s.frames.slice(0, -1), event: { kind: 'ret', method: 'b', ra: pad(5) } }),
  // line 05: main returns to the JVM
  (s) => ({ line: 0, frames: s.frames.slice(0, -1), event: { kind: 'ret', method: 'main', ra: 'JVM' } }),
];

export function initJvm(input: JvmInput): JvmState {
  return {
    input,
    k: 0,
    line: 3,
    frames: [{ method: 'main', vars: [], ra: 'JVM' }],
    event: { kind: 'start' },
  };
}

export const isDone = (s: JvmState) => s.k >= SCRIPT.length;

export function step(s: JvmState): JvmState {
  const transition = SCRIPT[s.k];
  return transition ? { ...s, ...transition(s), k: s.k + 1 } : s;
}

/** The listing with the user's arguments filled in. */
export const codeFor = (input: JvmInput) =>
  CODE.map((line) =>
    line.replace('AX', String(input.ax)).replace('AY', String(input.ay)).replace('BX', String(input.bx)),
  );
