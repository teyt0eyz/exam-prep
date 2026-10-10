import Link from 'next/link';

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-[15px] font-bold leading-none text-canvas"
      >
        ต
      </span>
      <b className="text-[17px] font-bold">เตรียมสอบ</b>
    </Link>
  );
}
