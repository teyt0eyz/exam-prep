'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { h1 } from '@/components/ui/styles';
import { formatExamDate, formatExamTime } from '@/lib/exam';
import { bestMockPercent } from '@/lib/progress';
import { percent } from '@/lib/quiz/score';
import { useHydrated, useStore } from '@/lib/storage';
import { lessonKey, type Subject } from '@/lib/subjects';
import { ExamCountdown } from './ExamCountdown';

interface Props {
  subject: Subject;
  lessons: { slug: string; title: string }[];
}

/**
 * The subject's "cover": its gradient, the way back to the study room, real
 * progress and the next lesson to read.
 */
export function SubjectHeader({ subject, lessons }: Props) {
  const store = useStore();
  const hydrated = useHydrated();
  const isRead = (slug: string) => Boolean(store.lessonsRead[lessonKey(subject.id, slug)]);
  const total = lessons.length;
  const read = lessons.filter((l) => isRead(l.slug)).length;
  const best = bestMockPercent(store, subject.id);

  const last = store.last?.subject === subject.id ? lessons.find((l) => l.slug === store.last?.slug) : undefined;
  const next = last && !isRead(last.slug) ? last : lessons.find((l) => !isRead(l.slug));
  const nextLabel = !hydrated ? null : next === last && last ? 'อ่านต่อ' : read === 0 ? 'เริ่มบทแรก' : 'บทถัดไป';

  return (
    <div
      data-accent={subject.accent}
      className="book-cover relative overflow-hidden rounded-[28px] bg-acc-grad p-4 pl-7 shadow-lift sm:p-6 sm:pl-10 lg:p-8 lg:pl-12"
    >
      {/* Spine and sheen */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-ink/10 sm:w-5" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/35 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex min-w-0 flex-col gap-3">
          <Link
            href="/"
            className="press inline-flex min-h-11 items-center gap-1 self-start rounded-full bg-white/70 pl-2 pr-4 text-[14px] font-medium text-ink shadow-card hover:bg-white/90"
          >
            <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
            กลับห้องอ่านหนังสือ
          </Link>
          <div>
            <p className="font-mono text-[13px] font-bold tracking-wide text-ink/80">{subject.code}</p>
            <h1 className={`${h1} animate-rise text-ink`}>{subject.title}</h1>
            <p className="text-[15px] leading-6 text-ink lg:text-[16px]">{subject.titleTh}</p>
          </div>
          {subject.exam && (
            <p className="flex flex-wrap items-center gap-2 text-[13px] leading-5">
              <span className="rounded-full bg-white/75 px-3 py-1 text-ink">
                สอบ Final {formatExamDate(subject.exam)} · {formatExamTime(subject.exam)} น. · ห้อง {subject.exam.room}
              </span>
              <ExamCountdown exam={subject.exam} className="!rounded-full" />
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-3.5 shadow-card sm:p-4 lg:w-[340px] lg:flex-none">
          <div className="flex items-center gap-4">
            <ProgressRing
              percent={hydrated ? percent(read, total) : 0}
              size={76}
              stroke={7}
              label={`อ่านแล้ว ${read} จาก ${total} หัวข้อ`}
            >
              <b className="font-display text-[17px] leading-none">{hydrated ? `${percent(read, total)}%` : '–'}</b>
            </ProgressRing>
            <dl className="grid flex-1 grid-cols-2 gap-2">
              <div>
                <dt className="text-[12px] leading-[18px] text-muted">อ่านแล้ว</dt>
                <dd className="text-[18px] font-semibold leading-7">
                  {hydrated ? read : '–'}
                  <span className="text-[13px] font-normal text-muted">/{total}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] leading-[18px] text-muted">Mock สูงสุด</dt>
                <dd className="text-[18px] font-semibold leading-7">
                  {!hydrated ? '–' : best === null ? <span className="text-[14px] font-medium">ยังไม่ทำ</span> : `${best}%`}
                </dd>
              </div>
            </dl>
          </div>
          {next && nextLabel ? (
            <Link
              href={`/${subject.id}/lesson/${next.slug}/`}
              className="press group flex min-h-12 items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-accent-ink shadow-card"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] leading-4 opacity-90">{nextLabel}</span>
                <span className="block truncate text-[15px] font-semibold leading-6">{next.title}</span>
              </span>
              <ChevronRightIcon className="flex-none transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
