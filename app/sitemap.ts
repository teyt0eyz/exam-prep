import type { MetadataRoute } from 'next';
import { listLessonSlugs, listQuizSets } from '@/lib/content';
import { SITE_URL } from '@/lib/site';
import { SUBJECTS } from '@/lib/subjects';

export const dynamic = 'force-static';

// Result pages are per-user (localStorage) and the demo subject is not exam content,
// so neither is listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/'];
  for (const subject of SUBJECTS) {
    if (subject.isDemo) continue;
    paths.push(`/${subject.id}/`);
    for (const slug of listLessonSlugs(subject.id)) paths.push(`/${subject.id}/lesson/${slug}/`);
    for (const set of listQuizSets(subject.id)) paths.push(`/${subject.id}/quiz/set-${set}/`);
  }
  return paths.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'weekly' }));
}
