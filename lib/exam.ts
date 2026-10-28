import type { Exam } from './subjects';

const DAY_MS = 86_400_000;
const TH_OFFSET_MS = 7 * 3_600_000;
const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const at = (exam: Exam, time: string) => Date.parse(`${exam.date}T${time}:00+07:00`);
/** Calendar day number in Thailand time, so "days left" flips at local midnight. */
const thaiDay = (ms: number) => Math.floor((ms + TH_OFFSET_MS) / DAY_MS);

/** e.g. "จันทร์ 2 พ.ย. 2569". Built by hand so server and browser render the same text. */
export const formatExamDate = (exam: Exam) => formatThaiDate(exam.date);

/** "YYYY-MM-DD" -> "จันทร์ 2 พ.ย. 2569". */
export function formatThaiDate(date: string): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} ${y + 543}`;
}

export const formatExamTime = (exam: Exam) => `${exam.start}–${exam.end}`;

export type Urgency = 'far' | 'near' | 'urgent' | 'done';

export interface Countdown {
  text: string;
  urgency: Urgency;
}

export function examCountdown(exam: Exam, nowMs: number): Countdown {
  const start = at(exam, exam.start);
  if (nowMs >= at(exam, exam.end)) return { text: 'สอบแล้ว', urgency: 'done' };
  if (nowMs >= start) return { text: 'กำลังสอบ', urgency: 'urgent' };

  const days = thaiDay(start) - thaiDay(nowMs);
  if (days >= 2) return { text: `เหลืออีก ${days} วัน`, urgency: days <= 7 ? 'near' : 'far' };
  if (days === 1) return { text: 'สอบพรุ่งนี้', urgency: 'urgent' };

  const minutes = Math.ceil((start - nowMs) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { text: `สอบวันนี้ · อีก ${h > 0 ? `${h} ชม. ` : ''}${m} นาที`, urgency: 'urgent' };
}
