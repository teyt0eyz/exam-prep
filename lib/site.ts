/** Sub-path the site is served under, e.g. "/exam-prep" on a GitHub Pages project site. Empty at a domain root. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** Public address of the site, including BASE_PATH and without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exam.chickyon.com').replace(/\/$/, '');
export const SITE_NAME = 'CE Exam Prep';
export const SITE_DESCRIPTION =
  'เตรียมสอบ CE ปี 2: บทเรียนพร้อม simulation แบบ interactive และข้อสอบจำลอง 5 วิชา — OS, OODS, IST, Web App Dev, Apps for Business';
