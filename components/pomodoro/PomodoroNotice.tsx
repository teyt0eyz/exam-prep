'use client';

import { PHASE_LABEL, pomodoro, usePomodoro } from '@/lib/pomodoro';

const MESSAGE = {
  focus: 'โฟกัสครบแล้ว ลุกยืดเส้น พักสายตา ดื่มน้ำสักหน่อย',
  short: 'พักพอแล้ว กลับมาอ่านต่อกัน',
  long: 'พักยาวเสร็จแล้ว พร้อมเริ่มชุดใหม่',
} as const;

/** Shown on any page when a Pomodoro phase ends, with the next phase one tap away. */
export function PomodoroNotice() {
  const s = usePomodoro();
  if (!s.finished) return null;
  const { phase, next } = s.finished;
  return (
    <div
      role="status"
      className="animate-rise fixed inset-x-3 border border-white/80 bg-white shadow-float bottom-[max(12px,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-[460px] flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-[14px] leading-[22px]">
        <b>หมดเวลา{PHASE_LABEL[phase]}</b> · {MESSAGE[phase]}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => pomodoro.startNext()}
          className="press min-h-11 flex-1 rounded-xl bg-grad-brand px-4 text-[14px] font-semibold text-ink shadow-card sm:flex-none"
        >
          เริ่ม{PHASE_LABEL[next]}
        </button>
        <button
          type="button"
          onClick={() => pomodoro.dismiss()}
          className="press min-h-11 rounded-xl bg-white/80 px-4 text-[14px] shadow-card hover:bg-white"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
