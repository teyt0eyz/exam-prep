// OSPF cost and path selection: docs/IST/OSPF_Single_Area_Advanced.pdf p.3, 7–8.
import { type Parsed } from '@/components/sim/core/inputs';

export interface Link {
  a: string;
  b: string;
  /** Mbps */
  bandwidth: number;
}

export function parseLinks(text: string): Parsed<Link[]> {
  const rows = text.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (rows.length < 1 || rows.length > 7) return { error: 'ใส่ลิงก์ 1–7 เส้น เช่น R1-R2 1000' };
  const out: Link[] = [];
  for (const row of rows) {
    const m = /^(R[1-5])\s*-\s*(R[1-5])\s+(\d+(?:\.\d+)?)$/i.exec(row);
    if (!m) return { error: `อ่าน "${row}" ไม่ได้ รูปแบบคือ R1-R2 bandwidth(Mbps) เช่น R1-R2 1000 หรือ R1-R3 1.544 (router R1–R5)` };
    const a = m[1]!.toUpperCase();
    const b = m[2]!.toUpperCase();
    const bandwidth = Number(m[3]);
    if (a === b) return { error: `ลิงก์ "${row}" ต่อเข้าตัวเอง` };
    if (bandwidth <= 0 || bandwidth > 100000) return { error: `bandwidth ของ "${row}" ต้องมากกว่า 0 และไม่เกิน 100000 Mbps` };
    if (out.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return { error: `ลิงก์ ${a}-${b} ซ้ำ` };
    out.push({ a, b, bandwidth });
  }
  return { value: out };
}

/** cost = reference / bandwidth, rounded as the slides do (6476.68 → 6477), never below 1. */
export const cost = (reference: number, bandwidth: number) => Math.max(1, Math.round(reference / bandwidth));

export interface Path {
  hops: readonly string[];
  links: readonly number[];
  total: number;
}

export function paths(links: readonly Link[], costs: readonly number[], from: string, to: string): Path[] {
  const out: Path[] = [];
  const walk = (node: string, hops: string[], used: number[], total: number) => {
    if (node === to) {
      out.push({ hops, links: used, total });
      return;
    }
    links.forEach((l, k) => {
      const next = l.a === node ? l.b : l.b === node ? l.a : null;
      if (next === null || hops.includes(next)) return;
      walk(next, [...hops, next], [...used, k], total + costs[k]!);
    });
  };
  walk(from, [from], [], 0);
  return out.sort((x, y) => x.total - y.total || x.hops.length - y.hops.length).slice(0, 6);
}

export type Phase = { kind: 'init' } | { kind: 'link'; link: number } | { kind: 'path'; path: number } | { kind: 'decide' };

export interface State {
  reference: number;
  links: readonly Link[];
  costs: readonly number[];
  from: string;
  to: string;
  paths: readonly Path[];
  best: number;
  phases: readonly Phase[];
  i: number;
}

export function init(links: readonly Link[], reference: number): State {
  const names = [...new Set(links.flatMap((l) => [l.a, l.b]))].sort();
  const from = names[0]!;
  const to = names[names.length - 1]!;
  const costs = links.map((l) => cost(reference, l.bandwidth));
  const all = paths(links, costs, from, to);
  return {
    reference,
    links,
    costs,
    from,
    to,
    paths: all,
    best: all[0]?.total ?? Infinity,
    phases: [{ kind: 'init' }, ...links.map((_, k): Phase => ({ kind: 'link', link: k })), ...all.map((_, k): Phase => ({ kind: 'path', path: k })), { kind: 'decide' }],
    i: 0,
  };
}
export const isDone = (s: State) => s.i >= s.phases.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
