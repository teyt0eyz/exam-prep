'use client';

import type { ReactNode } from 'react';
import { PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon } from '@/components/ui/icons';
import {
  MAX_SPEED,
  MIN_SPEED,
  SPEED_STEP,
  useSimulation,
  type SimulationOptions,
} from './useSimulation';

/** Simulation states from the design system; each pairs a colour with a line style. */
export type SimTone = 'normal' | 'active' | 'waiting' | 'error' | 'done';

export interface SimExplanation {
  /** Short Thai heading: what just happened. */
  title: string;
  /** Thai explanation: what happened and why. */
  body: ReactNode;
}

export interface SimulationPlayerProps<S> extends SimulationOptions<S> {
  /** Accessible name for the whole widget. */
  title: string;
  /** Draw the state. Prefer an <svg viewBox> so it scales with the container. */
  render: (state: S, prev: S | null) => ReactNode;
  explain: (state: S, prev: S | null) => SimExplanation;
  /** Badge in the header, e.g. { tone: 'error', label: 'Deadlock' }. */
  status?: (state: S) => { tone: SimTone; label: string };
  /** Input controls shown above the canvas (burst times, reference string, ...). */
  inputs?: ReactNode;
  /** One-line key under the canvas, e.g. "○ Process  □ Resource". */
  legend?: ReactNode;
}

const TONE_CLASS: Record<SimTone, string> = {
  normal: 'bg-surface-2 text-muted',
  active: 'bg-accent-soft text-accent',
  waiting: 'bg-warn-soft text-warn',
  error: 'bg-bad-soft text-bad',
  done: 'bg-ok-soft text-ok',
};

const stepBtn =
  'grid h-12 w-12 place-items-center rounded-md bg-surface-2 text-ink hover:brightness-95 ' +
  'disabled:cursor-not-allowed disabled:text-faint disabled:opacity-60';

/** Above this many steps, per-step progress segments get too thin to read. */
const MAX_SEGMENTS = 40;

export function SimulationPlayer<S>({
  title,
  render,
  explain,
  status,
  inputs,
  legend,
  ...options
}: SimulationPlayerProps<S>) {
  const sim = useSimulation(options);
  const explanation = explain(sim.state, sim.prev);
  const badge = status?.(sim.state);

  return (
    <section
      aria-label={title}
      className="-mx-2 my-5 overflow-hidden rounded-[18px] border border-line bg-surface sm:mx-0 xl:grid xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="flex min-w-0 flex-col xl:border-r xl:border-line">
        <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-3">
          <span className="font-mono text-[13px] leading-5 text-muted">
            ขั้นที่ {sim.stepIndex + 1} / {sim.totalSteps}
          </span>
          {badge ? (
            <span
              className={`rounded-sm px-2.5 py-[3px] text-[13px] font-semibold leading-[18px] ${TONE_CLASS[badge.tone]}`}
            >
              {badge.label}
            </span>
          ) : null}
        </header>

        {inputs ? <div className="border-b border-line px-3.5 py-3.5">{inputs}</div> : null}

        <div className="flex-1 bg-canvas px-2 pt-2">{render(sim.state, sim.prev)}</div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 bg-canvas px-3.5 pb-2.5 pt-2 text-[12px] leading-[18px] text-faint">
          {legend}
        </div>

        <div className="flex flex-col gap-3 border-t border-line p-3.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={sim.reset}
              aria-label="เริ่มใหม่ (Reset)"
              className="h-11 min-w-14 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 text-[14px] font-medium text-ink hover:bg-surface-2"
            >
              Reset
            </button>
            <div className="flex items-center gap-2 min-[380px]:gap-2.5">
              <button
                type="button"
                className={stepBtn}
                onClick={sim.stepBack}
                disabled={!sim.canStepBack}
                aria-label="ย้อนกลับหนึ่งขั้น"
              >
                <StepBackIcon />
              </button>
              <button
                type="button"
                className="grid h-[60px] w-[60px] place-items-center rounded-full bg-accent text-accent-ink hover:brightness-110"
                onClick={sim.togglePlay}
                aria-label={sim.playing ? 'หยุดชั่วคราว' : sim.finished ? 'เล่นซ้ำ' : 'เล่น'}
              >
                {sim.playing ? <PauseIcon width={22} height={22} /> : <PlayIcon width={22} height={22} />}
              </button>
              <button
                type="button"
                className={stepBtn}
                onClick={sim.stepForward}
                disabled={!sim.canStepForward}
                aria-label="ไปข้างหน้าหนึ่งขั้น"
              >
                <StepForwardIcon />
              </button>
            </div>
            <span className="min-w-14 whitespace-nowrap text-right font-mono text-[14px] font-semibold">
              {sim.speed.toFixed(1)}×
            </span>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-[13px] text-muted">
            ความเร็ว
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={SPEED_STEP}
              value={sim.speed}
              onChange={(e) => sim.setSpeed(Number(e.target.value))}
              className="h-11 min-w-0 flex-1 accent-(--acc)"
            />
          </label>
        </div>
      </div>

      <div className="flex min-w-0 flex-col border-t border-line xl:border-t-0">
        <div className="flex min-h-[150px] flex-col gap-2.5 px-3.5 pb-[18px] pt-4 xl:min-h-[190px] xl:border-b xl:border-line xl:px-5">
          <p className="text-[12px] font-medium leading-[18px] text-faint">คำอธิบายทีละขั้น</p>
          {sim.totalSteps <= MAX_SEGMENTS ? (
            <div className="flex gap-[3px] xl:hidden" aria-hidden="true">
              {sim.history.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= sim.stepIndex ? 'bg-accent' : 'bg-line'}`}
                />
              ))}
            </div>
          ) : (
            <div className="h-1 rounded-full bg-line xl:hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${((sim.stepIndex + 1) / sim.totalSteps) * 100}%` }}
              />
            </div>
          )}
          <div aria-live="polite" className="flex flex-col gap-2.5">
            <p className="text-[17px] font-semibold leading-[26px]">{explanation.title}</p>
            <div className="text-pretty text-[15px] leading-[26px] text-muted">{explanation.body}</div>
          </div>
        </div>

        {/* Desktop: every step, click to jump */}
        <ol className="hidden max-h-[420px] flex-col overflow-auto p-2 xl:flex">
          {sim.history.map((state, i) => {
            const current = i === sim.stepIndex;
            const past = i < sim.stepIndex;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => sim.goTo(i)}
                  aria-current={current ? 'step' : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] leading-[22px] ${
                    current
                      ? 'bg-accent-soft font-semibold text-ink'
                      : past
                        ? 'text-muted hover:bg-surface-2'
                        : 'text-faint hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-sm font-mono text-[12px] ${
                      current
                        ? 'bg-accent text-accent-ink'
                        : past
                          ? 'bg-surface-2 text-faint'
                          : 'border border-line text-faint'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1">{explain(state, i > 0 ? (sim.history[i - 1] as S) : null).title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
