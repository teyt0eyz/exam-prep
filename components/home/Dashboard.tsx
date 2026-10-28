'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useNow } from '@/components/progress/ExamCountdown';
import { ExamSchedule } from '@/components/progress/ExamSchedule';
import { ChevronRightIcon } from '@/components/ui/icons';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Reveal } from '@/components/ui/Reveal';
import { card, display, eyebrow, h2 } from '@/components/ui/styles';
import { activityEvents, activitySummary, dayKey, overallAccuracy, type ActivityEvent } from '@/lib/activity';
import type { MapSubject } from '@/lib/constellation';
import { examCountdown, formatThaiDate } from '@/lib/exam';
import { bestMockPercent, learningProgress } from '@/lib/progress';
import { percent } from '@/lib/quiz/score';
import { useHydrated, useStore, type Store } from '@/lib/storage';
import { QUIZ_SETS, getSubject, lessonKey, setKey, type Subject } from '@/lib/subjects';
import { KnowledgeMap } from './KnowledgeMap';

const examStart = (s: Subject) => (s.exam ? Date.parse(`${s.exam.date}T${s.exam.start}:00+07:00`) : Infinity);
const examEnd = (s: Subject) => (s.exam ? Date.parse(`${s.exam.date}T${s.exam.end}:00+07:00`) : Infinity);

