import { useEffect, useRef, useState } from 'react';
import { pantoneCategories, type PantoneSwatch } from '../../lib/pantone';

export function PantonePicker({ onSelect }: { onSelect: (swatch: PantoneSwatch) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded border border-neutral-300 text-neutral-500 hover:bg-neutral-50"
        title="Pick a Pantone color"
        aria-label="Pick a Pantone color"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-20 max-h-80 w-72 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
          {pantoneCategories().map((cat) => (
            <div key={cat.category} className="mb-2 last:mb-0">
              <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {cat.category}
              </p>
              <div className="space-y-0.5">
                {cat.swatches.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => {
                      onSelect(s);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-neutral-100"
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded border border-neutral-300"
                      style={{ background: s.hex }}
                    />
                    <span className="font-mono text-neutral-700">{s.code}</span>
                    <span className="truncate text-neutral-500">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
