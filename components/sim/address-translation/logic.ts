// Address translation: docs/OS/07-address_v4.pdf p.6–21.
import { type Parsed } from '@/components/sim/core/inputs';

export type Mode = 'base' | 'segment' | 'page';
export type Access = 'r' | 'w' | 'x';
export interface Ref {
  access: Access;
  address: number;
}

export interface Segment {
  name: string;
  /** null = segment not allocated. */
  start: number | null;
  length: number;
  perms: string;
}

export interface Config {
  mode: Mode;
  refs: readonly Ref[];
  base: number;
  bound: number;
  segments: readonly Segment[];
  /** Offset width in bits. */
  offsetBits: number;
  /** Frame number per page; null = invalid. */
  pageTable: readonly (number | null)[];
}

export interface Stage {
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  /** Table row to highlight. */
  row?: number;
  /** Fields known so far. */
  index?: number;
  offset?: number;
  physical?: number;
}

export const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;
const both = (n: number) => (n < 10 ? `${n}` : `${hex(n)} (${n})`);

function num(text: string): number | null {
  const t = text.trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

export function parseNumber(text: string): Parsed<number> {
  const n = num(text);
  if (n === null || n > 0xfffff) return { error: 'ใส่เลขฐานสิบ หรือฐานสิบหกขึ้นต้นด้วย 0x (ไม่เกิน 0xFFFFF)' };
  return { value: n };
}

export function parseRefs(text: string): Parsed<Ref[]> {
  const tokens = text.split(/[,\n;]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { error: 'ใส่อย่างน้อย 1 address เช่น r 0x240' };
  if (tokens.length > 8) return { error: 'ใส่ได้ไม่เกิน 8 address' };
  const refs: Ref[] = [];
  for (const token of tokens) {
    const m = /^(?:([rwx])\s+)?(\S+)$/i.exec(token);
    const address = m ? num(m[2]!) : null;
    if (!m || address === null || address > 0xfffff) return { error: `อ่าน "${token}" ไม่ได้ รูปแบบคือ r|w|x ตามด้วย address เช่น w 0x1108` };
    refs.push({ access: (m[1]?.toLowerCase() ?? 'r') as Access, address });
  }
  return { value: refs };
}

export function parseSegments(text: string): Parsed<Segment[]> {
  const rows = text.split(/[;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (rows.length < 1 || rows.length > 4) return { error: 'ใส่ 1–4 segment คั่นด้วย ; เช่น code 0x4000 0x700 rx' };
  const segments: Segment[] = [];
  for (const row of rows) {
    const p = row.split(/\s+/);
    if (p.length >= 2 && p[1] === '-') {
      segments.push({ name: p[0]!, start: null, length: 0, perms: '' });
      continue;
    }
    const start = p[1] ? num(p[1]) : null;
    const length = p[2] ? num(p[2]) : null;
    const perms = (p[3] ?? 'rw').toLowerCase();
    if (p.length < 3 || start === null || length === null || !/^[rwx]+$/.test(perms))
      return { error: `อ่าน "${row}" ไม่ได้ รูปแบบคือ ชื่อ start length สิทธิ์ เช่น code 0x4000 0x700 rx (segment ที่ยังไม่จองใช้ heap -)` };
    segments.push({ name: p[0]!, start, length, perms });
  }
  return { value: segments };
}

export function parsePageTable(text: string): Parsed<(number | null)[]> {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 8) return { error: 'ใส่ frame ของแต่ละ page 1–8 ตัว เช่น 4, 3, 1 (ใช้ - สำหรับ page ที่ invalid)' };
  const table: (number | null)[] = [];
  for (const p of parts) {
    if (p === '-') table.push(null);
    else {
      const n = num(p);
      if (n === null || n > 255) return { error: `"${p}" ไม่ใช่หมายเลข frame (0–255 หรือ -)` };
      table.push(n);
    }
  }
  return { value: table };
}

const ACCESS: Record<Access, string> = { r: 'อ่าน', w: 'เขียน', x: 'execute' };

/** The steps hardware takes to translate one reference. */
export function stagesFor(c: Config, ref: Ref): Stage[] {
  const va = ref.address;
  const what = `${ACCESS[ref.access]} virtual address ${both(va)}`;

  if (c.mode === 'base') {
    const out: Stage[] = [
      {
        title: `ตรวจกับ bound: ${hex(va)} < ${hex(c.bound)} ?`,
        body: `${what} — hardware เทียบ virtual address กับ bound register (${both(c.bound)}) ด้วย comparator ก่อน เพื่อไม่ให้ process เข้าถึง memory นอกขอบเขตของตัวเอง`,
        tone: 'active',
      },
    ];
    if (va >= c.bound)
      out.push({ title: 'virtual address ≥ bound → raise exception', body: `${both(va)} ไม่น้อยกว่า bound ${both(c.bound)} จึงอยู่นอกพื้นที่ของ process hardware raise exception แล้ว kernel เข้ามาจัดการ (ปกติคือหยุด process)`, tone: 'error' });
    else
      out.push({
        title: `physical = base + virtual = ${hex(c.base + va)}`,
        body: `ผ่านการตรวจ จึงบวกด้วย base register: ${hex(c.base)} + ${hex(va)} = ${both(c.base + va)} ใช้แค่ register 2 ตัว, adder และ comparator จึงเร็ว แต่ไม่มีการตรวจสิทธิ์ ${ACCESS[ref.access]} แยกตามส่วน จึงกัน process เขียนทับ code ของตัวเองไม่ได้`,
        tone: 'done',
        physical: c.base + va,
      });
    return out;
  }

  const offsetMask = (1 << c.offsetBits) - 1;
  const index = va >> c.offsetBits;
  const offset = va & offsetMask;

  if (c.mode === 'segment') {
    const out: Stage[] = [
      {
        title: `แยก address: segment ${index}, offset ${hex(offset)}`,
        body: `${what} — ${c.offsetBits} bit ล่างเป็น offset ส่วน bit ที่เหลือด้านบนเป็นหมายเลข segment: ${hex(va)} → segment # = ${index}, offset = ${both(offset)}`,
        tone: 'active',
        index,
        offset,
      },
    ];
    const seg = c.segments[index];
    if (!seg || seg.start === null) {
      out.push({ title: `segment ${index} ไม่มีในตาราง → exception`, body: `segment table ไม่มีรายการที่ใช้ได้สำหรับ segment ${index}${seg ? ` (${seg.name} ยังไม่ถูกจอง)` : ''} จึง raise exception`, tone: 'error', row: seg ? index : undefined, index, offset });
      return out;
    }
    out.push({
      title: `เปิด segment table แถว ${index} (${seg.name})`,
      body: `ได้ start = ${hex(seg.start)}, length = ${hex(seg.length)}, สิทธิ์ = ${seg.perms} — ต้องตรวจสองอย่าง: offset ต้องน้อยกว่า length และชนิดการเข้าถึงต้องได้รับอนุญาต`,
      tone: 'waiting',
      row: index,
      index,
      offset,
    });
    if (offset >= seg.length)
      out.push({ title: 'offset ≥ length → exception', body: `offset ${hex(offset)} ไม่น้อยกว่า length ${hex(seg.length)} จึงเลยขอบ segment ${seg.name} hardware raise exception (ถ้าเป็น stack หรือ heap kernel อาจขยาย segment ให้แล้วทำคำสั่งเดิมซ้ำ)`, tone: 'error', row: index, index, offset });
    else if (!seg.perms.includes(ref.access))
      out.push({ title: `ไม่มีสิทธิ์ ${ACCESS[ref.access]} → exception`, body: `segment ${seg.name} อนุญาตแค่ ${seg.perms} จึง${ACCESS[ref.access]}ไม่ได้ นี่คือสิ่งที่ segmentation ทำได้แต่ base and bounds ทำไม่ได้: กัน code ไม่ให้ถูกเขียนทับ`, tone: 'error', row: index, index, offset });
    else
      out.push({
        title: `physical = start + offset = ${hex(seg.start + offset)}`,
        body: `ผ่านทั้งสองการตรวจ: ${hex(seg.start)} + ${hex(offset)} = ${both(seg.start + offset)}`,
        tone: 'done',
        row: index,
        index,
        offset,
        physical: seg.start + offset,
      });
    return out;
  }

  const size = 1 << c.offsetBits;
  const out: Stage[] = [
    {
      title: `แยก address: page ${index}, offset ${offset}`,
      body: `${what} — page มีขนาด ${size} (offset ${c.offsetBits} bit): page # = ${va} ÷ ${size} = ${index}, offset = ${va} mod ${size} = ${offset}`,
      tone: 'active',
      index,
      offset,
    },
  ];
  if (index >= c.pageTable.length) {
    out.push({ title: `page ${index} เกิน page table length → exception`, body: `page table มี ${c.pageTable.length} รายการ (page 0–${c.pageTable.length - 1}) hardware เทียบกับ register page table length แล้วพบว่าเกิน จึง raise exception`, tone: 'error', index, offset });
    return out;
  }
  const frame = c.pageTable[index];
  if (frame === null || frame === undefined) {
    out.push({ title: `page ${index} invalid → page fault`, body: `รายการของ page ${index} ใน page table ถูกทำเครื่องหมายว่า invalid จึงเกิด exception (page fault) ให้ kernel จัดการ เช่น อ่าน page จาก disk แบบ demand paging`, tone: 'error', row: index, index, offset });
    return out;
  }
  out.push({ title: `เปิด page table แถว ${index} → frame ${frame}`, body: `page table เก็บหมายเลข frame ของแต่ละ page: page ${index} อยู่ที่ frame ${frame} ส่วน offset ไม่ต้องแปลง ใช้ค่าเดิม`, tone: 'waiting', row: index, index, offset });
  out.push({
    title: `physical = frame × ${size} + offset = ${both(frame * size + offset)}`,
    body: `นำ frame # มาต่อกับ offset: ${frame} × ${size} + ${offset} = ${both(frame * size + offset)} ทุก page ขนาดเท่ากัน จึงไม่ต้องตรวจ length ของแต่ละ page และไม่เกิด external fragmentation`,
    tone: 'done',
    row: index,
    index,
    offset,
    physical: frame * size + offset,
  });
  return out;
}

export interface State {
  config: Config;
  /** Reference being translated. */
  ref: number;
  /** Stage shown for it; -1 before the first step. */
  stage: number;
  stages: readonly Stage[];
  results: readonly (number | null)[];
}

export const init = (config: Config): State => ({ config, ref: 0, stage: -1, stages: stagesFor(config, config.refs[0]!), results: [] });

export const isDone = (s: State) => s.ref === s.config.refs.length - 1 && s.stage === s.stages.length - 1;

export function step(s: State): State {
  if (isDone(s)) return s;
  if (s.stage < s.stages.length - 1) {
    const stage = s.stage + 1;
    const last = stage === s.stages.length - 1;
    return { ...s, stage, results: last ? [...s.results, s.stages[stage]!.physical ?? null] : s.results };
  }
  const ref = s.ref + 1;
  const stages = stagesFor(s.config, s.config.refs[ref]!);
  return { ...s, ref, stage: 0, stages, results: stages.length === 1 ? [...s.results, stages[0]!.physical ?? null] : s.results };
}
