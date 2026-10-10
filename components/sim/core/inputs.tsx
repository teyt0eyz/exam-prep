'use client';

import { useId, useState } from 'react';

export type Parsed<T> = { value: T } | { error: string };

/**
 * Text input backed by a parser. `value` is the last input that parsed, so a
 * simulation keeps running the previous valid program while the user is mid-edit.
 */
export function useParsedText<T>(initial: string, parse: (text: string) => Parsed<T>) {
  const [text, setText] = useState(initial);
  const [value, setValue] = useState<T>(() => {
    const first = parse(initial);
    if ('error' in first) throw new Error(`invalid default input: ${first.error}`);
    return first.value;
  });
  const current = parse(text);

  const apply = (next: string) => {
    setText(next);
    const result = parse(next);
    if ('value' in result) setValue(result.value);
  };

  return { text, value, error: 'error' in current ? current.error : null, apply };
}

interface TextProps {
  label: string;
  hint: string;
  text: string;
  error: string | null;
  onChange: (text: string) => void;
  rows?: number;
}

export function SimTextInput({ label, hint, text, error, onChange, rows = 2 }: TextProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[14px] font-medium leading-[22px]">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-invalid={error !== null}
        aria-describedby={`${id}-hint`}
        className="block min-h-11 w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 font-mono text-[16px] leading-6 aria-invalid:border-bad"
      />
      <p id={`${id}-hint`} className={`mt-1 text-[12px] leading-[18px] ${error ? 'text-bad' : 'text-faint'}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const stepperBtn =
  'grid h-11 w-11 place-items-center rounded-md bg-surface-2 text-[18px] text-ink ' +
  'hover:brightness-95 disabled:cursor-not-allowed disabled:text-faint disabled:opacity-60';

export function NumberStepper({ label, value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-medium leading-[22px]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={stepperBtn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`ลด ${label}`}>
          −
        </button>
        <output className="w-6 text-center font-mono font-semibold">{value}</output>
        <button type="button" className={stepperBtn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`เพิ่ม ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

interface ToggleProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Small set of mutually exclusive choices. */
export function SimToggle<T extends string>({ label, value, options, onChange }: ToggleProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[14px] font-medium leading-[22px]">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`min-h-11 min-w-11 rounded-md border px-3 text-[13px] font-medium ${
              option.value === value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-surface text-ink hover:bg-surface-2'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The program as a row of chips: done, current, still to run. */
export function OpChips({ ops, current }: { ops: readonly string[]; current: number }) {
  return (
    <ol className="flex flex-wrap justify-center gap-1.5 px-2" aria-label="ลำดับคำสั่ง">
      {ops.map((op, i) => (
        <li
          key={i}
          aria-current={i === current ? 'step' : undefined}
          className={`rounded-sm border px-2 font-mono text-[12px] leading-[22px] ${
            i === current
              ? 'border-accent bg-accent text-accent-ink'
              : i < current
                ? 'border-line text-faint line-through'
                : 'border-line bg-surface text-ink'
          }`}
        >
          {op}
        </li>
      ))}
    </ol>
  );
}

/** Values a program returned, as it would print them. */
export function OutputLog({ lines, title = 'ค่าที่คืนกลับมา' }: { lines: readonly string[]; title?: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="px-1.5">
      <p className="text-[12px] font-medium leading-[18px] text-faint">{title}</p>
      <ul className="font-mono text-[13px] leading-[22px] text-ink">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** Splits "a, b; c" style programs into trimmed, non-empty tokens. */
export const splitOps = (text: string) =>
  text
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

/** One character of a short value: a letter of any script (with its combining marks, as Thai vowels are) or a digit. */
export const VALUE = '[\\p{L}\\p{M}\\p{N}]';
