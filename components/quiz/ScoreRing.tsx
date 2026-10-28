const R = 48;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Score as a ring in the subject accent, percentage in the middle. */
export function ScoreRing({ percent, className = '' }: { percent: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 112 112"
      role="img"
      aria-label={`${percent}%`}
      className={`h-28 w-28 flex-none ${className}`}
    >
      <circle cx="56" cy="56" r={R} fill="none" strokeWidth="10" className="stroke-surface-2" />
      {percent > 0 ? (
        <circle
          cx="56"
          cy="56"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          transform="rotate(-90 56 56)"
          className="ring-arc stroke-accent"
          style={{ ['--ring-c' as string]: CIRCUMFERENCE }}
        />
      ) : null}
      <text x="56" y="64" textAnchor="middle" className="animate-pop fill-ink text-[26px] font-semibold [transform-box:fill-box] [transform-origin:center]">
        {percent}%
      </text>
    </svg>
  );
}
