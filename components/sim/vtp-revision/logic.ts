// VTP revision number: docs/IST/Vlan.pdf p.9–14 and docs/IST/chapter2 Switched Network.pdf p.45–48.

export type VtpMode = 'server' | 'client' | 'transparent';

export interface Switch {
  name: string;
  mode: VtpMode;
  revision: number;
  vlans: readonly number[];
  /** false until the old switch is cabled in. */
  connected: boolean;
}

export interface Config {
  oldMode: VtpMode;
  oldRevision: number;
  /** Change the domain name and back before connecting: resets the revision to 0. */
  reset: boolean;
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'create'; vlan: number; revision: number }
  | { kind: 'sync'; from: string; to: string; revision: number; old: number; lost: readonly number[]; gained: readonly number[] }
  | { kind: 'reset'; from: number }
  | { kind: 'connect'; revision: number; domain: number }
  | { kind: 'ignore'; who: string; reason: 'transparent' | 'lower' | 'equal'; revision: number; domain: number }
  | { kind: 'result'; wiped: boolean };

export interface State {
  config: Config;
  switches: readonly Switch[];
  /** Index into the script. */
  pc: number;
  script: readonly string[];
  event: Ev;
}

const BASE = [1, 10, 20, 30];
const OLD = [1, 99];

export function init(config: Config): State {
  return {
    config,
    switches: [
      { name: 'SW1', mode: 'server', revision: 5, vlans: BASE, connected: true },
      { name: 'SW2', mode: 'client', revision: 5, vlans: BASE, connected: true },
      { name: 'SW3', mode: 'client', revision: 5, vlans: BASE, connected: true },
      { name: 'OLD', mode: config.oldMode, revision: config.oldRevision, vlans: OLD, connected: false },
    ],
    pc: 0,
    script: ['create', 'adv12', 'adv23', ...(config.reset ? ['reset'] : []), 'connect', 'compare', 'p32', 'p21', 'result'],
    event: { kind: 'init' },
  };
}

export const isDone = (s: State) => s.pc >= s.script.length;

const diff = (a: readonly number[], b: readonly number[]) => a.filter((v) => !b.includes(v));
const patch = (sw: readonly Switch[], name: string, p: Partial<Switch>) => sw.map((x) => (x.name === name ? { ...x, ...p } : x));
const get = (s: State, name: string) => s.switches.find((x) => x.name === name)!;

/** `to` receives an advertisement from `from` and synchronizes if the revision is higher. */
function advertise(s: State, from: string, to: string): State {
  const a = get(s, from);
  const b = get(s, to);
  if (a.revision > b.revision && b.mode !== 'transparent')
    return {
      ...s,
      switches: patch(s.switches, to, { revision: a.revision, vlans: a.vlans }),
      event: { kind: 'sync', from, to, revision: a.revision, old: b.revision, lost: diff(b.vlans, a.vlans), gained: diff(a.vlans, b.vlans) },
    };
  return { ...s, event: { kind: 'ignore', who: to, reason: b.mode === 'transparent' ? 'transparent' : a.revision === b.revision ? 'equal' : 'lower', revision: a.revision, domain: b.revision } };
}

export function step(s: State): State {
  const op = s.script[s.pc];
  if (!op) return s;
  const next = { ...s, pc: s.pc + 1 };
  const sw1 = get(s, 'SW1');
  const old = get(s, 'OLD');

  switch (op) {
    case 'create':
      return { ...next, switches: patch(s.switches, 'SW1', { revision: sw1.revision + 1, vlans: [...sw1.vlans, 40] }), event: { kind: 'create', vlan: 40, revision: sw1.revision + 1 } };
    case 'adv12':
      return advertise(next, 'SW1', 'SW2');
    case 'adv23':
      return advertise(next, 'SW2', 'SW3');
    case 'reset':
      return { ...next, switches: patch(s.switches, 'OLD', { revision: 0 }), event: { kind: 'reset', from: old.revision } };
    case 'connect':
      return { ...next, switches: patch(s.switches, 'OLD', { connected: true }), event: { kind: 'connect', revision: old.revision, domain: get(s, 'SW3').revision } };
    case 'compare': {
      // a transparent switch neither applies nor originates the domain's database
      if (old.mode === 'transparent') return { ...next, event: { kind: 'ignore', who: 'OLD', reason: 'transparent', revision: get(s, 'SW3').revision, domain: old.revision } };
      if (old.revision > get(s, 'SW3').revision) return advertise(next, 'OLD', 'SW3');
      return advertise(next, 'SW3', 'OLD');
    }
    case 'p32':
      return advertise(next, 'SW3', 'SW2');
    case 'p21':
      return advertise(next, 'SW2', 'SW1');
    default:
      return { ...next, event: { kind: 'result', wiped: !get(s, 'SW1').vlans.includes(10) } };
  }
}
