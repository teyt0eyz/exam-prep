import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { ContinueCard } from '@/components/progress/ContinueCard';
import { ExamSchedule, type ExamScheduleItem } from '@/components/progress/ExamSchedule';
import { SubjectCard } from '@/components/progress/SubjectCard';
import { display } from '@/components/ui/styles';
import { listLessonSlugs } from '@/lib/content';
import { SUBJECTS } from '@/lib/subjects';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function HomePage() {
  const exams: ExamScheduleItem[] = SUBJECTS.flatMap((subject) =>
    subject.exam
      ? [{ subject: { ...subject, exam: subject.exam }, lessonSlugs: listLessonSlugs(subject.id) }]
      : [],
  );

  return (
    <PageShell>
      <div className="flex flex-col gap-5 pt-2 lg:gap-7 lg:pt-2">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div>
            <p className="text-[14px] leading-[22px] text-muted lg:text-[15px]">เตรียมสอบ CE ปี 2</p>
            <h1 className={display}>เลือกวิชาที่จะทบทวน</h1>
          </div>
          <ContinueCard />
        </div>

        <ExamSchedule items={exams} />

        <ul className="grid gap-5 md:grid-cols-2">
          {SUBJECTS.map((subject) => (
            <li key={subject.id}>
              <SubjectCard subject={subject} lessonSlugs={listLessonSlugs(subject.id)} />
            </li>
          ))}
        </ul>

        <p className="text-[12px] leading-[18px] text-faint">
          ความคืบหน้าและประวัติการทำข้อสอบเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
        </p>
      </div>
    </PageShell>
  );
}
