import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { QuizRunner } from '@/components/quiz/QuizRunner';
import { listQuizSets, loadQuizSet, parseSetParam } from '@/lib/content';
import { SUBJECTS, getSubject } from '@/lib/subjects';

type Props = { params: Promise<{ subject: string; set: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SUBJECTS.flatMap((s) =>
    listQuizSets(s.id).map((set) => ({ subject: s.id, set: `set-${set}` })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: subjectId, set: setParam } = await params;
  const subject = getSubject(subjectId);
  const set = parseSetParam(setParam);
  if (!subject || !set) return {};
  return {
    title: `ข้อสอบชุดที่ ${set} · ${subject.code}`,
    description: `ข้อสอบจำลอง ${subject.title} ชุดที่ ${set} — โหมดฝึกและโหมดสอบจับเวลา`,
    alternates: { canonical: `/${subjectId}/quiz/set-${set}/` },
    robots: subject.isDemo ? { index: false } : undefined,
  };
}

export default async function QuizPage({ params }: Props) {
  const { subject: subjectId, set: setParam } = await params;
  const subject = getSubject(subjectId);
  const set = parseSetParam(setParam);
  if (!subject || !set || !listQuizSets(subjectId).includes(set)) notFound();

  return (
    <PageShell
      back={{ href: `/${subjectId}/`, label: subject.title }}
      crumb={`${subject.title} › Mock ชุดที่ ${set}`}
    >
      <QuizRunner
        subject={subjectId}
        subjectCode={subject.code}
        set={set}
        questions={loadQuizSet(subjectId, set)}
      />
    </PageShell>
  );
}
