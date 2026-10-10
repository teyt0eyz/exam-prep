import { getSubject } from '@/lib/subjects';

/** Sets the subject's accent (--acc / --acc-soft) for every screen under it. */
export default async function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subject: string }>;
}) {
  const subject = getSubject((await params).subject);
  return <div data-accent={subject?.accent ?? 'os'}>{children}</div>;
}
