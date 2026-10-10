interface Props {
  /** Source lines, shown as-is. */
  lines: readonly string[];
  /** Zero-based indexes of the lines the current step executed. */
  active: readonly number[];
  /** Caption above the code, e.g. the class name. */
  label?: string;
  /** Show line numbers starting at this value. */
  startAt?: number;
}

/**
 * Code listing for a simulation, with the lines of the current step highlighted.
 * Long lines scroll inside the box, so the page never scrolls sideways.
 */
export function CodeTrace({ lines, active, label, startAt }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-code">
      {label ? (
        <p className="border-b border-line px-3 py-1.5 font-mono text-[12px] leading-[18px] text-faint">{label}</p>
      ) : null}
      <pre className="overflow-x-auto py-2 font-mono text-[12px] leading-[20px]">
        {lines.map((line, i) => {
          const on = active.includes(i);
          return (
            <div
              key={i}
              aria-current={on ? 'step' : undefined}
              className={`flex min-w-max border-l-[3px] px-3 ${
                on ? 'border-accent bg-accent-soft text-ink' : 'border-transparent text-muted'
              }`}
            >
              {startAt !== undefined ? (
                <span className="mr-3 w-5 flex-none select-none text-right text-faint">
                  {String(startAt + i).padStart(2, '0')}
                </span>
              ) : null}
              <span className="whitespace-pre">{line || ' '}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
