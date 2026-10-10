export type StackOp = { type: 'push'; value: number } | { type: 'pop' } | { type: 'peek' };

export type StackEvent =
  | { kind: 'init' }
  | { kind: 'push'; value: number }
  | { kind: 'overflow'; value: number }
  | { kind: 'pop'; value: number }
  | { kind: 'underflow' }
  | { kind: 'peek'; value: number | null };

export interface StackState {
  ops: readonly StackOp[];
  /** Index of the next operation to run. */
  pc: number;
  /** Bottom of the stack first; the top is the last item. */
  items: readonly number[];
  capacity: number;
  /** What the step that produced this state did. */
  event: StackEvent;
}

export const MAX_CAPACITY = 8;
export const MAX_OPS = 30;

export function initStack(ops: readonly StackOp[], capacity: number): StackState {
  return { ops, pc: 0, items: [], capacity, event: { kind: 'init' } };
}

export const isDone = (s: StackState) => s.pc >= s.ops.length;

/** Pure: runs ops[pc] and returns the next state. */
export function step(s: StackState): StackState {
  const op = s.ops[s.pc];
  if (!op) return s;
  const next = { ...s, pc: s.pc + 1 };

  switch (op.type) {
    case 'push':
      if (s.items.length >= s.capacity)
        return { ...next, event: { kind: 'overflow', value: op.value } };
      return { ...next, items: [...s.items, op.value], event: { kind: 'push', value: op.value } };
    case 'pop': {
      const top = s.items.at(-1);
      if (top === undefined) return { ...next, event: { kind: 'underflow' } };
      return { ...next, items: s.items.slice(0, -1), event: { kind: 'pop', value: top } };
    }
    case 'peek':
      return { ...next, event: { kind: 'peek', value: s.items.at(-1) ?? null } };
  }
}

export const formatOp = (op: StackOp) => (op.type === 'push' ? `push ${op.value}` : op.type);

/** Parses "push 5, push 3, pop, peek". Returns either ops or a Thai error message. */
export function parseOps(text: string): { ops: StackOp[] } | { error: string } {
  const tokens = text
    .split(/[,\n;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 คำสั่ง เช่น push 5, pop' };
  if (tokens.length > MAX_OPS) return { error: `ใส่ได้ไม่เกิน ${MAX_OPS} คำสั่ง` };

  const ops: StackOp[] = [];
  for (const token of tokens) {
    const push = /^push\s+(-?\d{1,4})$/.exec(token);
    if (push) ops.push({ type: 'push', value: Number(push[1]) });
    else if (token === 'pop' || token === 'peek') ops.push({ type: token });
    else return { error: `ไม่เข้าใจ "${token}" — ใช้ได้แค่ push <ตัวเลข>, pop, peek` };
  }
  return { ops };
}
