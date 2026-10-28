// Shared class strings, following design/Exam Prep.dc.html.
// Touch: every tappable row/button >= 44px, primary buttons 48px, answer choices 56px.
const btnBase =
  'press inline-flex items-center justify-center gap-2 rounded-md text-center font-semibold leading-snug ' +
  'transition-[background-color,filter,transform,box-shadow] disabled:cursor-not-allowed';

export const btnPrimary =
  `${btnBase} min-h-12 bg-accent px-5 text-[16px] text-accent-ink shadow-[0_6px_16px_-8px_var(--acc)] hover:brightness-110 ` +
  'disabled:bg-surface-2 disabled:text-faint disabled:hover:brightness-100';
export const btnSecondary =
  `${btnBase} min-h-12 border border-line bg-surface px-5 text-[15px] text-ink shadow-card hover:border-line-strong hover:bg-surface-2 ` +
  'disabled:text-faint disabled:hover:bg-surface';
export const btnGhost = `${btnBase} min-h-11 px-4 text-[15px] text-accent hover:bg-accent-soft`;
/** Inverted (ink) button: the final "submit" action. */
export const btnInk = `${btnBase} min-h-12 bg-ink px-5 text-[16px] text-canvas hover:opacity-90`;
export const iconBtn =
  'inline-flex h-11 w-11 flex-none items-center justify-center rounded-md text-ink hover:bg-surface-2';

/** surface + 1px line, no shadow. */
export const card = 'rounded-lg border border-line bg-surface shadow-card';
export const badge =
  'inline-block rounded-sm bg-accent-soft px-2 py-[3px] font-mono text-xs font-semibold leading-[18px] text-accent';
export const chip = 'inline-block rounded-sm px-2.5 py-[3px] text-[13px] font-medium leading-[18px]';

// Type scale
export const display = 'font-display text-[30px] font-semibold leading-[42px] tracking-tight lg:text-[44px] lg:leading-[58px]';
export const h1 = 'font-display text-[26px] font-semibold leading-[38px] tracking-tight lg:text-[34px] lg:leading-[48px]';
export const h2 = 'font-display text-[21px] font-semibold leading-[32px] tracking-tight';
/** Small uppercase-like label above a section title. */
export const eyebrow = 'text-[12px] font-semibold tracking-[0.08em] text-faint';
export const h3 = 'text-[17px] font-semibold leading-[26px]';
export const small = 'text-[14px] leading-[22px]';
export const caption = 'text-[12px] font-medium leading-[18px]';
