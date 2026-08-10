import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FONT_OPTIONS, type FrontTextSpec, type TextCase } from '../../types';
import { Field, NumberInput, Select, TextInput, Textarea } from '../ui/Field';
import { lookupPantone } from '../../lib/pantone';
import { centeredTriangleCm, type FaceGarmentCtx } from '../../lib/frontTextLayout';
import { PantonePicker } from './PantonePicker';

/** A small two-way toggle used in place of a full-width labeled dropdown, to keep the position
 *  section compact — the label and the mode switch share one row. */
function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-neutral-300 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-2 py-0.5 font-medium ${
            value === o.value ? 'bg-rose-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A small square toggle button for an independent (non-exclusive) style flag — Bold/Italic/
 *  Underline can each be on or off regardless of the others, unlike SegmentedToggle's mutually
 *  exclusive options. The button's own label is rendered in the style it toggles, as a visual
 *  preview of what it does. */
function StyleToggleButton({
  active,
  onClick,
  label,
  style,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  style: CSSProperties;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm ${
        active
          ? 'border-rose-600 bg-rose-600 text-white'
          : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
      }`}
      style={style}
    >
      {children}
    </button>
  );
}

/** All the fields for one front-text item. A pack can have any number of these, each positioned
 *  independently on the shirt — see FrontTextForm below for the list wrapper. */
function FrontTextItemForm({
  frontText,
  onChange,
  anchorOptions,
  ctx,
  onBringToFront,
  onSendToBack,
}: {
  frontText: FrontTextSpec;
  onChange: (patch: Partial<FrontTextSpec>) => void;
  /** Other texts in the same pack this one could anchor its position to (never includes itself). */
  anchorOptions: { id: string; label: string }[];
  /** Face/garment context needed to show the live cm value "Center on Guide A" resolves to. */
  ctx: FaceGarmentCtx;
  /** Reorders this text above/below every OTHER text/picture on the same face (compared
   *  together), for when items overlap on the canvas. */
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const match = lookupPantone(frontText.textPantone);
  const centeredCm = frontText.centerHorizontally ? centeredTriangleCm(frontText, ctx) : null;

  return (
    <div className="space-y-2.5">
      <Field label="Text">
        <Textarea
          rows={2}
          placeholder="Type the text to print on the front"
          value={frontText.content}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Height (cm)">
          <NumberInput
            value={frontText.textHeightCm}
            onChange={(e) => onChange({ textHeightCm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Case">
          <Select
            value={frontText.textCase}
            onChange={(e) => onChange({ textCase: e.target.value as TextCase })}
          >
            <option value="none">As typed</option>
            <option value="uppercase">UPPER</option>
            <option value="lowercase">lower</option>
          </Select>
        </Field>
        <Field label="Style">
          <div className="flex h-9 items-center gap-1">
            <StyleToggleButton
              active={frontText.bold}
              onClick={() => onChange({ bold: !frontText.bold })}
              label="Bold"
              style={{ fontWeight: 700 }}
            >
              B
            </StyleToggleButton>
            <StyleToggleButton
              active={frontText.italic}
              onClick={() => onChange({ italic: !frontText.italic })}
              label="Italic"
              style={{ fontStyle: 'italic' }}
            >
              I
            </StyleToggleButton>
            <StyleToggleButton
              active={frontText.underline}
              onClick={() => onChange({ underline: !frontText.underline })}
              label="Underline"
              style={{ textDecoration: 'underline' }}
            >
              U
            </StyleToggleButton>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Font" className="col-span-3">
          <Select value={frontText.font} onChange={(e) => onChange({ font: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <Field label="Pantone">
          <div className="flex items-center gap-1.5">
            <span
              className="h-9 w-9 shrink-0 rounded border border-neutral-300"
              style={
                match
                  ? { background: match.hex }
                  : {
                      background:
                        'repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 4px, #ffffff 4px, #ffffff 8px)',
                    }
              }
              title={match ? match.hex : 'Not recognized'}
            />
            <PantonePicker
              onSelect={(s) => onChange({ textPantone: s.code, textHex: s.hex, textColorName: s.name })}
            />
            <TextInput
              placeholder="Pick a color →"
              value={frontText.textPantone}
              readOnly
              title="Set by picking a color from the Pantone picker — not typed directly"
              className="cursor-default bg-neutral-50 text-neutral-500"
            />
          </div>
        </Field>
        <Field label="Color name">
          <TextInput
            value={frontText.textColorName}
            readOnly
            title="Set by picking a color from the Pantone picker — not typed directly"
            className="cursor-default bg-neutral-50 text-neutral-500"
          />
        </Field>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Position
          </span>
          {anchorOptions.length > 0 && (
            <SegmentedToggle
              value={frontText.anchorTextId ? 'relative' : 'absolute'}
              options={[
                { value: 'absolute', label: 'Absolute' },
                { value: 'relative', label: 'Relative' },
              ]}
              onChange={(mode) =>
                onChange({ anchorTextId: mode === 'relative' ? anchorOptions[0].id : '' })
              }
            />
          )}
        </div>

        {!frontText.anchorTextId ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Circle (cm)">
              <NumberInput
                value={frontText.circleCm}
                onChange={(e) => onChange({ circleCm: Number(e.target.value) })}
              />
            </Field>
            <Field label="Triangle (cm)">
              {centeredCm !== null ? (
                <NumberInput value={Number(centeredCm.toFixed(2))} disabled title="Computed automatically — Center on Guide A is on" />
              ) : (
                <NumberInput
                  value={frontText.triangleCm}
                  onChange={(e) => onChange({ triangleCm: Number(e.target.value) })}
                />
              )}
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <Select
              value={frontText.anchorTextId}
              onChange={(e) => onChange({ anchorTextId: e.target.value })}
            >
              {anchorOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Below(-)/Above(+)">
                <NumberInput
                  value={frontText.anchorBelowCm}
                  onChange={(e) => onChange({ anchorBelowCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Left(-)/Right(+)">
                {centeredCm !== null ? (
                  <NumberInput value={Number(centeredCm.toFixed(2))} disabled title="Computed automatically — Center on Guide A is on" />
                ) : (
                  <NumberInput
                    value={frontText.anchorRightCm}
                    onChange={(e) => onChange({ anchorRightCm: Number(e.target.value) })}
                  />
                )}
              </Field>
            </div>
          </div>
        )}
      </div>

      <Field label="Rotation (°, clockwise)">
        <NumberInput
          value={frontText.rotationDeg}
          onChange={(e) => onChange({ rotationDeg: Number(e.target.value) })}
        />
      </Field>

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <label
          className="flex items-center gap-2 text-xs font-medium text-neutral-600"
          title="Draws 4 fine red lines flush against the text's actual rendered edges, with measurements, to cross-check its real on-shirt size."
        >
          <input
            type="checkbox"
            checked={frontText.showLimits}
            onChange={(e) => onChange({ showLimits: e.target.checked })}
            className="h-4 w-4 accent-rose-600"
          />
          Show text limits
        </label>
        <label
          className="flex items-center gap-2 text-xs font-medium text-neutral-600"
          title="Automatically sets the horizontal (triangle) position so the text sits centered on guide A, the garment's vertical centerline — recalculated live as the text, font, size, or case change."
        >
          <input
            type="checkbox"
            checked={frontText.centerHorizontally}
            onChange={(e) => onChange({ centerHorizontally: e.target.checked })}
            className="h-4 w-4 accent-rose-600"
          />
          Center on Guide A
        </label>
      </div>
    </div>
  );
}

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

/** A pack can have any number of independent front-text items, each with its own content, size,
 *  font, color, and position. Each renders as a collapsible card — only the ones you're actively
 *  editing need to stay open — so a pack with several texts doesn't turn into a long scroll. */
export function FrontTextForm({
  frontTexts,
  onAdd,
  onChange,
  onRemove,
  onBringToFront,
  onSendToBack,
  ctx,
}: {
  frontTexts: FrontTextSpec[];
  onAdd: () => void;
  onChange: (id: string, patch: Partial<FrontTextSpec>) => void;
  onRemove: (id: string) => void;
  /** Reorders a text above/below every other text/picture on the same face. */
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  /** Face/garment context needed to show the live cm value "Center on Guide A" resolves to. */
  ctx: FaceGarmentCtx;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(frontTexts[0] ? [frontTexts[0].id] : []));
  const knownIds = useRef<Set<string>>(new Set(frontTexts.map((t) => t.id)));

  // Newly added texts (via onAdd, or an import) open automatically so there's no extra click
  // needed to start editing them; texts that already existed keep whatever state the user left
  // them in.
  useEffect(() => {
    const currentIds = frontTexts.map((t) => t.id);
    const newIds = currentIds.filter((id) => !knownIds.current.has(id));
    if (newIds.length > 0) {
      setOpenIds((prev) => new Set([...prev, ...newIds]));
    }
    knownIds.current = new Set(currentIds);
  }, [frontTexts]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {frontTexts.map((frontText, i) => {
        const open = openIds.has(frontText.id);
        const preview = frontText.content.trim() || '(empty)';
        return (
          <div key={frontText.id} className="rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => toggle(frontText.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <ChevronIcon open={open} />
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Text {i + 1}
                </span>
                <span className="truncate text-xs text-neutral-400">— {preview}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(frontText.id)}
                className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            </div>
            {open && (
              <div className="border-t border-neutral-200 p-2.5">
                <FrontTextItemForm
                  frontText={frontText}
                  onChange={(patch) => onChange(frontText.id, patch)}
                  anchorOptions={frontTexts
                    .map((t, j) => ({ id: t.id, label: `Text ${j + 1}` }))
                    .filter((o) => o.id !== frontText.id)}
                  ctx={ctx}
                  onBringToFront={() => onBringToFront(frontText.id)}
                  onSendToBack={() => onSendToBack(frontText.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="w-full rounded-md border border-dashed border-neutral-300 py-2 text-xs font-semibold text-neutral-600 hover:border-rose-400 hover:text-rose-600"
      >
        + Add another text
      </button>
    </div>
  );
}
