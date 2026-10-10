'use client';

import { useEffect, useRef, useState } from 'react';
import { GridIcon } from '@/components/ui/icons';
import { btnPrimary, btnSecondary } from '@/components/ui/styles';
import { formatDuration } from '@/lib/quiz/score';
import type { Answers, Question } from '@/lib/quiz/types';
import { Navigator } from './Navigator';
import { QuestionCard } from './QuestionCard';
import { QuizFrame, type SegmentTone } from './QuizFrame';

interface Props {
  title: string;
  questions: Question[];
  orders: Record<string, number[]>;
  /** Epoch ms when time runs out. */
  endAt: number;
  onFinish: (answers: Answers, flagged: string[]) => void;
  onExit: () => void;
}

const LOW_TIME_SEC = 2 * 60;

export function ExamMode({ title, questions, orders, endAt, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sheetRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);

  // Remaining time is derived from the wall clock, so a backgrounded tab
  // (throttled timers) still shows the right value when it comes back.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    onFinish(answers, flagged);
  };

  const timeUp = remaining === 0;
  useEffect(() => {
    // submit reads the latest answers; only the time-up edge should trigger it
    if (timeUp) submit();
  }, [timeUp]);

  const question = questions[index];
  if (!question) return null;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const isFlagged = flagged.includes(question.id);
  const isLast = index === questions.length - 1;

  const goTo = (i: number) => {
    setIndex(Math.min(questions.length - 1, Math.max(0, i)));
    scrollRef.current?.scrollTo(0, 0);
  };
  const toggleFlag = () =>
    setFlagged((f) => (isFlagged ? f.filter((id) => id !== question.id) : [...f, question.id]));
  const openSheet = () => sheetRef.current?.showModal();
  const closeSheet = () => sheetRef.current?.close();
  // On desktop the navigator is always visible in the right column, so "submit"
  // on the last question starts the confirm step there instead of opening the sheet.
  const askSubmit = () => {
    setConfirming(true);
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    openSheet();
  };

  const segments: SegmentTone[] = questions.map((q, i) =>
    i === index ? 'current' : answers[q.id] !== undefined ? 'answered' : 'todo',
  );
  const navigator = (
    <Navigator
      questions={questions}
      answers={answers}
      flagged={flagged}
      index={index}
      onJump={(i) => {
        goTo(i);
        closeSheet();
      }}
      confirming={confirming}
      onConfirming={setConfirming}
      onSubmit={submit}
    />
  );
  const prevButton = (
    <button type="button" className={btnSecondary} onClick={() => goTo(index - 1)} disabled={index === 0}>
      ‹ ก่อนหน้า
    </button>
  );
  const nextButton = isLast ? (
    <button type="button" className={btnPrimary} onClick={askSubmit}>
      ส่งคำตอบ
    </button>
  ) : (
    <button type="button" className={btnPrimary} onClick={() => goTo(index + 1)}>
      ถัดไป ›
    </button>
  );

  return (
    <QuizFrame
      title={title}
      position={`ข้อ ${index + 1} / ${questions.length}`}
      segments={segments}
      scrollRef={scrollRef}
      onExit={onExit}
      exitWarning="คำตอบของรอบนี้จะไม่ถูกบันทึก"
      status={
        <span
          role="timer"
          aria-label="เวลาที่เหลือ"
          className={`rounded-[10px] bg-surface-2 px-3 py-2 font-mono text-[16px] font-semibold leading-6 lg:bg-transparent lg:text-[20px] ${
            remaining < LOW_TIME_SEC ? 'text-bad' : 'text-ink'
          }`}
        >
          {formatDuration(remaining)}
        </span>
      }
      aside={navigator}
      footerMobileOnly
      footer={
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5">
          {prevButton}
          <button
            type="button"
            aria-label={`ดูข้อสอบทั้งหมด ตอบแล้ว ${answeredCount} จาก ${questions.length} ข้อ`}
            onClick={openSheet}
            className="flex min-h-12 min-w-16 items-center justify-center gap-2 rounded-md bg-surface-2 px-3 font-mono text-[14px] font-semibold text-ink"
          >
            <GridIcon width={16} height={16} />
            {answeredCount}/{questions.length}
          </button>
          {nextButton}
        </div>
      }
    >
      <QuestionCard
        question={question}
        order={orders[question.id] ?? [0, 1, 2, 3]}
        selected={answers[question.id]}
        onSelect={(choice) => setAnswers((a) => ({ ...a, [question.id]: choice }))}
      />
      <button
        type="button"
        aria-pressed={isFlagged}
        onClick={toggleFlag}
        className={`flex min-h-11 items-center gap-2.5 self-start rounded-md border px-3.5 text-[14px] font-medium ${
          isFlagged ? 'border-warn bg-warn-soft text-warn' : 'border-line text-muted'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-[2px] ${isFlagged ? 'bg-warn' : 'border-2 border-faint'}`}
        />
        {isFlagged ? 'ทำเครื่องหมายทบทวนแล้ว' : 'ทำเครื่องหมายทบทวน'}
      </button>
      <div className="mt-3 hidden justify-between lg:flex">
        {prevButton}
        {nextButton}
      </div>

      {/* Mobile navigator as a bottom sheet. <dialog> gives focus trapping and Esc for free. */}
      <dialog
        ref={sheetRef}
        onClose={() => setConfirming(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeSheet();
        }}
        aria-label="ข้อสอบทั้งหมด"
        className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[88dvh] w-full max-w-[720px] overflow-y-auto rounded-t-sheet bg-surface p-0 text-ink shadow-sheet backdrop:bg-scrim"
      >
        <div className="flex flex-col gap-4 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-1">
          <button
            type="button"
            aria-label="ปิด"
            onClick={closeSheet}
            className="grid h-11 w-16 place-items-center self-center"
          >
            <span className="h-[5px] w-10 rounded-full bg-line" />
          </button>
          {navigator}
        </div>
      </dialog>
    </QuizFrame>
  );
}
