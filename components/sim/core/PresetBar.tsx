'use client';

interface Props<T> {
  presets: readonly { label: string; value: T }[];
  onPick: (value: T) => void;
  /** Index of the preset currently loaded, if any. */
  activeIndex?: number;
}

/** Row of example buttons that load a ready-made input into a simulation. */
export function PresetBar<T>({ presets, onPick, activeIndex }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="ตัวอย่างจากเอกสาร">
      {presets.map((preset, i) => (
        <button
          key={preset.label}
          type="button"
          aria-pressed={i === activeIndex}
          onClick={() => onPick(preset.value)}
          className={`min-h-11 rounded-md border px-3 text-[13px] font-medium leading-[18px] ${
            i === activeIndex
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink hover:bg-surface-2'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
