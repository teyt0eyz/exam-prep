// Preorder / inorder / postorder traversal of a binary tree: docs/OOD/BinaryTREE_8.pdf p.8–27.
import type { Parsed } from '@/components/sim/core/inputs';

export type Order = 'pre' | 'in' | 'post';
/** Level-order slots: children of slot k are 2k+1 and 2k+2; null = no node. */
export type Tree = readonly (string | null)[];

export type Ev = { kind: 'init' } | { kind: 'visit'; k: number; value: string } | { kind: 'done' };

interface Frame {
  k: number;
  /** How far the call on node k has progressed (0..3). */
  stage: number;
}

export interface State {
  tree: Tree;
  order: Order;
  /** Active recursive calls, outermost first. */
  stack: readonly Frame[];
  visited: readonly number[];
  event: Ev;
}

export const MAX_SLOTS = 15;
export const EMPTY = '_';

const has = (tree: Tree, k: number) => k < tree.length && tree[k] !== null && tree[k] !== undefined;

export const init = (tree: Tree, order: Order): State => ({
  tree,
  order,
  stack: has(tree, 0) ? [{ k: 0, stage: 0 }] : [],
  visited: [],
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.event.kind === 'done';

/** Which stage of a call visits the node: before the left call, between the calls, or after the right call. */
const VISIT_AT: Record<Order, number> = { pre: 0, in: 1, post: 2 };

/** Pure. Runs the recursion until the next node is visited (or the traversal ends). */
export function step(s: State): State {
  let stack = [...s.stack];
  for (;;) {
    const f = stack[stack.length - 1];
    if (!f) return { ...s, stack: [], event: { kind: 'done' } };
    // Each call does three things in an order that depends on the traversal:
    // visit itself, recurse left, recurse right.
    const actions: ('visit' | 'left' | 'right')[] = ['left', 'right'];
    actions.splice(VISIT_AT[s.order], 0, 'visit');
    const action = actions[f.stage];
    if (action === undefined) {
      stack = stack.slice(0, -1); // return from this call
      continue;
    }
    stack = [...stack.slice(0, -1), { k: f.k, stage: f.stage + 1 }];
    if (action === 'visit')
      return { ...s, stack, visited: [...s.visited, f.k], event: { kind: 'visit', k: f.k, value: s.tree[f.k] as string } };
    const child = action === 'left' ? 2 * f.k + 1 : 2 * f.k + 2;
    if (has(s.tree, child)) stack = [...stack, { k: child, stage: 0 }];
  }
}

export function parse(text: string): Parsed<Tree> {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 ปม (ปมแรกคือราก)' };
  if (tokens.length > MAX_SLOTS) return { error: `ใส่ได้ไม่เกิน ${MAX_SLOTS} ช่อง (4 ระดับ)` };
  const tree = tokens.map((t) => (t === EMPTY ? null : t));
  if (tree[0] === null) return { error: 'ช่องแรกคือราก จะเว้นว่างไม่ได้' };
  for (const [k, value] of tree.entries()) {
    if (value !== null && value.length > 3) return { error: `"${value}" ยาวเกิน 3 ตัวอักษร` };
    if (value !== null && k > 0 && tree[Math.floor((k - 1) / 2)] === null)
      return { error: `ช่องที่ ${k + 1} ("${value}") ไม่มีปมพ่อ — ใส่ ${EMPTY} ในตำแหน่งลูกของปมที่ไม่มี` };
  }
  return { value: tree };
}

export const CODE: Record<Order, readonly string[]> = {
  pre: ['void preorder(Node r) {', '  if (r == null) return;', '  visit(r);', '  preorder(r.left);', '  preorder(r.right);', '}'],
  in: ['void inorder(Node r) {', '  if (r == null) return;', '  inorder(r.left);', '  visit(r);', '  inorder(r.right);', '}'],
  post: ['void postorder(Node r) {', '  if (r == null) return;', '  postorder(r.left);', '  postorder(r.right);', '  visit(r);', '}'],
};
