import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { iconBtn } from '@/components/ui/styles';
import { Brand } from './Brand';
import { MenuButton } from './MenuButton';

interface Props {
  /** Mobile: back button + label in the top bar. Omit on the home page to show the brand. */
  back?: { href: string; label: string };
  /** Desktop breadcrumb shown above the content. */
  crumb?: string;
  /** Mobile top bar gets a bottom border (lesson pages). */
  divider?: boolean;
  /** Reading column instead of the wide layout (lesson pages). */
  narrow?: boolean;
  children: ReactNode;
}

/** Page frame: 60px top bar on mobile, breadcrumb + wide gutters next to the sidebar on desktop. */
export function PageShell({ back, crumb, divider = false, narrow = false, children }: Props) {
  return (
    <>
      <header
        className={`sticky top-0 z-20 flex h-[60px] items-center justify-between gap-1 bg-canvas/85 backdrop-blur-md lg:h-[68px] lg:px-8 ${
          back ? 'px-2' : 'pl-5 pr-3'
        } ${divider ? 'border-b border-line lg:border-transparent' : ''}`}
      >
        {back ? (
          <div className="flex min-w-0 items-center gap-1">
            <Link href={back.href} aria-label={`กลับไป ${back.label}`} className={iconBtn}>
              <ChevronLeftIcon width={22} height={22} strokeWidth={2.2} />
            </Link>
            <span className="truncate text-[15px] text-muted">{back.label}</span>
          </div>
        ) : (
          <Brand />
        )}
        <MenuButton className="mr-1 lg:mr-0" />
      </header>
      <main className={`mx-auto w-full ${narrow ? 'max-w-[888px]' : 'max-w-[1180px]'} px-5 pb-10 lg:px-16 lg:pb-14 lg:pt-4`}>
        {crumb ? <p className="mb-5 hidden text-[14px] leading-[22px] text-faint lg:block">{crumb}</p> : null}
        {children}
      </main>
    </>
  );
}
