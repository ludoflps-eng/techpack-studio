import { PRINT_TECHNIQUE_LABELS, type GarmentSpec } from '../../types';
import { Field, Select, TextInput, Textarea } from '../ui/Field';
import { GARMENT_STYLE_OPTIONS, isGarmentStyle } from '../../lib/garmentStyles';
import { SIZE_OPTIONS, isSizeLabel, type SizeLabel } from '../../lib/sizeChart';
import { lookupPantone } from '../../lib/pantone';
import { PantonePicker } from './PantonePicker';

export function GarmentForm({
  garment,
  referenceSize,
  onChange,
  onSizeChange,
}: {
  garment: GarmentSpec;
  referenceSize: string;
  onChange: (patch: Partial<GarmentSpec>) => void;
  onSizeChange: (size: SizeLabel) => void;
}) {
  const match = lookupPantone(garment.fabricPantone);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="T-shirt style">
          <Select value={garment.style} onChange={(e) => onChange({ style: e.target.value })}>
            {!isGarmentStyle(garment.style) && <option value={garment.style}>{garment.style}</option>}
            {GARMENT_STYLE_OPTIONS.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Size">
          <Select
            value={referenceSize}
            onChange={(e) => {
              const value = e.target.value;
              if (isSizeLabel(value)) onSizeChange(value);
            }}
          >
            {!isSizeLabel(referenceSize) && <option value={referenceSize}>{referenceSize}</option>}
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Fabric Pantone">
        <div className="flex items-center gap-2">
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
            onSelect={(s) => onChange({ fabricPantone: s.code, fabricHex: s.hex, fabricColorName: s.name })}
          />
          <TextInput
            placeholder="Pick a color →"
            value={garment.fabricPantone}
            readOnly
            title="Set by picking a color from the Pantone picker — not typed directly"
            className="cursor-default bg-neutral-50 text-neutral-500"
          />
        </div>
      </Field>

      <Field label="Fabric color name">
        <TextInput
          value={garment.fabricColorName}
          readOnly
          title="Set by picking a color from the Pantone picker — not typed directly"
          className="cursor-default bg-neutral-50 text-neutral-500"
        />
      </Field>

      <Field label="Fabric composition">
        <Textarea
          rows={2}
          placeholder="e.g. Combed cotton 240gsm, ring-spun"
          value={garment.fabricComposition}
          onChange={(e) => onChange({ fabricComposition: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Technique">
          <Select
            value={garment.technique}
            onChange={(e) => onChange({ technique: e.target.value as GarmentSpec['technique'] })}
          >
            {Object.entries(PRINT_TECHNIQUE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {garment.technique === 'other' && (
          <Field label="Technique (specify)">
            <TextInput
              value={garment.techniqueOther}
              onChange={(e) => onChange({ techniqueOther: e.target.value })}
            />
          </Field>
        )}
      </div>
    </div>
  );
}
