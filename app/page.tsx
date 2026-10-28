import type { Metadata } from 'next';
import { StudyRoom } from '@/components/room/StudyRoom';
import { listLessons } from '@/lib/content';
import type { StepSubject } from '@/lib/next-step';
import { SUBJECTS } from '@/lib/subjects';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const subjects: StepSubject[] = await Promise.all(
    SUBJECTS.map(async (s) => ({
      id: s.id,
      lessons: (await listLessons(s.id)).map((l) => ({ slug: l.slug, title: l.meta.title })),
    })),
  );
  return <StudyRoom subjects={subjects} />;
}
