/** 8px bar. Uses the current --acc; the fill eases to its new width. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-surface-3"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
