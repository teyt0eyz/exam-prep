import type { Metadata } from 'next';
import { Dashboard } from '@/components/home/Dashboard';
import { PageShell } from '@/components/layout/PageShell';
import { listLessons } from '@/lib/content';
import type { MapSubject } from '@/lib/constellation';
import { SUBJECTS } from '@/lib/subjects';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const subjects: MapSubject[] = await Promise.all(
    SUBJECTS.map(async (s) => ({
      id: s.id,
      short: s.short,
      accent: s.accent,
      lessons: (await listLessons(s.id)).map((l) => ({ slug: l.slug, title: l.meta.title })),
    })),
  );

  return (
    <PageShell>
      <Dashboard subjects={subjects} />
    </PageShell>
  );
}
