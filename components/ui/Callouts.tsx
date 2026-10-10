import type { ReactNode } from 'react';

/** "สรุปก่อนสอบ" box at the end of a lesson. */
export function ExamSummary({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 overflow-hidden rounded-lg border border-line bg-surface">
      <p className="bg-accent-soft px-4 py-2 text-[15px] font-semibold leading-6 text-accent">สรุปก่อนสอบ</p>
      <div className="px-4 py-1 [&_li]:text-[15px] [&_li]:leading-[26px]">{children}</div>
    </aside>
  );
}

/** A point where the lecturer's slides differ from general knowledge, or a caveat about the docs. */
export function DocNote({ children }: { children: ReactNode }) {
  return (
    <aside className="my-4 rounded-md border border-warn bg-warn-soft px-4 py-1 [&_p]:text-[14px] [&_p]:leading-6">
      <p className="!mb-0 !mt-2 font-semibold text-warn">หมายเหตุจากเอกสาร</p>
      {children}
    </aside>
  );
}

/** Supplementary knowledge that is not in the lecturer's slides. */
export function Extra({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="my-4 rounded-md border border-line bg-surface-2 px-4 py-1 [&_li]:text-[14px] [&_li]:leading-6 [&_p]:text-[14px] [&_p]:leading-6">
      <p className="!mb-0 !mt-2 flex flex-wrap items-center gap-2 font-semibold text-ink">
        <span className="rounded-sm bg-warn-soft px-2 py-px text-[12px] font-medium leading-[20px] text-warn">เสริม</span>
        {title}
      </p>
      {children}
    </aside>
  );
}

/** Where in the lecturer's material a lesson comes from. */
export function Source({ children }: { children: ReactNode }) {
  return <p className="mt-8 border-t border-line pt-3 text-[13px] leading-5 text-faint">ที่มา: {children}</p>;
}