function greeting(now: Date | null): string {
  if (!now) return 'สวัสดี';
  const h = now.getHours();
  if (h < 5) return 'ดึกแล้วนะ';
  if (h < 11) return 'อรุณสวัสดิ์';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

interface NextStep {
  kicker: string;
  title: string;
  href: string;
  subject: Subject;
}

/** The one thing to do next, picked only from what the store says is unfinished. */
function nextStep(store: Store, subjects: MapSubject[], upcoming: Subject[]): NextStep | null {
  const lessonsOf = (id: string) => subjects.find((s) => s.id === id)?.lessons ?? [];
  const unread = (id: string) => lessonsOf(id).filter((l) => !store.lessonsRead[lessonKey(id, l.slug)]);

  const last = store.last;
  const lastSubject = last ? getSubject(last.subject) : undefined;
  if (last && lastSubject) {
    if (!store.lessonsRead[lessonKey(last.subject, last.slug)]) {
      return { kicker: 'อ่านต่อจากครั้งก่อน', title: last.title, href: `/${last.subject}/lesson/${last.slug}/`, subject: lastSubject };
    }
    const lessons = lessonsOf(last.subject);
    const after = lessons.slice(lessons.findIndex((l) => l.slug === last.slug) + 1);
    const next = after.find((l) => !store.lessonsRead[lessonKey(last.subject, l.slug)]);
    if (next) {
      return { kicker: 'บทถัดไป', title: next.title, href: `/${last.subject}/lesson/${next.slug}/`, subject: lastSubject };
    }
  }

  for (const subject of upcoming) {
    const first = unread(subject.id)[0];
    if (first) {
      return {
        kicker: store.last ? `เริ่มบทที่ยังไม่ได้อ่าน · ${subject.code}` : `เริ่มจากวิชาที่สอบก่อน · ${subject.code}`,
        title: first.title,
        href: `/${subject.id}/lesson/${first.slug}/`,
        subject,
      };
    }
    const set = QUIZ_SETS.find((n) => !store.best[setKey(subject.id, n)]);
    if (set) {
      return { kicker: `อ่านครบแล้ว ลองทำข้อสอบ · ${subject.code}`, title: `Mock ชุดที่ ${set}`, href: `/${subject.id}/quiz/set-${set}/`, subject };
    }
  }
  return null;
}

function relativeDay(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (days <= 0) return `วันนี้ ${time}`;
  if (days === 1) return `เมื่อวาน ${time}`;
  if (days < 7) return `${days} วันก่อน`;
  return formatThaiDate(dayKey(d));
}

export function Dashboard({ subjects }: { subjects: MapSubject[] }) {
  const store = useStore();
  const hydrated = useHydrated();
  const nowMs = useNow();
  const now = useMemo(() => (nowMs === null ? null : new Date(nowMs)), [nowMs]);

  const all = subjects.flatMap((s) => {
    const subject = getSubject(s.id);
    return subject ? [{ map: s, subject, p: learningProgress(store, s.id, s.lessons.map((l) => l.slug)) }] : [];
  });
  const upcoming = all
    .map((x) => x.subject)
    .filter((s) => nowMs === null || examEnd(s) > nowMs)
    .sort((a, b) => examStart(a) - examStart(b));
  const nearest = upcoming[0];
  const nearestCountdown = nearest?.exam && nowMs !== null ? examCountdown(nearest.exam, nowMs) : null;

  const lessonsRead = all.reduce((n, x) => n + x.p.lessonsRead, 0);
  const lessons = all.reduce((n, x) => n + x.p.lessons, 0);
  const setsDone = all.reduce((n, x) => n + x.p.setsDone, 0);
  const sets = all.reduce((n, x) => n + x.p.sets, 0);
  const overall = percent(lessonsRead + setsDone, lessons + sets);
  const accuracy = overallAccuracy(store);
  const events = useMemo(() => activityEvents(store), [store]);
  const summary = now ? activitySummary(events, now) : null;
  const step = hydrated ? nextStep(store, subjects, upcoming) : null;
  const fresh = hydrated && events.length === 0;

  const titleOf = (subject: string, slug: string) =>
    subjects.find((s) => s.id === subject)?.lessons.find((l) => l.slug === slug)?.title ?? slug;
  const maxWeek = Math.max(1, ...(summary?.week.map((d) => d.count) ?? [1]));
  const dash = (v: string | number) => (hydrated ? v : '–');

  return (
    <div className="flex flex-col gap-8 pt-2 lg:gap-12">
      {/* Hero: greeting, overall progress, next step, knowledge map */}
      <section
        aria-labelledby="hero-title"
        className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10"
      >
        <div className="flex flex-col gap-6">
          <div className="animate-rise">
            <p className={eyebrow}>{now ? formatThaiDate(dayKey(now)) : 'เตรียมสอบ CE ปี 2'}</p>
            <h1 id="hero-title" className={`${display} mt-1`}>
              {greeting(now)}
              <span className="block text-muted">
                {fresh ? 'มาเริ่มเตรียมสอบกัน' : 'วันนี้ไปต่อทีละบท'}
              </span>
            </h1>
            {nearest && nearestCountdown ? (
              <p className="mt-3 max-w-[46ch] text-[15px] leading-6 text-muted" data-accent={nearest.accent}>
                สอบวิชาถัดไปคือ <b className="text-ink">{nearest.short}</b>{' '}
                <span className="whitespace-nowrap font-semibold text-accent">{nearestCountdown.text}</span>
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-5" data-accent="os">
            <ProgressRing percent={hydrated ? overall : 0} label={`ความคืบหน้ารวมทุกวิชา ${overall}%`}>
              <span>
                <b className="block font-display text-[30px] leading-none">{dash(overall)}%</b>
                <span className="mt-1 block text-[12px] text-faint">ภาพรวม</span>
              </span>
            </ProgressRing>
            <p className="text-[14px] leading-[22px] text-muted">
              นับจากบทเรียนที่ทำเครื่องหมาย “อ่านแล้ว” และ Mock ที่ทำจบ รวม {lessons + sets} รายการ
            </p>
          </div>

          {step ? (
            <Link
              href={step.href}
              data-accent={step.subject.accent}
              className="lift group flex min-h-11 items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-card"
            >
              <span
                aria-hidden="true"
                className="grid h-11 w-11 flex-none place-items-center rounded-md bg-accent-soft text-accent"
              >
                <ChevronRightIcon strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold leading-[18px] text-accent">{step.kicker}</span>
                <span className="block text-pretty text-[16px] font-semibold leading-6">{step.title}</span>
              </span>
              <span className="hidden text-[14px] font-semibold text-accent transition-transform group-hover:translate-x-1 sm:block">
                ไปเลย
              </span>
            </Link>
          ) : hydrated ? (
            <p className={`${card} p-4 text-[15px] leading-6`}>อ่านครบและทำ Mock ครบทุกวิชาแล้ว ลองทำซ้ำชุดที่คะแนนน้อยที่สุดดู</p>
          ) : (
            <div className="h-[78px] rounded-lg border border-line bg-surface" aria-hidden="true" />
          )}
        </div>

        <div className="animate-pop rounded-lg border border-line bg-surface/70 p-3 shadow-card sm:p-4">
          <KnowledgeMap subjects={subjects} />
        </div>
      </section>

      {/* Real numbers only; dashes until the browser store is read. */}
      <section aria-labelledby="stats-title" className="flex flex-col gap-3">
        <h2 id="stats-title" className="sr-only">
          สถิติการเรียน
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat i={0} label="บทเรียนที่อ่านแล้ว" value={dash(lessonsRead)} unit={`/ ${lessons}`} tone="mint" />
          <Stat i={1} label="Mock ที่ทำจบ" value={dash(setsDone)} unit={`/ ${sets} ชุด`} tone="brand" />
          <Stat
            i={2}
            label="ตอบถูกเฉลี่ย"
            value={hydrated ? (accuracy ? `${percent(accuracy.correct, accuracy.total)}%` : 'ยังไม่มี') : '–'}
            unit={accuracy ? `${accuracy.correct}/${accuracy.total} ข้อ` : 'ทำ Mock แล้วจะแสดง'}
            tone="lavender"
          />
          <li>
            <Reveal delay={3 * 70} className={`${card} flex h-full flex-col gap-2 p-4`}>
              <p className="text-[13px] leading-5 text-muted">ทำต่อเนื่อง</p>
              <p className="font-display text-[26px] font-semibold leading-8">
                {summary ? summary.streak : '–'} <span className="text-[14px] font-normal text-faint">วัน</span>
              </p>
              <WeekBars week={summary?.week ?? null} max={maxWeek} />
            </Reveal>
          </li>
        </ul>
      </section>

      <Reveal>
        <ExamSchedule
          items={all.flatMap(({ subject, map }) =>
            subject.exam ? [{ subject: { ...subject, exam: subject.exam }, lessonSlugs: map.lessons.map((l) => l.slug) }] : [],
          )}
        />
      </Reveal>

      {/* Subjects: progress, best mock and exam date in one card each */}
      <section aria-labelledby="subjects-title" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={eyebrow}>เรียงตามวันสอบ</p>
            <h2 id="subjects-title" className={h2}>
              วิชาทั้งหมด
            </h2>
          </div>
        </div>
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...all]
            .sort((a, b) => examStart(a.subject) - examStart(b.subject))
            .map(({ subject, p }, i) => (
              <li key={subject.id}>
                <Reveal delay={i * 60} className="h-full">
                  <SubjectTile subject={subject} p={p} store={store} hydrated={hydrated} nowMs={nowMs} />
                </Reveal>
              </li>
            ))}
        </ol>
      </section>

      <section aria-labelledby="recent-title" className="flex flex-col gap-3">
        <h2 id="recent-title" className={h2}>
          กิจกรรมล่าสุด
        </h2>
        {!hydrated ? null : events.length === 0 ? (
          <p className="text-[15px] leading-6 text-muted">
            ยังไม่มีกิจกรรม เมื่ออ่านบทเรียนจบแล้วกด “อ่านแล้ว” หรือทำ Mock จบ รายการจะขึ้นที่นี่
          </p>
        ) : (
          <ul className={`${card} divide-y divide-line`}>
            {events.slice(0, 6).map((e) => (
              <ActivityRow key={`${e.kind}-${e.at}`} e={e} now={now} titleOf={titleOf} />
            ))}
          </ul>
        )}
        <p className="text-[12px] leading-[18px] text-faint">
          ความคืบหน้าและประวัติการทำข้อสอบเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
        </p>
      </section>
    </div>
  );
}

const toneClass = {
  mint: 'bg-mint',
  brand: 'bg-brand',
  lavender: 'bg-lavender',
} as const;

function Stat({
  i,
  label,
  value,
  unit,
  tone,
}: {
  i: number;
  label: string;
  value: string | number;
  unit: string;
  tone: keyof typeof toneClass;
}) {
  return (
    <li>
      <Reveal delay={i * 70} className={`${card} relative flex h-full flex-col gap-2 overflow-hidden p-4`}>
        <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${toneClass[tone]}`} />
        <p className="text-[13px] leading-5 text-muted">{label}</p>
        <p className="font-display text-[26px] font-semibold leading-8">
          {value} <span className="text-[14px] font-normal text-faint">{unit}</span>
        </p>
      </Reveal>
    </li>
  );
}

const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function WeekBars({ week, max }: { week: { day: string; date: Date; count: number }[] | null; max: number }) {
  if (!week) return <div className="h-10" aria-hidden="true" />;
  const active = week.filter((d) => d.count > 0).length;
  return (
    <div>
      <p className="sr-only">7 วันล่าสุด มีกิจกรรม {active} วัน</p>
      <ol aria-hidden="true" className="flex h-10 items-end gap-1">
        {week.map((d, i) => (
          <li key={d.day} className="flex flex-1 flex-col items-center gap-0.5">
            <span
              className={`w-full rounded-[3px] ${d.count > 0 ? 'bg-mint-strong' : 'bg-surface-3'}`}
              style={{ height: `${d.count > 0 ? 8 + (d.count / max) * 18 : 4}px` }}
            />
            <span className={`text-[10px] leading-3 ${i === 6 ? 'font-semibold text-ink' : 'text-faint'}`}>
              {DAY_SHORT[d.date.getDay()]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SubjectTile({
  subject,
  p,
  store,
  hydrated,
  nowMs,
}: {
  subject: Subject;
  p: ReturnType<typeof learningProgress>;
  store: Store;
  hydrated: boolean;
  nowMs: number | null;
}) {
  const best = bestMockPercent(store, subject.id);
  const countdown = subject.exam && nowMs !== null ? examCountdown(subject.exam, nowMs) : null;
  return (
    <Link
      href={`/${subject.id}/`}
      data-accent={subject.accent}
      className="lift group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-line bg-surface p-5 shadow-card"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-semibold text-accent">{subject.code}</p>
          <h3 className="text-pretty text-[17px] font-semibold leading-[26px]">{subject.title}</h3>
          <p className="text-[13px] leading-5 text-muted">{subject.titleTh}</p>
        </div>
        <ProgressRing percent={hydrated ? p.percent : 0} size={56} stroke={6} label={`ความคืบหน้า ${subject.short} ${p.percent}%`}>
          <b className="text-[13px]">{hydrated ? `${p.percent}%` : '–'}</b>
        </ProgressRing>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px] leading-[18px]">
        <div>
          <dt className="text-faint">บทเรียน</dt>
          <dd className="text-[14px] font-semibold">
            {hydrated ? p.lessonsRead : '–'}/{p.lessons}
          </dd>
        </div>
        <div>
          <dt className="text-faint">Mock สูงสุด</dt>
          <dd className="text-[14px] font-semibold">{hydrated ? (best === null ? 'ยังไม่ทำ' : `${best}%`) : '–'}</dd>
        </div>
        <div>
          <dt className="text-faint">สอบ</dt>
          <dd className="text-[14px] font-semibold text-accent">{countdown ? countdown.text.replace('เหลืออีก ', '') : '–'}</dd>
        </div>
      </dl>
    </Link>
  );
}

function ActivityRow({
  e,
  now,
  titleOf,
}: {
  e: ActivityEvent;
  now: Date | null;
  titleOf: (subject: string, slug: string) => string;
}) {
  const subject = getSubject(e.subject);
  if (!subject) return null;
  const href = e.kind === 'lesson' ? `/${e.subject}/lesson/${e.slug}/` : `/${e.subject}/quiz/set-${e.set}/`;
  return (
    <li data-accent={subject.accent}>
      <Link href={href} className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-surface-2">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 flex-none place-items-center rounded-md text-[12px] font-bold ${
            e.kind === 'lesson' ? 'bg-mint-soft text-ok' : 'bg-accent-soft text-accent'
          }`}
        >
          {e.kind === 'lesson' ? '✓' : 'Q'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-[22px]">
            {e.kind === 'lesson' ? `อ่านจบ: ${titleOf(e.subject, e.slug)}` : `ทำ Mock ชุดที่ ${e.set}: ${e.correct}/${e.total} ข้อ (${percent(e.correct, e.total)}%)`}
          </span>
          <span className="block text-[12px] leading-[18px] text-faint">
            {subject.short}
            {now ? ` · ${relativeDay(e.at, now)}` : ''}
          </span>
        </span>
      </Link>
    </li>
  );
}
