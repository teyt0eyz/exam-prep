'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** subject id -> lesson slugs, read on the server once in the root layout. */
const NavData = createContext<Record<string, string[]>>({});

export function NavDataProvider({ lessonSlugs, children }: { lessonSlugs: Record<string, string[]>; children: ReactNode }) {
  return <NavData.Provider value={lessonSlugs}>{children}</NavData.Provider>;
}

export const useLessonSlugs = () => useContext(NavData);
