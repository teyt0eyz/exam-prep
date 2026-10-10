'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { badge, btnPrimary, btnSecondary, card, h1, h3 } from '@/components/ui/styles';
import { SECONDS_PER_QUESTION } from '@/lib/quiz/config';
import { countCorrect } from '@/lib/quiz/score';
import { makeChoiceOrder } from '@/lib/quiz/shuffle';
import type { Answers, Question, QuizMode } from '@/lib/quiz/types';
import { attemptsFor, saveAttempt, useStore } from '@/lib/storage';
import { ExamMode } from './ExamMode';
import { PracticeMode } from './PracticeMode';

interface Props {
  subject: string;
  subjectCode: string;
  set: number;
  questions: Question[];
}

interface Session {
  mode: QuizMode;
  /** question id -> shuffled choice order for this sitting */
  orders: Record<string, number[]>;
  startedAt: number;
}

export function QuizRunner({ subject, subjectCode, set, questions }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const hasHistory = attemptsFor(useStore(), subject, set).length > 0;
  const resultHref = `/${subject}/quiz/set-${set}/result/`;
  const examSeconds = questions.length * SECONDS_PER_QUESTION;
  const title = `${subjectCode} · Mock ชุดที่ ${set}`;

  const start = (mode: QuizMode) => {
    // Shuffled here, in the click handler, so each sitting gets a fresh order and
    // nothing random runs during render.
    setSession({
      mode,
      orders: Object.fromEntries(questions.map((q) => [q.id, makeChoiceOrder()])),
      startedAt: Date.now(),
    });
  };

  const finish = (answers: Answers, flagged: string[]) => {
    if (!session) return;
    const finishedAt = Date.now();
    saveAttempt({
      id: String(finishedAt),
      subject,
      set,
      mode: session.mode,
      finishedAt: new Date(finishedAt).toISOString(),
      durationSec: Math.round((finishedAt - session.startedAt) / 1000),
      total: questions.length,
      correct: countCorrect(questions, answers),
      answers,
      flagged,
    });
    router.push(resultHref);
  };

  const exit = () => setSession(null);

  if (session?.mode === 'practice')
    return (
      <PracticeMode
        title={title}
        questions={questions}
        orders={session.orders}
        onFinish={finish}
        onExit={exit}
      />
    );
  if (session?.mode === 'exam')
    return (
      <ExamMode
        title={title}
        questions={questions}
        orders={session.orders}
        endAt={session.startedAt + examSeconds * 1000}
        onFinish={finish}
        onExit={exit}
      />
    );

  return (
    <div className="max-w-[760px] pt-1 lg:pt-0">
      <span className={badge}>{subjectCode}</span>
      <h1 className={`${h1} mt-2.5`}>Mock ชุดที่ {set}</h1>
      <p className="text-[15px] leading-6 text-muted">
        {questions.length} ข้อ · ลำดับตัวเลือกจะสลับใหม่ทุกครั้งที่เริ่มทำ
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className={`${card} flex flex-col gap-3.5 p-[18px]`}>
          <div>
            <h2 className={h3}>โหมดสอบ</h2>
            <p className="mt-1 text-[14px] leading-[22px] text-muted">
              จับเวลา {Math.round(examSeconds / 60)} นาที ข้ามข้อและทำเครื่องหมายทบทวนได้ เห็นเฉลยหลังส่งคำตอบ
              หมดเวลาแล้วส่งอัตโนมัติ
            </p>
          </div>
          <button type="button" className={`${btnPrimary} mt-auto w-full`} onClick={() => start('exam')}>
            เริ่มโหมดสอบ
          </button>
        </div>
        <div className={`${card} flex flex-col gap-3.5 p-[18px]`}>
          <div>
            <h2 className={h3}>โหมดฝึก</h2>
            <p className="mt-1 text-[14px] leading-[22px] text-muted">
              เฉลยพร้อมคำอธิบายทันทีหลังตอบแต่ละข้อ ไม่จับเวลา เหมาะกับการทบทวน
            </p>
          </div>
          <button type="button" className={`${btnSecondary} mt-auto w-full`} onClick={() => start('practice')}>
            เริ่มโหมดฝึก
          </button>
        </div>
      </div>
      {hasHistory ? (
        <Link href={resultHref} className={`${btnSecondary} mt-3 w-full md:w-auto`}>
          ดูผลครั้งล่าสุด
        </Link>
      ) : null}
    </div>
  );
}
