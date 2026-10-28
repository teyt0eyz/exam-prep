'use client';

import { useSyncExternalStore } from 'react';

// Pomodoro timer shared by every page. The running phase is stored as an end
// time, so it survives navigation, reloads and a sleeping tab; a module-level
// timeout finishes the phase even when no timer UI is on screen.

export type Phase = 'focus' | 'short' | 'long';

export interface PomodoroState {
  phase: Phase;
  running: boolean;
  /** Epoch ms when the running phase ends. */
  endAt: number | null;
  /** Time left while paused. */
  remainingMs: number;
  /** Minutes per phase. */
  minutes: Record<Phase, number>;
  /** Focus phases finished since the last long break (0-3). */
  cycle: number;
  /** Focus phases finished today (local date). */
  today: { day: string; done: number };
  sound: boolean;
  /** Set when a phase ends, cleared when the notice is dismissed. */
  finished: { phase: Phase; next: Phase } | null;
}

export const FOCUS_PER_LONG_BREAK = 4;
export const PHASE_LABEL: Record<Phase, string> = { focus: 'โฟกัส', short: 'พักสั้น', long: 'พักยาว' };
export const LIMITS: Record<Phase, [number, number]> = { focus: [5, 90], short: [1, 30], long: [5, 60] };

const KEY = 'examprep:pomodoro';
const DEFAULT_MINUTES: Record<Phase, number> = { focus: 25, short: 5, long: 15 };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const initial = (): PomodoroState => ({
  phase: 'focus',
  running: false,
  endAt: null,
  remainingMs: DEFAULT_MINUTES.focus * 60_000,
  minutes: { ...DEFAULT_MINUTES },
  cycle: 0,
  today: { day: '', done: 0 },
  sound: false,
  finished: null,
});
const SERVER = initial();

let state: PomodoroState | null = null;
const listeners = new Set<() => void>();
let timer: number | undefined;

function read(): PomodoroState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = { ...initial(), ...(JSON.parse(raw) as Partial<PomodoroState>) };
      if (s.today.day !== todayKey()) s.today = { day: todayKey(), done: 0 };
      return s;
    }
  } catch {
    // fall through to defaults
  }
  return { ...initial(), today: { day: todayKey(), done: 0 } };
}

function get(): PomodoroState {
  if (state === null && typeof window !== 'undefined') {
    state = read();
    schedule();
  }
  return state ?? SERVER;
}

function set(next: PomodoroState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // keep it in memory for this visit
  }
  schedule();
  listeners.forEach((l) => l());
}

function schedule() {
  window.clearTimeout(timer);
  const s = state;
  if (!s?.running || s.endAt === null) return;
  // Browsers cap setTimeout around 24.8 days; a phase is at most 90 minutes.
  timer = window.setTimeout(finish, Math.max(0, s.endAt - Date.now()));
}

function finish() {
  // Another tab may have finished this phase already.
  const latest = read();
  state = latest;
  if (!latest.running || latest.endAt === null || latest.endAt > Date.now() + 250) {
    schedule();
    listeners.forEach((l) => l());
    return;
  }
  let { cycle, today } = latest;
  let next: Phase = 'focus';
  if (latest.phase === 'focus') {
    today = { day: todayKey(), done: (today.day === todayKey() ? today.done : 0) + 1 };
    cycle = cycle + 1;
    next = cycle >= FOCUS_PER_LONG_BREAK ? 'long' : 'short';
    if (next === 'long') cycle = 0;
  }
  if (latest.sound) chime();
  set({
    ...latest,
    phase: next,
    running: false,
    endAt: null,
    remainingMs: latest.minutes[next] * 60_000,
    cycle,
    today,
    finished: { phase: latest.phase, next },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = read();
    schedule();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function usePomodoro(): PomodoroState {
  return useSyncExternalStore(subscribe, get, () => SERVER);
}

/** Milliseconds left in the current phase at `now`. */
export function remaining(s: PomodoroState, now: number): number {
  return s.running && s.endAt !== null ? Math.max(0, s.endAt - now) : s.remainingMs;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const pomodoro = {
  start() {
    const s = get();
    if (s.running) return;
    unlockAudio();
    set({ ...s, running: true, endAt: Date.now() + s.remainingMs, finished: null });
  },
  pause() {
    const s = get();
    if (!s.running) return;
    set({ ...s, running: false, endAt: null, remainingMs: remaining(s, Date.now()) });
  },
  reset() {
    const s = get();
    set({ ...s, running: false, endAt: null, remainingMs: s.minutes[s.phase] * 60_000 });
  },
  /** Switch phase without counting the current one as done. */
  setPhase(phase: Phase) {
    const s = get();
    set({ ...s, phase, running: false, endAt: null, remainingMs: s.minutes[phase] * 60_000, finished: null });
  },
  setMinutes(phase: Phase, value: number) {
    const s = get();
    const [lo, hi] = LIMITS[phase];
    const m = Math.round(Math.min(hi, Math.max(lo, value)));
    const minutes = { ...s.minutes, [phase]: m };
    // A paused, untouched phase picks up its new length right away.
    const untouched = !s.running && s.phase === phase && s.remainingMs === s.minutes[phase] * 60_000;
    set({ ...s, minutes, remainingMs: untouched ? m * 60_000 : s.remainingMs });
  },
  setSound(sound: boolean) {
    if (sound) unlockAudio(true);
    set({ ...get(), sound });
  },
  /** Start the phase that the last finish queued up. */
  startNext() {
    const s = get();
    set({ ...s, finished: null });
    pomodoro.start();
  },
  dismiss() {
    set({ ...get(), finished: null });
  },
};

// A soft three-note chime made with Web Audio: no sound files, and only when the
// person turned sound on (the context is created inside a click).
let audio: AudioContext | null = null;
function unlockAudio(force = false) {
  try {
    if (!audio && (force || get().sound)) audio = new AudioContext();
    void audio?.resume();
  } catch {
    audio = null;
  }
}
function chime() {
  const ctx = audio;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [660, 880, 990].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t = t0 + i * 0.22;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}
