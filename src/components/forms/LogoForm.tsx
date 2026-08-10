import { useEffect, useRef, useState } from 'react';
import type { LogoSpec } from '../../types';
import { Field, NumberInput } from '../ui/Field';
import { removeImageBackground, tightenImageEdges } from '../../lib/imageBackgroundRemoval';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A checkerboard-backed preview of the (already background-removed) image, with a small blue
 *  dot marking its current reference point — the same marker style as the "Reference point to
 *  position text" legend on the spec sheet — click anywhere on the picture to move that
 *  reference point there. */
function CrossPlacementPreview({
  logo,
  onCrossChange,
}: {
  logo: LogoSpec;
  onCrossChange: (patch: { crossXPercent: number; crossYPercent: number }) => void;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const crossXPercent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const crossYPercent = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onCrossChange({ crossXPercent, crossYPercent });
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className="relative cursor-crosshair overflow-hidden rounded-md border border-neutral-300"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 6px, #ffffff 6px, #ffffff 12px)',
        }}
      >
        <img src={logo.imageDataUrl} alt="" className="block max-h-56 w-full select-none object-contain" draggable={false} />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${logo.crossXPercent * 100}%`,
            top: `${logo.crossYPercent * 100}%`,
            background: '#2563eb',
          }}
        />
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        Click the picture to move the blue dot — the point that becomes its position reference below.
      </p>
    </div>
  );
}

function LogoItemForm({
  logo,
  onChange,
  onBringToFront,
  onSendToBack,
}: {
  logo: LogoSpec;
  onChange: (patch: Partial<LogoSpec>) => void;
  /** Reorders this picture above/below every OTHER text/picture on the same face (compared
   *  together), for when items overlap on the canvas. */
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);

  async function handleTightenEdges() {
    setReprocessing(true);
    setReprocessError(null);
    try {
      const processed = await tightenImageEdges(logo.imageDataUrl);
      onChange(processed);
    } catch (err) {
      setReprocessError(
        err instanceof Error
          ? `Couldn't clean up that picture: ${err.message}`
          : "Couldn't clean up that picture — try again."
      );
    } finally {
      setReprocessing(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <CrossPlacementPreview logo={logo} onCrossChange={onChange} />

      <div>
        <button
          type="button"
          disabled={reprocessing}
          onClick={handleTightenEdges}
          className="w-full rounded-md border border-neutral-300 py-1.5 text-xs font-semibold text-neutral-600 hover:border-rose-400 hover:text-rose-600 disabled:cursor-wait disabled:opacity-60"
        >
          {reprocessing ? 'Cleaning up edges…' : 'Clean up edges'}
        </button>
        <p className="mt-1 text-[11px] text-neutral-400">
          If a faint edge of the original background is still visible, this shaves it off directly
          (no re-detection, so it won't second-guess the subject) — safe to click more than once.
        </p>
        {reprocessError && <p className="mt-1 text-xs text-amber-600">{reprocessError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Width (cm)">
          <NumberInput value={logo.widthCm} onChange={(e) => onChange({ widthCm: Number(e.target.value) })} />
        </Field>
        <Field label="Rotation (°, clockwise)">
          <NumberInput value={logo.rotationDeg} onChange={(e) => onChange({ rotationDeg: Number(e.target.value) })} />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Position (reference point)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Circle (cm)">
            <NumberInput value={logo.circleCm} onChange={(e) => onChange({ circleCm: Number(e.target.value) })} />
          </Field>
          <Field label="Triangle (cm)">
            <NumberInput value={logo.triangleCm} onChange={(e) => onChange({ triangleCm: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Layer (if text/pictures overlap)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBringToFront}
            className="flex-1 rounded-md border border-neutral-300 py-1.5 text-xs font-medium text-neutral-600 hover:border-rose-400 hover:text-rose-600"
          >
            Bring to front
          </button>
          <button
            type="button"
            onClick={onSendToBack}
            className="flex-1 rounded-md border border-neutral-300 py-1.5 text-xs font-medium text-neutral-600 hover:border-rose-400 hover:text-rose-600"
          >
            Send to back
          </button>
        </div>
      </div>
    </div>
  );
}

/** A pack can have any number of independent logos/pictures per face, each with its background
 *  already removed and its own reference point (a blue dot) and (circle, triangle) position — the
 *  same collapsible-card list pattern FrontTextForm uses. */
export function LogoForm({
  logos,
  onAdd,
  onChange,
  onRemove,
  onBringToFront,
  onSendToBack,
}: {
  logos: LogoSpec[];
  onAdd: (image: { imageDataUrl: string; naturalWidthPx: number; naturalHeightPx: number }) => string;
  onChange: (id: string, patch: Partial<LogoSpec>) => void;
  onRemove: (id: string) => void;
  /** Reorders a picture above/below every other text/picture on the same face. */
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(logos[0] ? [logos[0].id] : []));
  const knownIds = useRef<Set<string>>(new Set(logos.map((l) => l.id)));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentIds = logos.map((l) => l.id);
    const newIds = currentIds.filter((id) => !knownIds.current.has(id));
    if (newIds.length > 0) {
      setOpenIds((prev) => new Set([...prev, ...newIds]));
    }
    knownIds.current = new Set(currentIds);
  }, [logos]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again later if needed
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const processed = await removeImageBackground(file);
      onAdd(processed);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? `Couldn't process that picture: ${err.message}`
          : "Couldn't process that picture — try a different file."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {logos.map((logo) => {
        const open = openIds.has(logo.id);
        return (
          <div key={logo.id} className="rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => toggle(logo.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <ChevronIcon open={open} />
                <span
                  className="h-6 w-6 shrink-0 rounded border border-neutral-300 bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 3px, #ffffff 3px, #ffffff 6px), url(${logo.imageDataUrl})`,
                  }}
                />
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Picture
                </span>
                <span className="truncate text-xs text-neutral-400">
                  — {logo.widthCm.toFixed(1)} cm wide
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(logo.id)}
                className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            </div>
            {open && (
              <div className="border-t border-neutral-200 p-2.5">
                <LogoItemForm
                  logo={logo}
                  onChange={(patch) => onChange(logo.id, patch)}
                  onBringToFront={() => onBringToFront(logo.id)}
                  onSendToBack={() => onSendToBack(logo.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-md border border-dashed border-neutral-300 py-2 text-xs font-semibold text-neutral-600 hover:border-rose-400 hover:text-rose-600 disabled:cursor-wait disabled:opacity-60"
      >
        {uploading ? 'Removing background…' : '+ Upload a picture'}
      </button>
      {uploading && (
        <p className="text-[11px] text-neutral-400">
          First use in this browser downloads a small on-device model — this can take a bit longer
          the first time.
        </p>
      )}
      {uploadError && <p className="text-xs text-amber-600">{uploadError}</p>}
    </div>
  );
}
