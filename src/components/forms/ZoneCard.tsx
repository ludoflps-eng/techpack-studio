import { useState } from 'react';
import {
  FONT_OPTIONS,
  PRINT_TECHNIQUE_LABELS,
  type GarmentSpec,
  type PrintZone,
} from '../../types';
import { Field, NumberInput, TextInput, Textarea, Select } from '../ui/Field';
import { zoneRect } from '../../lib/geometry';
import { lookupPantone } from '../../lib/pantone';

export function ZoneCard({
  zone,
  garment,
  selected,
  onSelect,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  zone: PrintZone;
  garment: GarmentSpec;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<PrintZone>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [open, setOpen] = useState(selected);
  const fitted = zoneRect(zone, garment);
  const isClamped =
    Math.abs(fitted.width - zone.widthCm) > 0.05 || Math.abs(fitted.height - zone.heightCm) > 0.05;
  const inkMatch = lookupPantone(zone.pantone);
  const inkUnresolved = zone.pantone.trim() !== '' && !inkMatch;

  return (
    <div
      className={`rounded-lg border ${selected ? 'border-rose-400 ring-1 ring-rose-300' : 'border-neutral-200'} bg-white`}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => {
          setOpen((o) => !o);
          onSelect();
        }}
      >
        <span className="h-4 w-4 shrink-0 rounded-full border border-neutral-300" style={{ background: zone.hex }} />
        <span className="flex-1 truncate text-sm font-medium text-neutral-800">{zone.label || 'Untitled zone'}</span>
        <button
          type="button"
          title="Move up"
          disabled={!canMoveUp}
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 text-xs px-1"
        >
          ▲
        </button>
        <button
          type="button"
          title="Move down"
          disabled={!canMoveDown}
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-20 text-xs px-1"
        >
          ▼
        </button>
        <button
          type="button"
          title="Delete zone"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-neutral-400 hover:text-rose-600 text-xs px-1"
        >
          ✕
        </button>
        <span className="text-neutral-400 text-xs">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="space-y-3 border-t border-neutral-100 px-3 py-3">
          <Field label="Label">
            <TextInput value={zone.label} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>

          <Field label="Content">
            <Textarea
              rows={3}
              value={zone.content}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder={'One line per row of text'}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Font">
              <Select value={zone.font} onChange={(e) => onChange({ font: e.target.value })}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Case">
              <Select
                value={zone.textCase}
                onChange={(e) => onChange({ textCase: e.target.value as PrintZone['textCase'] })}
              >
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="none">As typed</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Line spacing">
              <Select
                value={zone.lineSpacing}
                onChange={(e) => onChange({ lineSpacing: e.target.value as PrintZone['lineSpacing'] })}
              >
                <option value="normal">Normal</option>
                <option value="tight">Tight (lines nearly touching)</option>
              </Select>
            </Field>
            <Field label="Stretch to fill width">
              <label className="flex h-[34px] items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={zone.stretchToFit}
                  onChange={(e) => onChange({ stretchToFit: e.target.checked })}
                  className="h-4 w-4 accent-rose-600"
                />
                Stretch letters to fill box width
              </label>
            </Field>
          </div>

          <Field label="Ink Pantone">
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded border border-neutral-300"
                style={
                  inkMatch
                    ? { background: inkMatch.hex }
                    : {
                        background:
                          'repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 4px, #ffffff 4px, #ffffff 8px)',
                      }
                }
                title={inkMatch ? inkMatch.hex : 'Not recognized'}
              />
              <TextInput
                placeholder="e.g. 812 C"
                value={zone.pantone}
                onChange={(e) => {
                  const ref = e.target.value;
                  const m = lookupPantone(ref);
                  onChange(m ? { pantone: ref, hex: m.hex, colorName: m.name } : { pantone: ref });
                }}
              />
            </div>
            {inkUnresolved && (
              <p className="mt-1 text-xs text-amber-600">
                Not in our reference list — swatch and name are unchanged. Enter the color name manually below.
              </p>
            )}
          </Field>
          <Field label="Color name">
            <TextInput value={zone.colorName} onChange={(e) => onChange({ colorName: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Print width (cm)">
              <NumberInput value={zone.widthCm} onChange={(e) => onChange({ widthCm: Number(e.target.value) })} />
            </Field>
            <Field label="Print height (cm)">
              <NumberInput value={zone.heightCm} onChange={(e) => onChange({ heightCm: Number(e.target.value) })} />
            </Field>
          </div>
          {isClamped && (
            <p className="-mt-1 text-xs text-rose-600">
              Auto-fitted to {fitted.width.toFixed(1)} × {fitted.height.toFixed(1)} cm to stay on the garment
              (requested size doesn't fit at this position).
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Measured from">
              <Select
                value={zone.anchorV}
                onChange={(e) => onChange({ anchorV: e.target.value as PrintZone['anchorV'] })}
              >
                <option value="collar">Top of Shirt</option>
                <option value="hem">Hem (bottom up)</option>
              </Select>
            </Field>
            <Field label={`Distance from ${zone.anchorV === 'collar' ? 'top of shirt' : 'hem'} (cm)`}>
              <NumberInput
                value={zone.distanceVCm}
                onChange={(e) => onChange({ distanceVCm: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Horizontal alignment">
              <Select value={zone.align} onChange={(e) => onChange({ align: e.target.value as PrintZone['align'] })}>
                <option value="center">Centered</option>
                <option value="left">Left-aligned</option>
                <option value="right">Right-aligned</option>
              </Select>
            </Field>
            {zone.align === 'center' ? (
              <Field label="Offset from centerline (cm)">
                <NumberInput
                  value={zone.centerOffsetCm}
                  onChange={(e) => onChange({ centerOffsetCm: Number(e.target.value) })}
                />
              </Field>
            ) : (
              <Field label={`Margin from ${zone.align} edge (cm)`}>
                <NumberInput
                  value={zone.edgeMarginCm}
                  onChange={(e) => onChange({ edgeMarginCm: Number(e.target.value) })}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Technique">
              <Select
                value={zone.technique}
                onChange={(e) => onChange({ technique: e.target.value as PrintZone['technique'] })}
              >
                {Object.entries(PRINT_TECHNIQUE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {zone.technique === 'other' && (
              <Field label="Technique (specify)">
                <TextInput
                  value={zone.techniqueOther}
                  onChange={(e) => onChange({ techniqueOther: e.target.value })}
                />
              </Field>
            )}
          </div>

          <Field label="Symbol / special placement note">
            <TextInput
              placeholder='e.g. ™ superscript, top-right of "BOY", 4mm'
              value={zone.symbolNote}
              onChange={(e) => onChange({ symbolNote: e.target.value })}
            />
          </Field>

          <Field label="Additional notes">
            <Textarea rows={2} value={zone.notes} onChange={(e) => onChange({ notes: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}
