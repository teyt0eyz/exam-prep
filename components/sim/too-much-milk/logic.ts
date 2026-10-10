// Too Much Milk: docs/OS/05-Synchronization-part1_v2.pdf p.5–13.
import { type Parsed } from '@/components/sim/core/inputs';

export type Variant = 'try1' | 'try2' | 'try3' | 'lock';
export type Who = 'A' | 'B';

const TRY1 = ['if (!note)', '  if (!milk) {', '    leave note', '    buy milk', '    remove note', '  }'];
const noteProgram = (me: Who, loop: boolean) => {
  const other = me === 'A' ? 'B' : 'A';
  return [`leave note ${me}`, loop ? `while (note ${other}) ;` : `if (!note ${other}) {`, loop ? 'if (!milk)' : '  if (!milk)', loop ? '  buy milk' : '    buy milk', loop ? `remove note ${me}` : '}', ...(loop ? [] : [`remove note ${me}`])];
};
const LOCK = ['lock.acquire();', 'if (!milk)', '  buy milk', 'lock.release();'];

/** Source shown for each thread. */
export function code(variant: Variant, who: Who): string[] {
  if (variant === 'try1') return TRY1;
  if (variant === 'lock') return LOCK;
  return noteProgram(who, variant === 'try3' && who === 'A');
}

export type Ev =
  | { kind: 'init' }
  | { kind: 'line'; who: Who; line: number; text: string; note: string; tone: 'active' | 'waiting' | 'error' | 'done' }
  | { kind: 'verdict' };

export interface State {
  variant: Variant;
  schedule: readonly Who[];
  /** Next schedule token. */
  k: number;
  /** Next line of each thread; = code length when finished. */
  pc: Record<Who, number>;
  /** Try #1 uses one unlabelled note; the others use one per person. */
  note: boolean;
  notes: Record<Who, boolean>;
  milk: number;
  holder: Who | null;
  bought: readonly Who[];
  verdictShown: boolean;
  event: Ev;
}

export function parseSchedule(text: string): Parsed<Who[]> {
  const tokens = text.toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (tokens.length > 40) return { error: 'ลำดับยาวเกินไป (ไม่เกิน 40)' };
  const bad = tokens.find((t) => t !== 'A' && t !== 'B');
  if (bad) return { error: `"${bad}" ใช้ไม่ได้ ใส่ได้เฉพาะ A และ B` };
  return { value: tokens as Who[] };
}

export const init = (variant: Variant, schedule: readonly Who[]): State => ({
  variant,
  schedule,
  k: 0,
  pc: { A: 0, B: 0 },
  note: false,
  notes: { A: false, B: false },
  milk: 0,
  holder: null,
  bought: [],
  verdictShown: false,
  event: { kind: 'init' },
});

const finished = (s: State, who: Who) => s.pc[who] >= code(s.variant, who).length;
export const allFinished = (s: State) => finished(s, 'A') && finished(s, 'B');
export const isDone = (s: State) => s.verdictShown;

/** Would `who` make no progress if it ran now (spinning or waiting for the lock)? */
function blocked(s: State, who: Who): boolean {
  const other: Who = who === 'A' ? 'B' : 'A';
  if (s.variant === 'lock') return s.pc[who] === 0 && s.holder !== null;
  if (s.variant === 'try3' && who === 'A') return s.pc.A === 1 && s.notes[other];
  return false;
}

