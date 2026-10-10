// Pivot Table: docs/APP-BUSINESS/FutureSkill_Create Report on Excel with Pivot Table and Pivot Chart.pdf
// p.9–15 (Invoice data, Gross Income per Branch) and p.20 (% of grand total).
import type { Parsed } from '@/components/sim/core/inputs';

export const ROW_FIELDS = ['branch', 'customer', 'payment'] as const;
export type RowField = (typeof ROW_FIELDS)[number];
export const VALUE_FIELDS = ['income', 'quantity'] as const;
export type ValueField = (typeof VALUE_FIELDS)[number];
export type Agg = 'sum' | 'count' | 'average';

export const FIELD_LABEL: Record<RowField | ValueField, string> = {
  branch: 'Branch',
  customer: 'Customer type',
  payment: 'Payment',
  income: 'Gross income',
  quantity: 'Quantity',
};
export const AGG_LABEL: Record<Agg, string> = { sum: 'Sum', count: 'Count', average: 'Average' };

export interface Invoice {
  branch: string;
  customer: string;
  payment: string;
  quantity: number;
  income: number;
}

export interface Config {
  rowField: RowField;
  valueField: ValueField;
  agg: Agg;
}

export interface Group {
  key: string;
  sum: number;
  count: number;
}

export type Event =
  | { kind: 'init' }
  | { kind: 'add'; row: number; key: string; amount: number; isNew: boolean }
  | { kind: 'total' };

export interface State {
  invoices: readonly Invoice[];
  config: Config;
  /** Number of source rows already summarised. */
  pc: number;
  groups: readonly Group[];
  showTotal: boolean;
  event: Event;
}

const MAX_ROWS = 12;

/** One invoice per line: "Branch, Customer type, Payment, Quantity, Gross income". */
export function parseInvoices(text: string): Parsed<Invoice[]> {
  const lines = text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: 'ใส่อย่างน้อย 2 แถว' };
  if (lines.length > MAX_ROWS) return { error: `ใส่ได้ไม่เกิน ${MAX_ROWS} แถว` };
  const invoices: Invoice[] = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split(',').map((c) => c.trim());
    const [branch, customer, payment, quantity, income] = cells;
    if (cells.length !== 5 || !branch || !customer || !payment) {
      return { error: `แถว ${i + 1}: ต้องมี 5 ค่า คือ Branch, Customer type, Payment, Quantity, Gross income` };
    }
    if ([branch, customer, payment].some((c) => c.length > 12)) return { error: `แถว ${i + 1}: ข้อความยาวได้ไม่เกิน 12 ตัวอักษร` };
    const q = Number(quantity);
    const g = Number(income);
    if (!Number.isInteger(q) || q < 0 || q > 999) return { error: `แถว ${i + 1}: Quantity ต้องเป็นจำนวนเต็ม 0–999` };
    if (!Number.isFinite(g) || g < 0 || g > 99999) return { error: `แถว ${i + 1}: Gross income ต้องเป็นตัวเลข 0–99999` };
    invoices.push({ branch, customer, payment, quantity: q, income: g });
  }
  return { value: invoices };
}

export const init = (invoices: readonly Invoice[], config: Config): State => ({
  invoices,
  config,
  pc: 0,
  groups: [],
  showTotal: false,
  event: { kind: 'init' },
});

export const isDone = (state: State) => state.showTotal;

export function step(state: State): State {
  if (state.showTotal) return state;
  if (state.pc >= state.invoices.length) return { ...state, showTotal: true, event: { kind: 'total' } };
  const invoice = state.invoices[state.pc]!;
  const key = invoice[state.config.rowField];
  const amount = invoice[state.config.valueField];
  const exists = state.groups.some((g) => g.key === key);
  const groups = exists
    ? state.groups.map((g) => (g.key === key ? { ...g, sum: g.sum + amount, count: g.count + 1 } : g))
    : [...state.groups, { key, sum: amount, count: 1 }];
  return { ...state, pc: state.pc + 1, groups, event: { kind: 'add', row: state.pc, key, amount, isNew: !exists } };
}

export function groupValue(group: Group, agg: Agg): number {
  if (agg === 'count') return group.count;
  return agg === 'sum' ? group.sum : group.sum / group.count;
}

/** Grand total follows the same aggregation over every summarised row. */
export function grandTotal(groups: readonly Group[], agg: Agg): number {
  const sum = groups.reduce((n, g) => n + g.sum, 0);
  const count = groups.reduce((n, g) => n + g.count, 0);
  if (agg === 'count') return count;
  return agg === 'sum' ? sum : count === 0 ? 0 : sum / count;
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
