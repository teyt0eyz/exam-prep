'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FOCUS_PER_LONG_BREAK,
  LIMITS,
  PHASE_LABEL,
  formatClock,
  pomodoro,
  remaining,
  usePomodoro,
  type Phase,
} from '@/lib/pomodoro';
import { useHydrated } from '@/lib/storage';
import { useTick } from './useTick';

const PHASES: Phase[] = ['focus', 'short', 'long'];
// Focus is coral, breaks are mint: also named in text, never colour alone.
const TONE: Record<Phase, { ring: string; soft: string; ink: string }> = {
  focus: { ring: '#ff7f9f', soft: '#ffebf1', ink: '#c13a68' },
  short: { ring: '#3fbf8a', soft: '#e3f8ee', ink: '#11785c' },
  long: { ring: '#83d5ff', soft: '#e6f4ff', ink: '#2c64d4' },
};

function TimerIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" />
      <path d="M10 7.5V11l2.2 1.6M8 2.5h4" />
    </svg>
  );
}

/**
 * Pomodoro in the top bar: shows the time left while a phase runs, and opens a
 * small panel to start, pause, switch phase and set the lengths.
 */
export function PomodoroButton({ className = '' }: { className?: string }) {
  const s = usePomodoro();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const now = useTick(s.running || open);
  const left = remaining(s, now);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const tone = TONE[s.phase];
  const active = hydrated && (s.running || left !== s.minutes[s.phase] * 60_000);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrap.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Show the countdown in the tab title while it runs.
  useEffect(() => {
    if (!hydrated || !s.running) return;
    const base = document.title.replace(/^\d\d:\d\d · \S+ · /, '');
    document.title = `${formatClock(left)} · ${PHASE_LABEL[s.phase]} · ${base}`;
    return () => {
      document.title = base;
    };
  }, [hydrated, s.running, s.phase, left]);

  const total = s.minutes[s.phase] * 60_000;
  const frac = total > 0 ? 1 - left / total : 0;
  const R = 62;
  const C = 2 * Math.PI * R;

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          active ? `Pomodoro: ${PHASE_LABEL[s.phase]} เหลือ ${formatClock(left)}${s.running ? '' : ' (หยุดอยู่)'}` : 'เปิดตัวจับเวลา Pomodoro'
        }
        onClick={() => setOpen((o) => !o)}
        className={`press flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 text-ink shadow-lift backdrop-blur-md hover:bg-white ${
          active ? '' : 'w-11 px-0'
        }`}
      >
        <span style={{ color: active ? tone.ink : undefined }}>
          <TimerIcon />
        </span>
        {active ? (
          <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: tone.ink }}>
            {formatClock(left)}
          </span>
        ) : null}
        {active && !s.running ? <span className="sr-only">หยุดอยู่</span> : null}
      </button>

      {/* Portal: inside the blurred top bar the panel would composite as see-through. */}
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label="ตัวจับเวลา Pomodoro"
          className="animate-rise fixed inset-x-3 top-[max(68px,calc(env(safe-area-inset-top)+60px))] z-50 flex flex-col gap-4 rounded-[24px] border border-white/80 bg-white p-4 shadow-float sm:inset-x-auto sm:right-5 sm:top-[76px] sm:w-[340px]"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-[18px] font-semibold">Pomodoro</p>
            <p className="text-[12px] text-muted">
              รอบโฟกัส {s.cycle}/{FOCUS_PER_LONG_BREAK} ก่อนพักยาว
            </p>
          </div>

          <div role="group" aria-label="ช่วงเวลา" className="grid grid-cols-3 gap-1 rounded-2xl bg-white/60 p-1">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={s.phase === p}
                onClick={() => pomodoro.setPhase(p)}
                className="min-h-11 rounded-xl text-[14px] font-medium text-muted aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-ink aria-pressed:shadow-card"
              >
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>

          <div className="relative mx-auto grid h-[148px] w-[148px] place-items-center">
            <svg viewBox="0 0 148 148" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="74" cy="74" r={R} fill="none" stroke="#eee8f4" strokeWidth="10" />
              <circle
                cx="74"
                cy="74"
                r={R}
                fill="none"
                stroke={tone.ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - frac)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="text-center" aria-live="off">
              <p className="font-mono text-[34px] font-semibold leading-none tabular-nums">{formatClock(left)}</p>
              <p className="mt-1.5 text-[13px] font-medium" style={{ color: tone.ink }}>
                {PHASE_LABEL[s.phase]}
                {s.running ? '' : ' · หยุดอยู่'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => (s.running ? pomodoro.pause() : pomodoro.start())}
              className="press min-h-12 rounded-xl text-[16px] font-semibold text-ink shadow-card"
              style={{ background: `linear-gradient(135deg, ${tone.soft}, ${tone.ring})` }}
            >
              {s.running ? 'หยุดชั่วคราว' : left < total ? 'ทำต่อ' : `เริ่ม${PHASE_LABEL[s.phase]}`}
            </button>
            <button
              type="button"
              onClick={() => pomodoro.reset()}
              className="press min-h-12 rounded-xl bg-white/80 px-4 text-[14px] font-medium shadow-card hover:bg-white"
            >
              เริ่มใหม่
            </button>
          </div>

          <p className="text-center text-[13px] text-muted">
            วันนี้โฟกัสครบ <b className="text-ink">{hydrated ? s.today.done : '–'}</b> รอบ
            {hydrated && s.today.done > 0 ? ` (${s.today.done * s.minutes.focus} นาทีตามค่าปัจจุบัน)` : ''}
          </p>

          <details className="group rounded-2xl bg-white/55 px-3 open:pb-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[14px] font-medium">
              ตั้งเวลา
              <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="grid grid-cols-3 gap-2">
              {PHASES.map((p) => (
                <label key={p} className="flex flex-col gap-1 text-[12px] text-muted">
                  {PHASE_LABEL[p]} (นาที)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={LIMITS[p][0]}
                    max={LIMITS[p][1]}
                    value={s.minutes[p]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v > 0) pomodoro.setMinutes(p, v);
                    }}
                    className="min-h-11 rounded-lg border border-line bg-white px-2 text-center font-mono text-[15px] text-ink"
                  />
                </label>
              ))}
            </div>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[14px]">
              เสียงแจ้งเมื่อหมดเวลา
              <input
                type="checkbox"
                checked={s.sound}
                onChange={(e) => pomodoro.setSound(e.target.checked)}
                className="h-5 w-5 accent-[#5a4ddc]"
              />
            </label>
          </details>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
