'use client';

import { useRef, useState } from 'react';
import { btnGhost, btnPrimary } from '@/components/ui/styles';
import { remapAnswer } from '@/lib/quiz/shuffle';
import { CHOICE_LETTERS, type Answers, type Question } from '@/lib/quiz/types';
import { QuestionCard } from './QuestionCard';
import { QuizFrame, type SegmentTone } from './QuizFrame';

interface Props {
  title: string;
  questions: Question[];
  orders: Record<string, number[]>;
  onFinish: (answers: Answers, flagged: string[]) => void;
  onExit: () => void;
}

export function PracticeMode({ title, questions, orders, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const question = questions[index];
  if (!question) return null;
  const order = orders[question.id] ?? [0, 1, 2, 3];
  const selected = answers[question.id];
  const answered = selected !== undefined;
  const correct = selected === question.answer;
  const isLast = index === questions.length - 1;
  const correctLetter = CHOICE_LETTERS[remapAnswer(order, question.answer)];

  const next = () => {
    if (isLast) return onFinish(answers, []);
    setIndex(index + 1);
    scrollRef.current?.scrollTo(0, 0);
  };

  const segments: SegmentTone[] = questions.map((q, i) => {
    const a = answers[q.id];
    if (a !== undefined) return a === q.answer ? 'correct' : 'wrong';
    return i === index ? 'current' : 'todo';
  });

  return (
    <QuizFrame
      title={title}
      position={`ข้อ ${index + 1} / ${questions.length}`}
      segments={segments}
      scrollRef={scrollRef}
      onExit={onExit}
      exitWarning="ความคืบหน้าของรอบนี้จะไม่ถูกบันทึก ถ้าต้องการเก็บผล ให้กด “จบตอนนี้และดูผล” แทน"
      status={
        <span className="rounded-[10px] bg-surface-2 px-3 py-2 text-[14px] font-semibold leading-6 text-muted">
          โหมดฝึก
        </span>
      }
      footer={
        <button type="button" className={`${btnPrimary} w-full`} disabled={!answered} onClick={next}>
          {isLast ? 'ดูผลลัพธ์' : 'ข้อถัดไป ›'}
        </button>
      }
    >
      <QuestionCard
        question={question}
        order={order}
        selected={selected}
        reveal={answered}
        onSelect={(choice) => setAnswers((a) => ({ ...a, [question.id]: choice }))}
      />

      {answered ? (
        <div aria-live="polite" className="rounded-lg border border-line bg-surface p-4">
          <span
            className={`inline-block rounded-sm px-2.5 py-[3px] text-[13px] font-medium leading-[18px] ${
              correct ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'
            }`}
          >
            {correct ? 'ถูก' : 'ผิด'}
          </span>
          <p className="mt-2 text-[16px] font-semibold leading-[26px]">
            {correct ? 'ถูกต้อง' : `ยังไม่ถูก — คำตอบคือข้อ ${correctLetter}`}
          </p>
          <p className="mt-2 whitespace-pre-wrap border-t border-line pt-2.5 text-[14px] leading-6 text-muted">
            {question.explanation}
          </p>
          <p className="mt-2 text-[12px] leading-[18px] text-faint">ที่มา: {question.source}</p>
        </div>
      ) : null}

      {!isLast ? (
        <button type="button" className={`${btnGhost} self-start`} onClick={() => onFinish(answers, [])}>
          จบตอนนี้และดูผล
        </button>
      ) : null}
    </QuizFrame>
  );
}
