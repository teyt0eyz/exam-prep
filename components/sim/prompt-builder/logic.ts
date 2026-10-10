// Business Prompting Formula: docs/APP-BUSINESS/AI Graphic with Nano Banana (Gemini) .pdf
// p.23 ([Subject] + [Art Style] + [Lighting/Camera] + [Mood] + [Exclusion]), p.28 (negative prompt at the end),
// p.29 (ratio per platform) and p.12–14, 17 (things to avoid: celebrities, copyrighted characters, famous logos).
import type { Parsed } from '@/components/sim/core/inputs';

export const PARTS = ['subject', 'style', 'light', 'mood', 'exclusion', 'ratio'] as const;
export type Part = (typeof PARTS)[number];

export const PART_LABEL: Record<Part, string> = {
  subject: 'Subject',
  style: 'Art Style',
  light: 'Lighting/Camera',
  mood: 'Mood',
  exclusion: 'Exclusion',
  ratio: 'Ratio',
};

export type Brief = Record<Part, string>;

export interface State {
  brief: Brief;
  /** How many parts have been considered so far. */
  pc: number;
  /** Parts actually written into the prompt, in order. */
  used: readonly Part[];
  checked: boolean;
}

const ALIASES: Record<string, Part> = { subject: 'subject', style: 'style', 'art style': 'style', light: 'light', lighting: 'light', camera: 'light', mood: 'mood', exclusion: 'exclusion', negative: 'exclusion', ratio: 'ratio' };

/** One part per line: "Subject = กล่องขนมคุกกี้". Lines may be left out. */
export function parseBrief(text: string): Parsed<Brief> {
  const brief: Brief = { subject: '', style: '', light: '', mood: '', exclusion: '', ratio: '' };
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const at = line.indexOf('=');
    if (at < 0) return { error: `"${line.slice(0, 16)}": ต้องเขียนเป็น ชื่อส่วน = ข้อความ เช่น Subject = กล่องขนมคุกกี้` };
    const part = ALIASES[line.slice(0, at).trim().toLowerCase()];
    if (!part) return { error: `ไม่รู้จักส่วน "${line.slice(0, at).trim()}" ใช้ได้: Subject, Style, Light, Mood, Exclusion, Ratio` };
    const value = line.slice(at + 1).trim();
    if (value.length > 90) return { error: `${PART_LABEL[part]}: ยาวได้ไม่เกิน 90 ตัวอักษร` };
    brief[part] = value;
  }
  if (!brief.subject) return { error: 'ต้องมี Subject (สิ่งที่จะขาย) เสมอ' };
  return { value: brief };
}

/** Words the slides warn against: celebrity faces, copyrighted characters, famous logos. */
const RISKY: { pattern: RegExp; reason: string }[] = [
  { pattern: /disney|marvel|mickey|pikachu|anime|โดราเอมอน|มิกกี้/i, reason: 'ตัวละครที่มีลิขสิทธิ์ (Mickey Mouse Rule)' },
  { pattern: /nike|apple|starbucks|coca|โค้ก|ไนกี้/i, reason: 'โลโก้หรือแบรนด์ดัง (เครื่องหมายการค้า)' },
  { pattern: /ดารา|ศิลปิน|นักการเมือง|celebrity|lisa|ลิซ่า/i, reason: 'ใบหน้าบุคคลดัง (Right of Publicity)' },
];

export function risks(brief: Brief): string[] {
  // The Exclusion part lists what to keep OUT of the image, so it is not scanned.
  const text = [brief.subject, brief.style, brief.light, brief.mood].join(' ');
  return RISKY.filter((r) => r.pattern.test(text)).map((r) => r.reason);
}

export const RATIO_USE: Record<string, string> = {
  '1:1': 'IG Post, FB Feed, Line',
  '9:16': 'TikTok, Reels, Shorts',
  '16:9': 'YouTube, FB Cover, Web',
  '4:5': 'IG Feed',
};

export function promptText(brief: Brief, used: readonly Part[]): string {
  return used
    .map((p) => (p === 'exclusion' ? `ไม่เอา: ${brief[p]}` : p === 'ratio' ? `สัดส่วน ${brief[p]}` : brief[p]))
    .join(' ');
}

export const init = (brief: Brief): State => ({ brief, pc: 0, used: [], checked: false });
export const isDone = (state: State) => state.checked;

export function step(state: State): State {
  if (state.checked) return state;
  if (state.pc >= PARTS.length) return { ...state, checked: true };
  const part = PARTS[state.pc]!;
  return { ...state, pc: state.pc + 1, used: state.brief[part] ? [...state.used, part] : state.used };
}
