'use client';

import Link from 'next/link';
import { useState } from 'react';
import { btnGhost, btnPrimary, btnSecondary, card, display, h1, h3 } from '@/components/ui/styles';
import { formatDuration, percent, scoreByTopic } from '@/lib/quiz/score';
import type { Attempt, Question } from '@/lib/quiz/types';
import { attemptsFor, useHydrated, useStore } from '@/lib/storage';
import { setKey } from '@/lib/subjects';
import { ScoreRing } from './ScoreRing';

interface Props {
  subject: string;
  set: number;
  questions: Question[];
}

const MODE_LABEL = { practice: 'โหมดฝึก', exam: 'โหมดสอบ' } as const;
const tag = 'flex-none rounded-sm px-2 py-px text-[12px] font-medium leading-[20px]';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function ReviewItem({ question, number, attempt }: { question: Question; number: number; attempt: Attempt }) {
  const selected = attempt.answers[question.id];
  const correct = selected === question.answer;

  return (
    <li className={`${card} grid gap-2.5 p-4 lg:grid-cols-2 lg:gap-8 lg:px-7 lg:py-6`}>
      <div className="flex flex-col gap-2.5">
        <p className="text-[12px] font-medium leading-[18px] text-faint lg:text-[13px]">
          ข้อ {number} · {question.topic}
          {attempt.flagged.includes(question.id) ? ' · ทำเครื่องหมายทบทวนไว้' : ''}
        </p>
        <p className="whitespace-pre-wrap text-[16px] font-semibold leading-[26px] lg:text-[17px] lg:leading-7">
          {question.question}
        </p>
        {!correct ? (
          <div className="flex items-start gap-2.5 text-[14px] leading-[22px] lg:text-[15px] lg:leading-6">
            <span className={`${tag} bg-bad-soft text-bad`}>คุณตอบ</span>
            {selected === undefined ? (
              <span className="text-muted">ไม่ได้ตอบ</span>
            ) : (
              <span className="whitespace-pre-wrap text-muted line-through">{question.choices[selected]}</span>
            )}
          </div>
        ) : null}
        <div className="flex items-start gap-2.5 text-[14px] leading-[22px] lg:text-[15px] lg:leading-6">
          <span className={`${tag} bg-ok-soft text-ok`}>{correct ? 'ตอบถูก' : 'เฉลย'}</span>
          <b className="whitespace-pre-wrap">{question.choices[question.answer]}</b>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-2.5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <p className="hidden text-[13px] font-medium leading-[18px] text-faint lg:block">คำอธิบาย</p>
        <p className="whitespace-pre-wrap text-[14px] leading-6 text-muted lg:text-[15px] lg:leading-[26px]">
          {question.explanation}
        </p>
        <p className="text-[12px] leading-[18px] text-faint">ที่มา: {question.source}</p>
      </div>
    </li>
  );
}

export function ResultView({ subject, set, questions }: Props) {
  const hydrated = useHydrated();
  const store = useStore();
  const attempts = attemptsFor(store, subject, set);
  const [showAll, setShowAll] = useState(false);
  const quizHref = `/${subject}/quiz/set-${set}/`;
  const attempt = attempts[0];

  if (!hydrated) return <p className="mt-8 text-center text-muted">กำลังโหลดผล…</p>;

  if (!attempt)
    return (
      <div className="py-10 text-center">
        <h1 className={h1}>ยังไม่มีผลสอบ</h1>
        <p className="mt-2 text-muted">ยังไม่เคยทำข้อสอบชุดนี้บนเบราว์เซอร์นี้</p>
        <Link href={quizHref} className={`${btnPrimary} mt-6`}>
          ไปทำข้อสอบ
        </Link>
      </div>
    );

  const topics = scoreByTopic(questions, attempt.answers);
  const wrong = questions.filter((q) => attempt.answers[q.id] !== q.answer);
  const reviewed = showAll ? questions : wrong;
  const best = store.best[setKey(subject, set)];

  return (
    <div className="flex flex-col gap-5 pt-2 lg:gap-7 lg:pt-0">
      <h1 className="sr-only">ผลการสอบ</h1>
      <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
        <div className="flex flex-col gap-5 lg:rounded-lg lg:border lg:border-line lg:bg-surface lg:p-7">
          <div className="flex items-center gap-5 lg:gap-6">
            <ScoreRing percent={percent(attempt.correct, attempt.total)} className="lg:h-[136px] lg:w-[136px]" />
            <div>
              <p className="text-[14px] leading-[22px] text-muted">คะแนนของคุณ</p>
              <p className={display}>
                {attempt.correct} / {attempt.total}
              </p>
              <p className="text-[14px] leading-[22px] text-faint">
                ใช้เวลา {formatDuration(attempt.durationSec)}
                {best ? ` · สูงสุด ${percent(best.correct, best.total)}%` : ''}
              </p>
              <p className="text-[12px] leading-[18px] text-faint">
                {MODE_LABEL[attempt.mode]} · {formatDate(attempt.finishedAt)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href={quizHref} className={`${btnSecondary} px-3`}>
              ทำอีกครั้ง
            </Link>
            <Link href={`/${subject}/`} className={`${btnPrimary} px-3 text-[15px]`}>
              กลับหน้าวิชา
            </Link>
          </div>
        </div>

        <section className={`${card} flex flex-col gap-3.5 p-[18px] lg:gap-4 lg:p-7`}>
          <h2 className={h3}>ผลรายหัวข้อ</h2>
          <ul className="flex flex-col gap-3.5">
            {topics.map((t) => {
              const ratio = t.correct / t.total;
              const tone = ratio === 1 ? 'ok' : ratio >= 0.5 ? 'warn' : 'bad';
              return (
                <li key={t.topic} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-[14px] leading-[22px]">
                    <span className="min-w-0">{t.topic}</span>
                    <span
                      className={`flex-none font-mono font-semibold ${
                        tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-bad'
                      }`}
                    >
                      {t.correct}/{t.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 lg:h-2">
                    <div
                      className={`h-full rounded-full ${
                        tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-bad'
                      }`}
                      style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3 lg:gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 className="text-[17px] font-semibold leading-[26px] lg:text-[21px] lg:leading-[30px]">
            {showAll ? `ทุกข้อ (${questions.length})` : `ข้อที่ตอบผิด (${wrong.length})`}
          </h2>
          <button type="button" className={btnGhost} onClick={() => setShowAll(!showAll)}>
            {showAll ? 'ดูเฉพาะข้อผิด' : 'ดูทุกข้อ'}
          </button>
        </div>
        {reviewed.length === 0 ? (
          <p className="rounded-lg bg-ok-soft px-4 py-4 text-center font-medium text-ok">ไม่มีข้อผิดเลย เยี่ยมมาก</p>
        ) : (
          <ol className="flex flex-col gap-3 lg:gap-3.5">
            {reviewed.map((q) => (
              <ReviewItem key={q.id} question={q} number={questions.indexOf(q) + 1} attempt={attempt} />
            ))}
          </ol>
        )}
      </section>

      {attempts.length > 1 ? (
        <section className="flex flex-col gap-3">
          <h2 className={h3}>ประวัติการทำชุดนี้</h2>
          <ul className={`${card} divide-y divide-line text-[14px] leading-[22px]`}>
            {attempts.slice(0, 10).map((a, i) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 text-muted">
                  {formatDate(a.finishedAt)} · {MODE_LABEL[a.mode]}
                  {i === 0 ? ' (ล่าสุด)' : ''}
                </span>
                <span className="flex-none font-mono font-semibold">
                  {a.correct}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
