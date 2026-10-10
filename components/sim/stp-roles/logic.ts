// STP root bridge election and port roles: docs/IST/Spanning Tree Protocol Presentation (1).pdf p.14–18.
import { type Parsed } from '@/components/sim/core/inputs';

export interface Bridge {
  name: string;
  priority: number;
  mac: string;
}
export interface Link {
  a: number;
  b: number;
  /** Mbps */
  speed: number;
  cost: number;
}
export type Role = 'RP' | 'DP' | 'BLK';

/** 802.1D costs from the slides. */
export const COST: Record<number, number> = { 10: 100, 100: 19, 1000: 4, 10000: 2 };

export function parseBridges(text: string): Parsed<Bridge[]> {
  const rows = text.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (rows.length < 2 || rows.length > 4) return { error: 'ใส่ switch 2–4 ตัว เช่น SW1 32768 AAAA, SW2 24576 BBBB' };
  const out: Bridge[] = [];
  for (const row of rows) {
    const m = /^(\w{1,4})\s+(\d+)\s+([0-9A-Fa-f]{1,12})$/.exec(row);
    if (!m) return { error: `อ่าน "${row}" ไม่ได้ รูปแบบคือ ชื่อ priority MAC(ฐานสิบหก) เช่น SW1 32768 AAAA` };
    const priority = Number(m[2]);
    if (priority > 61440 || priority % 4096 !== 0) return { error: `priority ของ ${m[1]} ต้องเป็นพหุคูณของ 4096 ระหว่าง 0–61440 (เช่น 24576, 28672, 32768)` };
    const name = m[1]!.toUpperCase();
    const mac = m[3]!.toUpperCase();
    if (out.some((b) => b.name === name)) return { error: `ชื่อ ${name} ซ้ำ` };
    if (out.some((b) => b.mac === mac)) return { error: `MAC ${mac} ซ้ำ` };
    out.push({ name, priority, mac });
  }
  return { value: out };
}

export const parseLinks =
  (bridges: readonly Bridge[]) =>
  (text: string): Parsed<Link[]> => {
    const rows = text.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
    if (rows.length < 1 || rows.length > 6) return { error: 'ใส่ลิงก์ 1–6 เส้น เช่น SW1-SW2 1000' };
    const out: Link[] = [];
    for (const row of rows) {
      const m = /^(\w{1,4})\s*-\s*(\w{1,4})\s+(\d+)$/.exec(row);
      if (!m) return { error: `อ่าน "${row}" ไม่ได้ รูปแบบคือ SW1-SW2 ความเร็ว(Mbps) เช่น SW1-SW2 1000` };
      const a = bridges.findIndex((b) => b.name === m[1]!.toUpperCase());
      const b = bridges.findIndex((x) => x.name === m[2]!.toUpperCase());
      const speed = Number(m[3]);
      if (a < 0 || b < 0 || a === b) return { error: `ลิงก์ "${row}" อ้าง switch ที่ไม่มี หรือต่อเข้าตัวเอง` };
      if (!(speed in COST)) return { error: `ความเร็ว ${speed} ไม่มีในตาราง ใช้ 10, 100, 1000 หรือ 10000 Mbps` };
      if (out.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return { error: `ลิงก์ ${m[1]}-${m[2]} ซ้ำ` };
      out.push({ a, b, speed, cost: COST[speed]! });
    }
    // every switch must be reachable
    const seen = new Set([0]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const l of out) {
        if (seen.has(l.a) !== seen.has(l.b)) {
          seen.add(l.a);
          seen.add(l.b);
          changed = true;
        }
      }
    }
    if (seen.size !== bridges.length) return { error: 'มี switch ที่ไม่ได้ต่อกับตัวอื่น' };
    return { value: out };
  };

/** Bridge ID comparison: priority first, then MAC; lower wins. */
export const bidLess = (x: Bridge, y: Bridge) => x.priority < y.priority || (x.priority === y.priority && x.mac.padStart(12, '0') < y.mac.padStart(12, '0'));
export const bid = (b: Bridge) => `${b.priority}.${b.mac}`;

export interface Solution {
  root: number;
  /** Root path cost of each bridge. */
  rpc: readonly number[];
  /** Link index of each bridge's root port (-1 for the root). */
  rootLink: readonly number[];
  /** Roles of the two ends of each link: [end a, end b]. */
  roles: readonly (readonly [Role, Role])[];
}

export function solve(bridges: readonly Bridge[], links: readonly Link[]): Solution {
  const n = bridges.length;
  let root = 0;
  for (let i = 1; i < n; i++) if (bidLess(bridges[i]!, bridges[root]!)) root = i;

  // root path cost: shortest path over link costs
  const rpc: number[] = bridges.map((_, i) => (i === root ? 0 : Infinity));
  for (let pass = 0; pass < n; pass++)
    for (const l of links) {
      if (rpc[l.a]! + l.cost < rpc[l.b]!) rpc[l.b] = rpc[l.a]! + l.cost;
      if (rpc[l.b]! + l.cost < rpc[l.a]!) rpc[l.a] = rpc[l.b]! + l.cost;
    }

  // root port: lowest cost via neighbour; tie → neighbour with the lower bridge ID
  const rootLink = bridges.map((_, i) => {
    if (i === root) return -1;
    let best = -1;
    links.forEach((l, k) => {
      if (l.a !== i && l.b !== i) return;
      const other = l.a === i ? l.b : l.a;
      const cost = rpc[other]! + l.cost;
      if (cost !== rpc[i]) return;
      if (best === -1) best = k;
      else {
        const prev = links[best]!;
        const prevOther = prev.a === i ? prev.b : prev.a;
        if (bidLess(bridges[other]!, bridges[prevOther]!)) best = k;
      }
    });
    return best;
  });

  // designated port per segment: end with the lower root path cost; tie → lower bridge ID
  const roles = links.map((l, k): [Role, Role] => {
    const aWins = rpc[l.a]! < rpc[l.b]! || (rpc[l.a] === rpc[l.b] && bidLess(bridges[l.a]!, bridges[l.b]!));
    const other = (i: number): Role => (rootLink[i] === k ? 'RP' : 'BLK');
    return aWins ? ['DP', other(l.b)] : [other(l.a), 'DP'];
  });
  return { root, rpc, rootLink, roles };
}

export type Phase = { kind: 'init' } | { kind: 'claim' } | { kind: 'root' } | { kind: 'rp'; bridge: number } | { kind: 'segment'; link: number } | { kind: 'done' };

export interface State {
  bridges: readonly Bridge[];
  links: readonly Link[];
  solution: Solution;
  phases: readonly Phase[];
  i: number;
}

export function init(bridges: readonly Bridge[], links: readonly Link[]): State {
  const solution = solve(bridges, links);
  const phases: Phase[] = [
    { kind: 'init' },
    { kind: 'claim' },
    { kind: 'root' },
    ...bridges.flatMap((_, i): Phase[] => (i === solution.root ? [] : [{ kind: 'rp', bridge: i }])),
    ...links.map((_, k): Phase => ({ kind: 'segment', link: k })),
    { kind: 'done' },
  ];
  return { bridges, links, solution, phases, i: 0 };
}
export const isDone = (s: State) => s.i >= s.phases.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
