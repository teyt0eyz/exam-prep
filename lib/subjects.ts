export type AccentKey = 'os' | 'ds' | 'net' | 'web' | 'biz';

/** Final exam slot, in Thailand time (UTC+7). */
export interface Exam {
  /** University course code. */
  courseCode: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
  room: string;
}

export interface Subject {
  id: string;
  /** Short code shown in badges. */
  code: string;
  title: string;
  /** Shorter title for the sidebar. */
  short: string;
  titleTh: string;
  /** Which --acc-* token pair this subject uses. */
  accent: AccentKey;
  /** Demo subject: proves the pipeline, exempt from the 70-question rule. */
  isDemo?: boolean;
  exam?: Exam;
}

export const QUIZ_SETS = [1, 2, 3] as const;
export const QUESTIONS_PER_SET = 70;

export const SUBJECTS: readonly Subject[] = [
  {
    id: 'os',
    code: 'OS',
    title: 'Operating Systems',
    short: 'Operating Systems',
    titleTh: 'ระบบปฏิบัติการ',
    accent: 'os',
    exam: { courseCode: '01076011', date: '2026-11-04', start: '13:30', end: '16:30', room: 'ME-303' },
  },
  {
    id: 'oods',
    code: 'OODS',
    title: 'Object Oriented Data Structures',
    short: 'OO Data Structures',
    titleTh: 'โครงสร้างข้อมูลเชิงวัตถุ',
    accent: 'ds',
    exam: { courseCode: '01076109', date: '2026-11-06', start: '09:30', end: '12:30', room: 'E12-607' },
  },
  {
    id: 'ist',
    code: 'IST',
    title: 'Internetworking Standards and Technologies',
    short: 'Internetworking',
    titleTh: 'มาตรฐานและเทคโนโลยีการเชื่อมต่อเครือข่าย',
    accent: 'net',
    exam: { courseCode: '01076040', date: '2026-11-10', start: '09:30', end: '12:30', room: 'E12-502' },
  },
  {
    id: 'webapp',
    code: 'WEB',
    title: 'Web Application Development',
    short: 'Web App Development',
    titleTh: 'การพัฒนาเว็บแอปพลิเคชัน',
    accent: 'web',
    exam: { courseCode: '01076119', date: '2026-11-02', start: '09:30', end: '12:30', room: 'E12-801' },
  },
  {
    id: 'biz',
    code: 'BIZ',
    title: 'Applications for Business',
    short: 'Apps for Business',
    titleTh: 'แอปพลิเคชันสำหรับธุรกิจ: AI, Excel, Google Sheet และ Notion',
    accent: 'biz',
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export const setKey = (subject: string, set: number) => `${subject}/set-${set}`;
export const lessonKey = (subject: string, slug: string) => `${subject}/${slug}`;
