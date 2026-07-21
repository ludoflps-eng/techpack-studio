import { useEffect, useRef, useState } from 'react';
import { OVERSIZE_CHART } from '../../lib/oversizeChart';

const POINTS = OVERSIZE_CHART.map((row) => row.point);

export function MeasurementGuideControl({
  enabled,
  onEnabledChange,
  selectedPoints,
  onSelectedPointsChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedPoints: string[];
  onSelectedPointsChange: (points: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function togglePoint(point: string) {
    onSelectedPointsChange(
      selectedPoints.includes(point) ? selectedPoints.filter((p) => p !== point) : [...selectedPoints, point]
    );
  }

  return (
    <div className="flex items-center gap-2 self-end text-xs font-medium text-neutral-600">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 accent-rose-600"
        />
        Measurement Guides
      </label>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {selectedPoints.length > 0 ? `${selectedPoints.length} selected` : 'Select points'} ▾
        </button>

        {open && (
          <div className="absolute right-0 z-10 mt-1 grid max-h-64 w-40 grid-cols-3 gap-1 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
            {POINTS.map((point) => (
              <label
                key={point}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-normal text-neutral-700 hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={selectedPoints.includes(point)}
                  onChange={() => togglePoint(point)}
                  className="h-3.5 w-3.5 accent-rose-600"
                />
                {point}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
