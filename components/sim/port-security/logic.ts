// MAC flooding and Port Security: docs/IST/chapter1_lecture (2).pdf p.26, 29–33.
import { type Parsed } from '@/components/sim/core/inputs';

export type Mode = 'off' | 'protect' | 'restrict' | 'shutdown';

export type Ev =
  | { kind: 'init' }
  | { kind: 'learn'; mac: string; count: number }
  | { kind: 'pass'; mac: string }
  | { kind: 'violation'; mac: string }
  | { kind: 'down'; mac: string }
  | { kind: 'cam-learn'; mac: string; count: number }
  | { kind: 'cam-full'; mac: string }
  | { kind: 'cam-known'; mac: string };

export interface State {
  mode: Mode;
  maximum: number;
  sticky: boolean;
  /** CAM table size when port security is off. */
  capacity: number;
  macs: readonly string[];
  i: number;
  secure: readonly string[];
  errDisabled: boolean;
  /** Security violation counter (restrict and shutdown count; protect does not). */
  violations: number;
  log: readonly string[];
  failOpen: boolean;
  dropped: number;
  event: Ev;
}

export function parse(text: string): Parsed<string[]> {
  const tokens = text.toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่ Source MAC อย่างน้อย 1 ตัว เช่น AA, BB' };
  if (tokens.length > 14) return { error: 'ใส่ได้ไม่เกิน 14 frame' };
  const bad = tokens.find((t) => !/^[0-9A-F]{1,4}$/.test(t));
  if (bad) return { error: `"${bad}" ใช้ไม่ได้ ใส่ MAC แบบย่อเป็นเลขฐานสิบหก 1–4 หลัก เช่น AA` };
  return { value: tokens };
}

export const init = (macs: readonly string[], mode: Mode, maximum: number, sticky: boolean, capacity: number): State => ({
  mode,
  maximum,
  sticky,
  capacity,
  macs,
  i: 0,
  secure: [],
  errDisabled: false,
  violations: 0,
  log: [],
  failOpen: false,
  dropped: 0,
  event: { kind: 'init' },
});

export const isDone = (s: State) => s.i >= s.macs.length;

export function step(s: State): State {
  const mac = s.macs[s.i];
  if (mac === undefined) return s;
  const next = { ...s, i: s.i + 1 };

  if (s.mode === 'off') {
    if (s.secure.includes(mac)) return { ...next, event: { kind: 'cam-known', mac } };
    if (s.secure.length < s.capacity) return { ...next, secure: [...s.secure, mac], event: { kind: 'cam-learn', mac, count: s.secure.length + 1 } };
    return { ...next, failOpen: true, event: { kind: 'cam-full', mac } };
  }

  if (s.errDisabled) return { ...next, dropped: s.dropped + 1, event: { kind: 'down', mac } };
  if (s.secure.includes(mac)) return { ...next, event: { kind: 'pass', mac } };
  if (s.secure.length < s.maximum) return { ...next, secure: [...s.secure, mac], event: { kind: 'learn', mac, count: s.secure.length + 1 } };

  // more MAC addresses than the maximum: security violation
  if (s.mode === 'protect') return { ...next, dropped: s.dropped + 1, event: { kind: 'violation', mac } };
  const log = [...s.log, s.mode === 'restrict' ? `%PORT_SECURITY-2-PSECURE_VIOLATION: MAC ${mac} on Fa0/1` : `%PM-4-ERR_DISABLE: psecure-violation on Fa0/1 (MAC ${mac})`];
  return { ...next, dropped: s.dropped + 1, violations: s.violations + 1, log, errDisabled: s.mode === 'shutdown', event: { kind: 'violation', mac } };
}
