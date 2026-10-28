'use client';

import Link from 'next/link';
import { useState } from 'react';
import { btnPrimary, btnSecondary } from '@/components/ui/styles';
import { setLessonRead, useStore } from '@/lib/storage';
import { lessonKey } from '@/lib/subjects';

interface Props {
  subject: string;
  slug: string;
  /** All lesson slugs of the subject, to show the real count after marking. */
  lessonSlugs: string[];
  next?: { slug: string; title: string };
}

// Eight sparks flying out of the button, angles fixed so every render matches.
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3;
  return { dx: `${Math.cos(a) * 54}px`, dy: `${Math.sin(a) * 34}px`, color: ['var(--mint)', 'var(--brand)', 'var(--apricot)', 'var(--lavender)'][i % 4] };
});

export function MarkReadButton({ subject, slug, lessonSlugs, next }: Props) {
  const store = useStore();
  const read = Boolean(store.lessonsRead[lessonKey(subject, slug)]);
  // Only celebrate a mark made on this visit, never on a page that loads already read.
  const [justMarked, setJustMarked] = useState(false);
  const readCount = lessonSlugs.filter((s) => store.lessonsRead[lessonKey(subject, s)]).length;

  const toggle = () => {
    setLessonRead(subject, slug, !read);
    setJustMarked(!read);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <button
          type="button"
          aria-pressed={read}
          onClick={toggle}
          className={`${read ? btnSecondary : btnPrimary} w-full`}
        >
          {read ? (
            <>
              <span aria-hidden="true" className={`text-ok ${justMarked ? 'animate-pop inline-block' : ''}`}>
                ✓
              </span>
              อ่านแล้ว (กดเพื่อยกเลิก)
            </>
          ) : (
            'ทำเครื่องหมายว่าอ่านแล้ว'
          )}
        </button>
        {justMarked && read ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-full motion-reduce:hidden"
                style={{
                  background: s.color,
                  ['--dx' as string]: s.dx,
                  ['--dy' as string]: s.dy,
                  animation: 'burst 0.7s var(--ease-out) both',
                }}
              />
            ))}
          </span>
        ) : null}
      </div>
      <div aria-live="polite">
        {justMarked && read ? (
          <div className="animate-rise flex flex-col gap-3 rounded-lg border border-line bg-mint-soft p-4">
            <p className="text-[15px] leading-6">
              <b>อ่านจบอีกหนึ่งบท</b> ตอนนี้วิชานี้อ่านแล้ว {readCount} จาก {lessonSlugs.length} บท
            </p>
            {next ? (
              <Link href={`/${subject}/lesson/${next.slug}/`} className={`${btnPrimary} w-full`}>
                บทถัดไป: {next.title} ›
              </Link>
            ) : (
              <p className="text-[14px] leading-[22px] text-muted">นี่คือบทสุดท้ายของวิชาแล้ว ลองทำ Mock ด้านล่างได้เลย</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
