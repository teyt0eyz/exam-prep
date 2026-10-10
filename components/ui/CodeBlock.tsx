'use client';

import { isValidElement, useRef, useState, type ComponentProps, type ReactNode } from 'react';

/** "language-ts" on the inner <code> -> "ts" */
function languageOf(children: ReactNode): string {
  if (!isValidElement<{ className?: string }>(children)) return 'code';
  return /language-(\S+)/.exec(children.props.className ?? '')?.[1] ?? 'code';
}

/** Fenced code block from MDX: header with language + Copy, body scrolls sideways on its own. */
export function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context or denied): leave the label unchanged
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-[14px] border border-line bg-code">
      <div className="flex h-11 items-center justify-between border-b border-line pl-3.5 pr-1 font-mono text-[12px] text-faint">
        <span>{languageOf(children)}</span>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 min-w-11 rounded-md px-2.5 font-mono text-[12px] text-muted hover:text-ink"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        ref={ref}
        className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-[21px] lg:text-[13px] lg:leading-[22px] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[length:inherit]"
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}
