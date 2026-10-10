/**
 * Validates content/<subject>/quiz/set-{1,2,3}.json.
 *
 *   npm run validate:quiz              all subjects
 *   npm run validate:quiz -- os        one subject
 *   npm run validate:quiz -- --strict  a missing set is an error, not a warning
 *
 * Errors exit 1 (and block `npm run build`); warnings do not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { QUESTIONS_PER_SET, QUIZ_SETS, SUBJECTS } from '../lib/subjects';

const MAX_ANSWER_SHARE = 0.35;
const LETTERS = ['A', 'B', 'C', 'D'];

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const only = args.filter((a) => !a.startsWith('--'));

const errors: string[] = [];
const warnings: string[] = [];

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** id -> file where it was first seen, across every subject and set */
const seenIds = new Map<string, string>();

function validateQuestion(q: unknown, where: string, err: (msg: string) => void): void {
  if (!isRecord(q)) return err(`${where}: not an object`);

  if (!isText(q.id)) err(`${where}: "id" must be a non-empty string`);
  if (!isText(q.topic)) err(`${where}: "topic" must be a non-empty string`);
  if (!isText(q.question)) err(`${where}: "question" must be a non-empty string`);
  if (!isText(q.explanation)) err(`${where}: "explanation" is missing or empty`);
  if (!isText(q.source)) err(`${where}: "source" is missing or empty`);
  if (!Number.isInteger(q.difficulty) || (q.difficulty as number) < 1 || (q.difficulty as number) > 3)
    err(`${where}: "difficulty" must be 1, 2 or 3`);
  if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) > 3)
    err(`${where}: "answer" must be an integer 0-3`);

  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    err(`${where}: "choices" must have exactly 4 items`);
  } else if (!q.choices.every(isText)) {
    err(`${where}: every choice must be a non-empty string`);
  } else if (new Set(q.choices.map(normalize)).size !== 4) {
    err(`${where}: choices must be distinct`);
  }
}

function validateSubject(subjectId: string, isDemo: boolean): void {
  /** normalized question text -> where it was first seen, across this subject's sets */
  const seenText = new Map<string, string>();
  let found = 0;

  for (const set of QUIZ_SETS) {
    const rel = path.join('content', subjectId, 'quiz', `set-${set}.json`);
    const file = path.join(process.cwd(), rel);
    if (!fs.existsSync(file)) {
      if (!isDemo) (strict ? errors : warnings).push(`${rel}: missing`);
      continue;
    }
    found += 1;
    const before = errors.length;
    const err = (msg: string) => errors.push(msg);

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      err(`${rel}: invalid JSON (${(e as Error).message})`);
      continue;
    }
    if (!Array.isArray(data)) {
      err(`${rel}: top level must be an array of questions`);
      continue;
    }
    if (!isDemo && data.length !== QUESTIONS_PER_SET)
      err(`${rel}: has ${data.length} questions, expected ${QUESTIONS_PER_SET}`);

    const answerCounts = [0, 0, 0, 0];
    data.forEach((q: unknown, i) => {
      const id = isRecord(q) && isText(q.id) ? q.id : undefined;
      const where = `${rel} #${i + 1}${id ? ` (${id})` : ''}`;
      validateQuestion(q, where, err);
      if (!isRecord(q)) return;

      if (id) {
        const first = seenIds.get(id);
        if (first) err(`${where}: duplicate id, first used in ${first}`);
        else seenIds.set(id, where);
      }
      if (isText(q.question)) {
        const text = normalize(q.question);
        const first = seenText.get(text);
        if (first) err(`${where}: duplicate question text, same as ${first}`);
        else seenText.set(text, where);
      }
      if (Number.isInteger(q.answer) && (q.answer as number) >= 0 && (q.answer as number) <= 3)
        answerCounts[q.answer as number]! += 1;
    });

    // Tiny demo sets can't be balanced meaningfully.
    const answered = answerCounts.reduce((a, b) => a + b, 0);
    if (!isDemo && answered > 0) {
      answerCounts.forEach((count, i) => {
        const share = count / answered;
        if (share > MAX_ANSWER_SHARE)
          warnings.push(
            `${rel}: answer ${LETTERS[i]} is correct in ${(share * 100).toFixed(0)}% of questions (> ${MAX_ANSWER_SHARE * 100}%)`,
          );
      });
    }

    const added = errors.length - before;
    console.log(`${added === 0 ? 'ok  ' : 'FAIL'} ${rel} — ${data.length} questions`);
  }

  if (found === 0 && !isDemo) console.log(`--   content/${subjectId}/quiz — no sets yet`);
}

const unknown = only.filter((id) => !SUBJECTS.some((s) => s.id === id));
if (unknown.length > 0) {
  console.error(`Unknown subject: ${unknown.join(', ')}. Known: ${SUBJECTS.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

for (const subject of SUBJECTS) {
  if (only.length > 0 && !only.includes(subject.id)) continue;
  validateSubject(subject.id, subject.isDemo === true);
}

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(`  warn  ${w}`));
}
if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error(`  error ${e}`));
  process.exit(1);
}
console.log('\nQuiz validation passed.');
