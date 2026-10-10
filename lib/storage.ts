'use client';

import { useSyncExternalStore } from 'react';
import type { Attempt } from './quiz/types';
import { lessonKey, setKey } from './subjects';

const KEY = 'examprep:v1';
const MAX_HISTORY = 60;

export interface BestScore {
  correct: number;
  total: number;
  date: string;
}

export interface Store {
  /** lessonKey -> ISO date marked read */
  lessonsRead: Record<string, string>;
  /** setKey -> best finished attempt */
  best: Record<string, BestScore>;
  /** newest first */
  history: Attempt[];
  /** Most recently opened lesson, for "continue where you left off". */
  last?: LastLesson;
}

export interface LastLesson {
  subject: string;
  slug: string;
  title: string;
}

const EMPTY: Store = { lessonsRead: {}, best: {}, history: [] };

// localStorage can throw (private mode, blocked site data, quota). When it does,
// keep the data in memory so the current visit still works end to end.
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cachedStore: Store = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parse(raw: string | null): Store {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return EMPTY;
    return {
      lessonsRead: isRecord(data.lessonsRead) ? (data.lessonsRead as Store['lessonsRead']) : {},
      best: isRecord(data.best) ? (data.best as Store['best']) : {},
      history: Array.isArray(data.history) ? (data.history as Attempt[]) : [],
      last: isRecord(data.last) ? (data.last as unknown as LastLesson) : undefined,
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Store {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedStore = parse(raw);
  }
  return cachedStore;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function update(fn: (store: Store) => Store): void {
  const raw = JSON.stringify(fn(getSnapshot()));
  memoryRaw = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // fall back to memoryRaw
  }
  listeners.forEach((l) => l());
}

/** Saved progress. Returns the empty store during SSR and hydration. */
export function useStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

const noopSubscribe = () => () => {};
/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function setLessonRead(subject: string, slug: string, read: boolean): void {
  update((store) => {
    const lessonsRead = { ...store.lessonsRead };
    if (read) lessonsRead[lessonKey(subject, slug)] = new Date().toISOString();
    else delete lessonsRead[lessonKey(subject, slug)];
    return { ...store, lessonsRead };
  });
}

export function setLastLesson(last: LastLesson): void {
  const prev = getSnapshot().last;
  if (prev?.subject === last.subject && prev.slug === last.slug) return;
  update((store) => ({ ...store, last }));
}

/** Append to history and raise the set's best score if this attempt beats it. */
export function saveAttempt(attempt: Attempt): void {
  update((store) => {
    const key = setKey(attempt.subject, attempt.set);
    const prev = store.best[key];
    const isBetter = !prev || attempt.correct / attempt.total > prev.correct / prev.total;
    return {
      ...store,
      history: [attempt, ...store.history].slice(0, MAX_HISTORY),
      best: isBetter
        ? {
            ...store.best,
            [key]: { correct: attempt.correct, total: attempt.total, date: attempt.finishedAt },
          }
        : store.best,
    };
  });
}

export function attemptsFor(store: Store, subject: string, set: number): Attempt[] {
  return store.history.filter((a) => a.subject === subject && a.set === set);
}
