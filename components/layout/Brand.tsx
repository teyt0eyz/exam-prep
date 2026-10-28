import Link from 'next/link';

/** Wordmark: a small periwinkle tile with the Thai initial, then the site name. */
export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex min-h-11 items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-[10px] text-[16px] font-bold leading-none text-white shadow-[0_4px_12px_-4px_rgb(108_124_247/0.7)] transition-transform duration-300 group-hover:-rotate-6"
        style={{ background: 'linear-gradient(135deg, var(--brand), var(--lavender))' }}
      >
        ต
      </span>
      <b className="font-display text-[18px] font-semibold tracking-tight">เตรียมสอบ</b>
    </Link>
  );
}
