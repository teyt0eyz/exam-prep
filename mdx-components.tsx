import type { MDXComponents } from 'mdx/types';
import { DocNote, ExamSummary, Extra, Source } from '@/components/ui/Callouts';
import { CodeBlock } from '@/components/ui/CodeBlock';

// Lesson prose, following the design's type scale (H2 21/30, body 16/28, mono 14/24).
// Wide blocks (code, tables) scroll inside their own box so the page itself never
// scrolls sideways on a 360px screen.
const components: MDXComponents = {
  h2: (props) => <h2 className="mb-2 mt-8 text-[21px] font-semibold leading-[30px]" {...props} />,
  h3: (props) => <h3 className="mb-1 mt-6 text-[17px] font-semibold leading-[26px]" {...props} />,
  p: (props) => <p className="my-4 text-pretty lg:text-[17px] lg:leading-[30px]" {...props} />,
  ul: (props) => (
    <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-6 marker:text-faint" {...props} />
  ),
  ol: (props) => (
    <ol
      className="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-6 marker:font-mono marker:text-faint"
      {...props}
    />
  ),
  a: (props) => <a className="font-medium text-accent underline underline-offset-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-4 rounded-md bg-accent-soft px-4 py-1 text-[15px] leading-[26px]" {...props} />
  ),
  code: (props) => (
    <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[0.875em]" {...props} />
  ),
  pre: CodeBlock,
  // Available in every lesson without an import
  ExamSummary,
  DocNote,
  Extra,
  Source,
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-max border-collapse text-[14px] leading-[22px]" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border-t border-line px-3 py-2 first:border-t-0" {...props} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
