import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { ResultView } from '@/components/quiz/ResultView';
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
  // Results come from this browser's localStorage; nothing here for a crawler.
  return { title: `ผลสอบชุดที่ ${set} · ${subject.code}`, robots: { index: false } };
}

export default async function ResultPage({ params }: Props) {
  const { subject: subjectId, set: setParam } = await params;
  const subject = getSubject(subjectId);
  const set = parseSetParam(setParam);
  if (!subject || !set || !listQuizSets(subjectId).includes(set)) notFound();

  return (
    <PageShell
      back={{ href: `/${subjectId}/`, label: `${subject.code} · Mock ชุดที่ ${set}` }}
      crumb={`${subject.title} › Mock ชุดที่ ${set} › ผลการสอบ`}
    >
      <ResultView subject={subjectId} set={set} questions={loadQuizSet(subjectId, set)} />
    </PageShell>
  );
}
