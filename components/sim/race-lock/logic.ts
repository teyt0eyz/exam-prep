// Race on a shared counter, and the same code under a lock: docs/OS/05-Synchronization-part1_v2.pdf p.2, 6, 12–15.
import { type Parsed } from '@/components/sim/core/inputs';

export type Who = 'A' | 'B';

export const code = (lock: boolean) => (lock ? ['lock.acquire();', 'r = count;      // load', 'r = r + 1;      // add', 'count = r;      // store', 'lock.release();'] : ['r = count;      // load', 'r = r + 1;      // add', 'count = r;      // store']);

export type Ev =
  | { kind: 'init' }
  | { kind: 'line'; who: Who; line: number; note: string; tone: 'active' | 'waiting' | 'error' | 'done' }
  | { kind: 'verdict' };

export interface State {
  lock: boolean;
  rounds: number;
  schedule: readonly Who[];
  k: number;
  count: number;
  reg: Record<Who, number | null>;
  /** Value of count when the thread last loaded it. */
  seen: Record<Who, number>;
  line: Record<Who, number>;
  /** Completed increments per thread. */
  doneRounds: Record<Who, number>;
  holder: Who | null;
  lost: number;
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

export const init = (lock: boolean, rounds: number, schedule: readonly Who[]): State => ({
  lock,
  rounds,
  schedule,
  k: 0,
  count: 0,
  reg: { A: null, B: null },
  seen: { A: 0, B: 0 },
  line: { A: 0, B: 0 },
  doneRounds: { A: 0, B: 0 },
  holder: null,
  lost: 0,
  verdictShown: false,
  event: { kind: 'init' },
});

const finished = (s: State, w: Who) => s.doneRounds[w] >= s.rounds;
export const allFinished = (s: State) => finished(s, 'A') && finished(s, 'B');
export const isDone = (s: State) => s.verdictShown;
const blocked = (s: State, w: Who) => s.lock && s.line[w] === 0 && s.holder !== null && s.holder !== w;

export function step(s: State): State {
  if (allFinished(s)) return { ...s, verdictShown: true, event: { kind: 'verdict' } };
  let k = s.k;
  while (k < s.schedule.length && finished(s, s.schedule[k]!)) k++;
  let who: Who;
  if (k < s.schedule.length) who = s.schedule[k++]!;
  else {
    const order: Who[] = ['A', 'B'];
    who = order.find((w) => !finished(s, w) && !blocked(s, w)) ?? order.find((w) => !finished(s, w))!;
  }
  const other: Who = who === 'A' ? 'B' : 'A';
  const line = s.line[who];
  const last = code(s.lock).length - 1;
  const go = (patch: Partial<State>, note: string, tone: 'active' | 'waiting' | 'error' | 'done' = 'active', stay = false): State => {
    const wrap = !stay && line === last;
    return {
      ...s,
      ...patch,
      k,
      line: { ...s.line, [who]: stay ? line : wrap ? 0 : line + 1 },
      doneRounds: wrap ? { ...s.doneRounds, [who]: s.doneRounds[who] + 1 } : s.doneRounds,
      event: { kind: 'line', who, line, note, tone },
    };
  };
  // logical operation regardless of the lock lines
  const op = s.lock ? line - 1 : line;

  if (s.lock && line === 0)
    return s.holder === null ? go({ holder: who }, `lock ว่าง ${who} จึงได้ถือ lock และเข้า critical section ได้คนเดียว`) : go({}, `lock ถูก ${other} ถืออยู่ ${who} ต้องรอ จึงแทรกเข้ามากลาง load/add/store ของ ${other} ไม่ได้`, 'waiting', true);
  if (s.lock && line === last) return go({ holder: null }, `${who} ออกจาก critical section และปล่อย lock`, 'done');

  if (op === 0)
    return go(
      { reg: { ...s.reg, [who]: s.count }, seen: { ...s.seen, [who]: s.count } },
      `${who} อ่านค่า count (${s.count}) มาเก็บใน register ของตัวเอง${!s.lock && s.reg[other] !== null && s.line[other] !== 0 ? ` — ${other} ก็อ่านค่าไปแล้วแต่ยังไม่ได้เขียนกลับ ทั้งคู่จึงกำลังทำงานกับค่าเดิม` : ''}`,
    );
  if (op === 1) return go({ reg: { ...s.reg, [who]: s.reg[who]! + 1 } }, `${who} บวกหนึ่งใน register ได้ ${s.reg[who]! + 1} ค่า count ใน memory ยังไม่เปลี่ยน`);
  const stale = s.count !== s.seen[who];
  return go(
    { count: s.reg[who]!, reg: { ...s.reg, [who]: null }, lost: s.lost + (stale ? 1 : 0) },
    stale
      ? `${who} เขียน ${s.reg[who]} ลง count แต่ count ถูก ${other} เปลี่ยนเป็น ${s.count} ไปแล้วหลังจากที่ ${who} อ่าน การเขียนนี้จึงทับผลของ ${other} — การเพิ่มค่าหายไปหนึ่งครั้ง (lost update)`
      : `${who} เขียน ${s.reg[who]} ลง count`,
    stale ? 'error' : 'done',
  );
}
