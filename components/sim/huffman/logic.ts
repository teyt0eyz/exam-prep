// Huffman tree construction: docs/OOD/BinaryTREE_8.pdf p.36–46 and p.56–58.
import type { Parsed } from '@/components/sim/core/inputs';

export interface HNode {
  id: number;
  freq: number;
  /** Set on leaves only. */
  label?: string;
  left?: HNode;
  right?: HNode;
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'merge'; a: number; b: number; sum: number; id: number; ties: boolean }
  | { kind: 'codes' };

export interface State {
  /** Trees not merged yet, in drawing order (left to right). */
  forest: readonly HNode[];
  nextId: number;
  event: Ev;
}

export interface CodeRow {
  label: string;
  freq: number;
  code: string;
}

export const MAX_SYMBOLS = 8;

export const init = (symbols: readonly { label: string; freq: number }[]): State => ({
  forest: symbols.map((s, id) => ({ id, ...s })),
  nextId: symbols.length,
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.event.kind === 'codes';

/**
 * Pure. Takes the two smallest trees, as BinaryMinHeap.dequeue() does twice in the slide's
 * coding(): the first one dequeued becomes the left child. Ties go to the older tree.
 */
export function step(s: State): State {
  if (s.forest.length <= 1) return { ...s, event: { kind: 'codes' } };
  const sorted = [...s.forest].sort((x, y) => x.freq - y.freq || x.id - y.id);
  const t1 = sorted[0] as HNode;
  const t2 = sorted[1] as HNode;
  const merged: HNode = { id: s.nextId, freq: t1.freq + t2.freq, left: t1, right: t2 };
  const at = Math.min(s.forest.indexOf(t1), s.forest.indexOf(t2));
  const rest = s.forest.filter((t) => t !== t1 && t !== t2);
  const forest = [...rest.slice(0, at), merged, ...rest.slice(at)];
  const ties = sorted.length > 2 && (sorted[2] as HNode).freq === t2.freq;
  return { forest, nextId: s.nextId + 1, event: { kind: 'merge', a: t1.freq, b: t2.freq, sum: merged.freq, id: merged.id, ties } };
}

/** Codes of every leaf under `root`: left edge = 0, right edge = 1. */
export function codesOf(root: HNode | undefined, prefix = ''): CodeRow[] {
  if (!root) return [];
  if (!root.left || !root.right) return [{ label: root.label ?? String(root.freq), freq: root.freq, code: prefix || '0' }];
  return [...codesOf(root.left, prefix + '0'), ...codesOf(root.right, prefix + '1')];
}

export const totalBits = (rows: readonly CodeRow[]) => rows.reduce((n, r) => n + r.freq * r.code.length, 0);
/** Bits per symbol for a fixed-length code over n symbols. */
export const fixedWidth = (n: number) => Math.max(1, Math.ceil(Math.log2(n)));
export const leavesOf = (t: HNode): HNode[] => (t.left && t.right ? [...leavesOf(t.left), ...leavesOf(t.right)] : [t]);
export const heightOf = (t: HNode): number => (t.left && t.right ? 1 + Math.max(heightOf(t.left), heightOf(t.right)) : 0);

export function parse(text: string): Parsed<{ label: string; freq: number }[]> {
  const tokens = text.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2) return { error: 'ใส่อย่างน้อย 2 ตัว เช่น a:5, b:9' };
  if (tokens.length > MAX_SYMBOLS) return { error: `ใส่ได้ไม่เกิน ${MAX_SYMBOLS} ตัว` };
  const out: { label: string; freq: number }[] = [];
  for (const token of tokens) {
    const m = /^(?:([^\s:]{1,3})\s*:\s*)?(\d{1,3})$/u.exec(token);
    if (!m || Number(m[2]) === 0) return { error: `ไม่เข้าใจ "${token}" — ใช้รูปแบบ ตัวอักษร:ความถี่ เช่น a:5 (ความถี่ 1–999)` };
    out.push({ label: m[1] ?? m[2]!, freq: Number(m[2]) });
  }
  return { value: out };
}

export const CODE = [
  'public static HuffmanTree coding(int[] freq) {',
  '  BinaryMinHeap h = new BinaryMinHeap();',
  '  for (int i = 0; i < freq.length; i++)',
  '    h.enqueue(new HuffmanTree(freq[i], null, null));',
  '  for (int i = 0; i < freq.length - 1; i++) {',
  '    HuffmanTree t1 = (HuffmanTree) h.dequeue();',
  '    HuffmanTree t2 = (HuffmanTree) h.dequeue();',
  '    int f = t1.freq() + t2.freq();',
  '    h.enqueue(new HuffmanTree(f, t1.root, t2.root));',
  '  }',
  '  return (HuffmanTree) h.dequeue();',
  '}',
] as const;
