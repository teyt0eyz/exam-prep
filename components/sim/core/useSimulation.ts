'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2;
export const SPEED_STEP = 0.5;

export interface SimulationOptions<S> {
  /**
   * First state. A new reference restarts the simulation, so memoize it
   * (useMemo over the user-editable inputs).
   */
  initialState: S;
  /** Pure: must return a new state and never mutate its argument. */
  step: (state: S) => S;
  isDone: (state: S) => boolean;
  /** Time between steps at 1x speed. */
  baseIntervalMs?: number;
  /** Guard against a step function that never finishes. */
  maxSteps?: number;
}

/**
 * Drives a simulation from a pure step function. Because `step` is pure, the whole
 * run is computed up front into `history`; stepping back, jumping to a step and
 * showing "step n / total" are then just index moves.
 */
export function useSimulation<S>({
  initialState,
  step,
  isDone,
  baseIntervalMs = 1600,
  maxSteps = 500,
}: SimulationOptions<S>) {
  const history = useMemo(() => {
    const states = [initialState];
    let current = initialState;
    while (!isDone(current) && states.length <= maxSteps) {
      current = step(current);
      states.push(current);
    }
    return states;
  }, [initialState, step, isDone, maxSteps]);

  const [seed, setSeed] = useState(initialState);
  const [rawIndex, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Inputs changed: start over (state adjusted during render, no effect needed).
  if (seed !== initialState) {
    setSeed(initialState);
    setIndex(0);
    setPlaying(false);
  }

  const last = history.length - 1;
  const index = seed === initialState ? Math.min(rawIndex, last) : 0;
  const finished = index >= last;
  const running = playing && !finished;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setIndex((i) => Math.min(i + 1, last)),
      baseIntervalMs / speed,
    );
    return () => window.clearInterval(id);
  }, [running, last, baseIntervalMs, speed]);

  const goTo = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(i, last)));
    },
    [last],
  );

  const togglePlay = useCallback(() => {
    if (running) return setPlaying(false);
    // Play at the end replays from the start.
    if (finished) setIndex(0);
    setPlaying(true);
  }, [running, finished]);

  return {
    history,
    state: history[index] as S,
    prev: index > 0 ? (history[index - 1] as S) : null,
    stepIndex: index,
    totalSteps: history.length,
    canStepBack: index > 0,
    canStepForward: !finished,
    finished,
    playing: running,
    speed,
    setSpeed,
    goTo,
    stepForward: () => goTo(index + 1),
    stepBack: () => goTo(index - 1),
    reset: () => goTo(0),
    togglePlay,
  };
}
