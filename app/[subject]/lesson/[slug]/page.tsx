import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { MarkReadButton } from '@/components/progress/MarkReadButton';
import { ReadingProgress } from '@/components/progress/ReadingProgress';
import { TrackLesson } from '@/components/progress/TrackLesson';
import { btnSecondary, h1 } from '@/components/ui/styles';
import { chapterLabel, listLessonSlugs, listLessons, listQuizSets, loadLesson } from '@/lib/content';
import { SUBJECTS, getSubject } from '@/lib/subjects';

type Props = { params: Promise<{ subject: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SUBJECTS.flatMap((s) => listLessonSlugs(s.id).map((slug) => ({ subject: s.id, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: subjectId, slug } = await params;
  const subject = getSubject(subjectId);
  if (!subject || !listLessonSlugs(subjectId).includes(slug)) return {};
  const { meta } = await loadLesson(subjectId, slug);
  return {
    title: `${meta.title} · ${subject.code}`,
    description: meta.summary,
    alternates: { canonical: `/${subjectId}/lesson/${slug}/` },
    robots: subject.isDemo ? { index: false } : undefined,
  };
}

export default async function LessonPage({ params }: Props) {
  const { subject: subjectId, slug } = await params;
  const subject = getSubject(subjectId);
  if (!subject || !listLessonSlugs(subjectId).includes(slug)) notFound();

  const { Content, meta } = await loadLesson(subjectId, slug);
  const lessons = await listLessons(subjectId);
  const index = lessons.findIndex((l) => l.slug === slug);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const firstSet = listQuizSets(subjectId)[0];
  const where = meta.chapter ? `${chapterLabel(meta.chapter)} ${meta.chapter.title}` : 'บทเรียน';

  return (
    <PageShell
      back={{ href: `/${subjectId}/`, label: `${subject.code} · ${where}` }}
      crumb={`${subject.title} › ${where}`}
      divider
      narrow
    >
      <TrackLesson subject={subjectId} slug={slug} title={meta.title} />
      <ReadingProgress targetId="lesson" />
      <article id="lesson" className="max-w-[760px] pt-5 lg:pt-0">
        <p className="text-[12px] font-medium leading-[18px] text-accent lg:text-[13px]">
          {[`หัวข้อ ${index + 1}`, meta.minutes ? `${meta.minutes} นาที` : null, meta.extra ? 'เสริม' : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <h1 className={`${h1} mt-0.5 animate-rise`}>{meta.title}</h1>

        <div className="mt-2">
          <Content />
        </div>

        <footer className="mt-8 flex flex-col gap-3">
          <MarkReadButton
            subject={subjectId}
            slug={slug}
            lessonSlugs={lessons.map((l) => l.slug)}
            next={next ? { slug: next.slug, title: next.meta.title } : undefined}
          />
          {firstSet ? (
            <Link href={`/${subjectId}/quiz/set-${firstSet}/`} className={btnSecondary}>
              ทำ Mock ชุดที่ {firstSet}
            </Link>
          ) : null}
          {prev || next ? (
            <nav className="grid grid-cols-2 gap-2.5" aria-label="บทเรียนก่อนหน้าและถัดไป">
              {prev ? (
                <Link
                  href={`/${subjectId}/lesson/${prev.slug}/`}
                  className={`${btnSecondary} px-3 text-[14px] font-normal`}
                >
                  ‹ {prev.meta.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={`/${subjectId}/lesson/${next.slug}/`}
                  className={`${btnSecondary} px-3 text-[14px] font-normal`}
                >
                  {next.meta.title} ›
                </Link>
              ) : null}
            </nav>
          ) : null}
        </footer>
      </article>
    </PageShell>
  );
}
