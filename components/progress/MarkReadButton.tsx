'use client';

import { btnPrimary, btnSecondary } from '@/components/ui/styles';
import { setLessonRead, useStore } from '@/lib/storage';
import { lessonKey } from '@/lib/subjects';

export function MarkReadButton({ subject, slug }: { subject: string; slug: string }) {
  const read = Boolean(useStore().lessonsRead[lessonKey(subject, slug)]);

  return (
    <button
      type="button"
      aria-pressed={read}
      onClick={() => setLessonRead(subject, slug, !read)}
      className={`${read ? btnSecondary : btnPrimary} w-full`}
    >
      {read ? (
        <>
          <span aria-hidden="true" className="text-ok">
            ✓
          </span>
          อ่านแล้ว (กดเพื่อยกเลิก)
        </>
      ) : (
        'ทำเครื่องหมายว่าอ่านแล้ว'
      )}
    </button>
  );
}
