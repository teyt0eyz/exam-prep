'use client';

import { useEffect } from 'react';
import { setLastLesson } from '@/lib/storage';

/** Records the lesson being viewed so the home page can offer to continue it. */
export function TrackLesson({ subject, slug, title }: { subject: string; slug: string; title: string }) {
  useEffect(() => {
    setLastLesson({ subject, slug, title });
  }, [subject, slug, title]);
  return null;
}