export function step(s: State): State {
  if (allFinished(s)) return { ...s, verdictShown: true, event: { kind: 'verdict' } };

  // next actor: the schedule first (skipping finished threads), then whoever can still run
  let k = s.k;
  while (k < s.schedule.length && finished(s, s.schedule[k]!)) k++;
  let who: Who;
  if (k < s.schedule.length) {
    who = s.schedule[k]!;
    k++;
  } else {
    const order: Who[] = ['A', 'B'];
    who = order.find((w) => !finished(s, w) && !blocked(s, w)) ?? order.find((w) => !finished(s, w))!;
  }
  const other: Who = who === 'A' ? 'B' : 'A';
  const line = s.pc[who];
  const text = code(s.variant, who)[line]!.trim();
  const end = code(s.variant, who).length;
  const go = (next: number, patch: Partial<State>, note: string, tone: 'active' | 'waiting' | 'error' | 'done' = 'active'): State => ({
    ...s,
    ...patch,
    k,
    pc: { ...s.pc, [who]: next },
    event: { kind: 'line', who, line, text, note, tone },
  });
  const buy = (next: number) =>
    go(next, { milk: s.milk + 1, bought: [...s.bought, who] }, s.milk > 0 ? `${who} ซื้อนมมาอีก ทั้งที่ ${s.bought.join(', ')} ซื้อไปแล้ว ตอนนี้มีนม ${s.milk + 1} กล่อง — ผิด safety (ซื้อได้ไม่เกินหนึ่งคน)` : `${who} ไปซื้อนมมาใส่ตู้เย็น`, s.milk > 0 ? 'error' : 'done');
  const checkMilk = (ifNone: number, ifSome: number) =>
    s.milk === 0 ? go(ifNone, {}, `${who} เปิดตู้เย็น: ไม่มีนม จึงจะไปซื้อ (แต่ผลการตรวจนี้อาจล้าสมัยทันทีถ้าถูกสลับไป thread อื่นก่อนซื้อ)`) : go(ifSome, {}, `${who} เปิดตู้เย็น: มีนมแล้ว จึงไม่ซื้อ`);

  if (s.variant === 'try1') {
    switch (line) {
      case 0:
        return s.note ? go(end, {}, `${who} เห็น note จึงไม่ทำอะไรต่อ`) : go(1, {}, `${who} ไม่เห็น note จึงทำต่อ — ช่องโหว่: การตรวจ note กับการทิ้ง note เป็นคนละคำสั่ง อีกคนอาจตรวจแทรกเข้ามาก่อนที่ ${who} จะทิ้ง note`);
      case 1:
        return checkMilk(2, end);
      case 2:
        return go(3, { note: true }, `${who} ทิ้ง note ไว้ที่ตู้เย็น แต่สายไปแล้วถ้าอีกคนตรวจ note ผ่านไปก่อนหน้านี้`);
      case 3:
        return buy(4);
      default:
        return go(end, { note: false }, `${who} เอา note ออก`);
    }
  }

  if (s.variant === 'lock') {
    switch (line) {
      case 0:
        return s.holder === null ? go(1, { holder: who }, `lock ว่างอยู่ ${who} จึงได้ถือ lock การตรวจและการถือทำเป็น atomic จึงไม่มีใครแทรกได้`) : go(0, {}, `lock ถูก ${s.holder} ถืออยู่ ${who} ต้องรอจนกว่าจะ release`, 'waiting');
      case 1:
        return checkMilk(2, 3);
      case 2:
        return buy(3);
      default:
        return go(end, { holder: null }, `${who} ปล่อย lock ผู้ที่รออยู่จึง acquire ได้`);
    }
  }

  const spin = s.variant === 'try3' && who === 'A';
  // index of "remove note": the if-version has a closing brace before it
  const tail = spin ? 4 : 5;
  switch (line) {
    case 0:
      return go(1, { notes: { ...s.notes, [who]: true } }, `${who} ทิ้ง note ${who} ก่อนตรวจอะไรทั้งนั้น เพื่อประกาศว่ากำลังจะไปซื้อ`);
    case 1:
      if (spin) return s.notes[other] ? go(1, {}, `ยังมี note ${other} อยู่ A จึงวนรอ (busy-wait) จนกว่า B จะเอา note ออก`, 'waiting') : go(2, {}, `ไม่มี note ${other} แล้ว A จึงออกจาก loop — ณ จุดนี้ B ซื้อเสร็จไปแล้ว หรือ B จะเห็น note A แล้วถอย A จึงตรวจนมได้อย่างปลอดภัย`);
      return s.notes[other] ? go(tail, {}, `${who} เห็น note ${other} จึงไม่ซื้อ และข้ามไปเอา note ของตัวเองออก`) : go(2, {}, `${who} ไม่เห็น note ${other} จึงทำต่อ`);
    case 2:
      return checkMilk(3, tail);
    case 3:
      return buy(tail);
    default:
      return go(end, { notes: { ...s.notes, [who]: false } }, `${who} เอา note ${who} ออก`);
  }
}

export function verdict(s: State): { ok: boolean; title: string; body: string } {
  if (s.milk > 1) return { ok: false, title: `ผิด safety: ซื้อนม ${s.milk} กล่อง`, body: `ทั้ง ${s.bought.join(' และ ')} ไปซื้อ ทั้งที่ต้องซื้อไม่เกินหนึ่งคน` };
  if (s.milk === 0) return { ok: false, title: 'ผิด liveness: ไม่มีใครซื้อนม', body: 'ต่างคนต่างเห็น note ของอีกฝ่ายแล้วถอย นมจึงไม่มีทั้งที่จำเป็นต้องซื้อ' };
  return { ok: true, title: `ถูกต้อง: ${s.bought[0]} ซื้อคนเดียว`, body: 'มีนมหนึ่งกล่องพอดี ได้ทั้ง safety และ liveness ในลำดับนี้' };
}
