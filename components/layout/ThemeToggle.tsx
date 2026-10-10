'use client';

import { iconBtn } from '@/components/ui/styles';

const STORAGE_KEY = 'examprep:theme';

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Saved choice wins; otherwise follow the OS setting.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')}catch(e){}
if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
document.documentElement.dataset.theme=t})()`;

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // theme still applies for this page view
  }
}

/** Half-filled circle from the design. */
function ThemeGlyph({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex-none rounded-full border-2 border-current"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)',
      }}
    />
  );
}

/** Icon-only toggle for the mobile top bar. */
export function ThemeToggle() {
  return (
    <button type="button" onClick={toggleTheme} aria-label="สลับโหมดสว่าง/มืด" className={iconBtn}>
      <ThemeGlyph size={18} />
    </button>
  );
}

/** Labelled toggle for the desktop sidebar. Both labels render; CSS shows one. */
export function ThemeToggleRow() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line px-3 text-[14px] font-medium text-ink hover:bg-surface-2"
    >
      <ThemeGlyph size={14} />
      <span className="dark:hidden">โหมดมืด</span>
      <span className="hidden dark:inline">โหมดสว่าง</span>
    </button>
  );
}
