// MAC address learning: docs/IST/chapter1_lecture (2).pdf p.13–14 and docs/IST/chapter2 Switched Network.pdf p.17–21.
import { splitOps, type Parsed } from '@/components/sim/core/inputs';

export interface Host {
  name: string;
  port: number;
}
export interface Frame {
  src: string;
  /** null = broadcast */
  dst: string | null;
}

export type Ev =
  | { kind: 'init' }
  | {
      kind: 'frame';
      frame: Frame;
      inPort: number;
      learn: 'new' | 'refresh' | 'moved';
      action: 'flood-unknown' | 'flood-broadcast' | 'forward' | 'filter';
      outPorts: readonly number[];
    };

export interface State {
  hosts: readonly Host[];
  ports: number;
  frames: readonly Frame[];
  i: number;
  /** MAC (host name) → port, in the order learned. */
  table: readonly { mac: string; port: number }[];
  event: Ev;
}

export function parseHosts(text: string): Parsed<Host[]> {
  const tokens = splitOps(text);
  if (tokens.length < 2 || tokens.length > 6) return { error: 'ใส่ host 2–6 เครื่อง เช่น A 1, B 2, C 3' };
  const hosts: Host[] = [];
  for (const token of tokens) {
    const m = /^([A-Za-z])\s+([1-6])$/.exec(token);
    if (!m) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ ชื่อ host (ตัวอักษร 1 ตัว) ตามด้วยหมายเลขพอร์ต 1–6` };
    const name = m[1]!.toUpperCase();
    if (hosts.some((h) => h.name === name)) return { error: `ชื่อ host ${name} ซ้ำ` };
    hosts.push({ name, port: Number(m[2]) });
  }
  return { value: hosts };
}

export const parseFrames =
  (hosts: readonly Host[]) =>
  (text: string): Parsed<Frame[]> => {
    const tokens = splitOps(text);
    if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 frame เช่น A>B' };
    if (tokens.length > 12) return { error: 'ใส่ได้ไม่เกิน 12 frame' };
    const frames: Frame[] = [];
    for (const token of tokens) {
      const m = /^([A-Za-z])\s*>\s*([A-Za-z*])$/.exec(token);
      if (!m) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ ต้นทาง>ปลายทาง เช่น A>B หรือ A>* สำหรับ broadcast` };
      const src = m[1]!.toUpperCase();
      const dst = m[2] === '*' ? null : m[2]!.toUpperCase();
      if (!hosts.some((h) => h.name === src)) return { error: `ไม่มี host ชื่อ ${src}` };
      if (dst !== null && !hosts.some((h) => h.name === dst)) return { error: `ไม่มี host ชื่อ ${dst}` };
      if (src === dst) return { error: `${src} ส่งหาตัวเองไม่ได้` };
      frames.push({ src, dst });
    }
    return { value: frames };
  };

export const init = (hosts: readonly Host[], frames: readonly Frame[]): State => ({
  hosts,
  ports: Math.max(4, ...hosts.map((h) => h.port)),
  frames,
  i: 0,
  table: [],
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.i >= s.frames.length;

export function step(s: State): State {
  const frame = s.frames[s.i];
  if (!frame) return s;
  const inPort = s.hosts.find((h) => h.name === frame.src)!.port;

  // 1. learn: source MAC + ingress port
  const known = s.table.find((e) => e.mac === frame.src);
  const learn = !known ? 'new' : known.port === inPort ? 'refresh' : 'moved';
  const table = known ? s.table.map((e) => (e.mac === frame.src ? { ...e, port: inPort } : e)) : [...s.table, { mac: frame.src, port: inPort }];

  // 2. forward / filter / flood on the destination MAC
  const others = Array.from({ length: s.ports }, (_, k) => k + 1).filter((p) => p !== inPort);
  let action: 'flood-unknown' | 'flood-broadcast' | 'forward' | 'filter';
  let outPorts: number[];
  const entry = frame.dst === null ? undefined : table.find((e) => e.mac === frame.dst);
  if (frame.dst === null) {
    action = 'flood-broadcast';
    outPorts = others;
  } else if (!entry) {
    action = 'flood-unknown';
    outPorts = others;
  } else if (entry.port === inPort) {
    action = 'filter';
    outPorts = [];
  } else {
    action = 'forward';
    outPorts = [entry.port];
  }
  return { ...s, i: s.i + 1, table, event: { kind: 'frame', frame, inPort, learn, action, outPorts } };
}
