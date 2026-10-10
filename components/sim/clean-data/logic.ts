// Clean Data: docs/APP-BUSINESS/FutureSkill_Introduction to Data Analysis in Excel (1).pdf p.50–53
// (Identify Duplicates, Identify Errors, Handle Missing Values, Data Formatting; Max/Min and Filter checks).
import type { Parsed } from '@/components/sim/core/inputs';

export interface Customer {
  id: string;
  name: string;
  age: string;
  gender: string;
}

export type Issue = 'ok' | 'duplicate' | 'missing' | 'error' | 'format';

export interface Checked {
  issue: Issue;
  /** Column the issue was found in. */
  column?: keyof Customer;
  /** Value after tidying the format, when issue is 'format'. */
  fixed?: string;
}

export interface State {
  rows: readonly Customer[];
  /** Number of rows already checked. */
  pc: number;
  results: readonly Checked[];
  summarised: boolean;
}

export const AGE_MIN = 0;
export const AGE_MAX = 120;
const GENDERS: Record<string, string> = { male: 'Male', m: 'Male', ชาย: 'Male', female: 'Female', f: 'Female', หญิง: 'Female' };

/** One customer per line: "Customer ID, Name, Age, Gender". Empty cells are allowed (missing values). */
export function parseCustomers(text: string): Parsed<Customer[]> {
  const lines = text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: 'ใส่อย่างน้อย 2 แถว' };
  if (lines.length > 10) return { error: 'ใส่ได้ไม่เกิน 10 แถว' };
  const rows: Customer[] = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== 4) return { error: `แถว ${i + 1}: ต้องมี 4 ช่อง คือ Customer ID, Name, Age, Gender (เว้นว่างได้)` };
    if (cells.some((c) => c.length > 10)) return { error: `แถว ${i + 1}: แต่ละช่องยาวได้ไม่เกิน 10 ตัวอักษร` };
    const [id = '', name = '', age = '', gender = ''] = cells;
    if (!id) return { error: `แถว ${i + 1}: ต้องมี Customer ID` };
    rows.push({ id, name, age, gender });
  }
  return { value: rows };
}

/** Checks in the order the slides list them: duplicates, missing values, errors, formatting. */
export function check(row: Customer, earlier: readonly Customer[]): Checked {
  if (earlier.some((r) => r.id === row.id)) return { issue: 'duplicate', column: 'id' };
  for (const column of ['name', 'age', 'gender'] as const) {
    if (row[column] === '') return { issue: 'missing', column };
  }
  const age = Number(row.age);
  if (!Number.isFinite(age) || age < AGE_MIN || age > AGE_MAX) return { issue: 'error', column: 'age' };
  const gender = GENDERS[row.gender.toLowerCase()];
  if (!gender) return { issue: 'error', column: 'gender' };
  if (gender !== row.gender) return { issue: 'format', column: 'gender', fixed: gender };
  return { issue: 'ok' };
}

export const init = (rows: readonly Customer[]): State => ({ rows, pc: 0, results: [], summarised: false });
export const isDone = (state: State) => state.summarised;

export function step(state: State): State {
  if (state.summarised) return state;
  if (state.pc >= state.rows.length) return { ...state, summarised: true };
  const result = check(state.rows[state.pc]!, state.rows.slice(0, state.pc));
  return { ...state, pc: state.pc + 1, results: [...state.results, result] };
}

export const count = (state: State, issue: Issue) => state.results.filter((r) => r.issue === issue).length;
