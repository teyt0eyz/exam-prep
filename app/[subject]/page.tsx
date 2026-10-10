import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { LessonList } from '@/components/progress/LessonList';
import { QuizSetList } from '@/components/progress/QuizSetList';
import { SubjectHeader } from '@/components/progress/SubjectHeader';
import { h2 } from '@/components/ui/styles';
import { listLessons, listQuizSets, loadQuizSet } from '@/lib/content';
import { SECONDS_PER_QUESTION } from '@/lib/quiz/config';
import { SUBJECTS, getSubject } from '@/lib/subjects';

type Props = { params: Promise<{ subject: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ subject: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const subject = getSubject((await params).subject);
  if (!subject) return {};
  return {
    title: subject.title,
    description: `${subject.titleTh} — บทเรียนและข้อสอบจำลอง`,
    alternates: { canonical: `/${subject.id}/` },
    robots: subject.isDemo ? { index: false } : undefined,
  };
}

export default async function SubjectPage({ params }: Props) {
  const subject = getSubject((await params).subject);
  if (!subject) notFound();

  const lessons = await listLessons(subject.id);
  const questionCounts = Object.fromEntries(
    listQuizSets(subject.id).map((set) => [set, loadQuizSet(subject.id, set).length]),
  );

  return (
    <PageShell back={{ href: '/', label: 'หน้าหลัก' }}>
      <div className="pt-1 lg:pt-0">
        <SubjectHeader subject={subject} lessonSlugs={lessons.map((l) => l.slug)} />
      </div>

      <div className="grid gap-7 pt-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12 lg:pt-8">
        <section aria-label="บทเรียน">
          {lessons.length > 0 ? (
            <LessonList subject={subject.id} lessons={lessons} />
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[14px] leading-[22px] text-muted">
              ยังไม่มีบทเรียน — กำลังจัดทำ
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={h2}>ข้อสอบจำลอง</h2>
          <QuizSetList
            subject={subject.id}
            questionCounts={questionCounts}
            minutesPerQuestion={SECONDS_PER_QUESTION / 60}
          />
        </section>
      </div>
    </PageShell>
  );
}
