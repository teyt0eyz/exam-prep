// Post button of the Excel accounting system: docs/APP-BUSINESS/FutureSkill_Excel for Accounting_Chapter 2.3.pptx.pdf p.3
// (1. Dr and Cr must balance, 2. summarise into the ledger and trial balance) and Chapter 2.1 p.5 (work flow).
import type { Parsed } from '@/components/sim/core/inputs';

export interface Line {
  side: 'Dr' | 'Cr';
  account: string;
  amount: number;
}

export interface Account {
  name: string;
  debit: number;
  credit: number;
}

export type Phase = 'read' | 'check' | 'post' | 'trial' | 'rejected';

export interface State {
  lines: readonly Line[];
  phase: Phase;
  /** Lines read (phase read) or posted (phase post). */
  pc: number;
  totalDr: number;
  totalCr: number;
  ledger: readonly Account[];
  /** Index of the line handled by the last step, if any. */
  current: number | null;
}

/** One journal line each: "Dr, เงินสด, 1000". */
export function parseLines(text: string): Parsed<Line[]> {
  const rows = text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  if (rows.length < 2) return { error: 'รายการหนึ่งต้องมีอย่างน้อย 2 บรรทัด (Dr และ Cr)' };
  if (rows.length > 8) return { error: 'ใส่ได้ไม่เกิน 8 บรรทัด' };
  const lines: Line[] = [];
  for (const [i, row] of rows.entries()) {
    const [side, account, amount] = row.split(',').map((c) => c.trim());
    const s = side?.toLowerCase();
    if (s !== 'dr' && s !== 'cr') return { error: `บรรทัด ${i + 1}: ต้องขึ้นต้นด้วย Dr หรือ Cr` };
    if (!account || account.length > 16) return { error: `บรรทัด ${i + 1}: ต้องมีชื่อบัญชี (ไม่เกิน 16 ตัวอักษร)` };
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > 9_999_999) return { error: `บรรทัด ${i + 1}: จำนวนเงินต้องเป็นตัวเลขมากกว่า 0` };
    lines.push({ side: s === 'dr' ? 'Dr' : 'Cr', account, amount: n });
  }
  return { value: lines };
}

export const init = (lines: readonly Line[]): State => ({ lines, phase: 'read', pc: 0, totalDr: 0, totalCr: 0, ledger: [], current: null });
export const isDone = (state: State) => state.phase === 'trial' || state.phase === 'rejected';

function post(ledger: readonly Account[], line: Line): Account[] {
  const add = (a: Account): Account => (line.side === 'Dr' ? { ...a, debit: a.debit + line.amount } : { ...a, credit: a.credit + line.amount });
  return ledger.some((a) => a.name === line.account)
    ? ledger.map((a) => (a.name === line.account ? add(a) : a))
    : [...ledger, add({ name: line.account, debit: 0, credit: 0 })];
}

export function step(state: State): State {
  switch (state.phase) {
    case 'read': {
      if (state.pc >= state.lines.length) {
        const balanced = state.totalDr === state.totalCr;
        return { ...state, phase: balanced ? 'check' : 'rejected', pc: 0, current: null };
      }
      const line = state.lines[state.pc]!;
      return {
        ...state,
        pc: state.pc + 1,
        current: state.pc,
        totalDr: state.totalDr + (line.side === 'Dr' ? line.amount : 0),
        totalCr: state.totalCr + (line.side === 'Cr' ? line.amount : 0),
      };
    }
    case 'check':
    case 'post': {
      if (state.pc >= state.lines.length) return { ...state, phase: 'trial', current: null };
      return { ...state, phase: 'post', pc: state.pc + 1, current: state.pc, ledger: post(state.ledger, state.lines[state.pc]!) };
    }
    default:
      return state;
  }
}

export const money = (n: number) => n.toLocaleString('en-US');
/** A ledger account's balance for the trial balance: positive = debit balance. */
export const balance = (a: Account) => a.debit - a.credit;
