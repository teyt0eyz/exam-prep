'use client';

import { useRef, type ReactNode, type RefObject } from 'react';
import { CrossIcon } from '@/components/ui/icons';
import { btnPrimary, btnSecondary, iconBtn } from '@/components/ui/styles';

export type SegmentTone = 'current' | 'answered' | 'correct' | 'wrong' | 'todo';

const SEGMENT_CLASS: Record<SegmentTone, string> = {
  current: 'bg-ink',
  answered: 'bg-accent',
  correct: 'bg-ok',
  wrong: 'bg-bad',
  todo: 'bg-line',
};

interface Props {
  /** e.g. "OS · Mock ชุดที่ 1" */
  title: string;
  /** e.g. "ข้อ 5 / 70" */
  position: string;
  /** Top-right slot: timer or mode chip. */
  status: ReactNode;
  /** One segment per question. */
  segments: SegmentTone[];
  /** Leaving discards the sitting; asked to confirm first. */
  onExit: () => void;
  exitWarning: string;
  /** Scroll container for the question, so callers can scroll it to the top. */
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  /** Desktop-only right column (navigator). */
  aside?: ReactNode;
  /** Bottom bar. `footerMobileOnly` hides it on desktop when the aside replaces it. */
  footer: ReactNode;
  footerMobileOnly?: boolean;
}

/**
 * Full-screen focus mode for a quiz sitting: no site navigation, fixed header and
 * bottom bar, only the question scrolls.
 */
export function QuizFrame({
  title,
  position,
  status,
  segments,
  onExit,
  exitWarning,
  scrollRef,
  children,
  aside,
  footer,
  footerMobileOnly = false,
}: Props) {
  const exitRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas">
      <header className="flex h-[60px] flex-none items-center gap-1 pl-1 pr-3 lg:h-[68px] lg:gap-3 lg:border-b lg:border-line lg:bg-surface lg:pl-3 lg:pr-6">
        <button
          type="button"
          aria-label="ออกจากข้อสอบ"
          className={iconBtn}
          onClick={() => exitRef.current?.showModal()}
        >
          <CrossIcon strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] leading-[18px] text-faint">{title}</p>
          <p className="text-[16px] font-semibold leading-6">{position}</p>
        </div>
        {status}
      </header>

      <div
        className={`flex flex-none px-5 lg:hidden ${segments.length > 30 ? 'gap-px' : 'gap-[3px]'}`}
        aria-hidden="true"
      >
        {segments.map((tone, i) => (
          <span key={i} className={`h-1 min-w-0 flex-1 rounded-full ${SEGMENT_CLASS[tone]}`} />
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-5 py-6 lg:px-20 lg:py-14">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 lg:gap-5">{children}</div>
        </div>
        {aside ? (
          <aside className="hidden w-[360px] flex-none flex-col gap-[18px] overflow-y-auto border-l border-line bg-surface px-6 py-7 lg:flex">
            {aside}
          </aside>
        ) : null}
      </div>

      <footer
        className={`flex-none border-t border-line bg-surface px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 ${
          footerMobileOnly ? 'lg:hidden' : ''
        }`}
      >
        <div className="mx-auto max-w-[720px]">{footer}</div>
      </footer>

      <dialog
        ref={exitRef}
        aria-label="ยืนยันการออก"
        className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-lg border border-line bg-surface p-5 text-ink backdrop:bg-scrim"
      >
        <p className="text-[18px] font-semibold leading-7">ออกจากข้อสอบ?</p>
        <p className="mt-1 text-[14px] leading-[22px] text-muted">{exitWarning}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" className={btnSecondary} onClick={() => exitRef.current?.close()}>
            ทำต่อ
          </button>
          <button type="button" className={btnPrimary} onClick={onExit}>
            ออก
          </button>
        </div>
      </dialog>
    </div>
  );
}
