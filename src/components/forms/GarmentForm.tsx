import type { GarmentSpec } from '../../types';
import { Field, Select, TextInput, ColorField, Textarea } from '../ui/Field';
import { nearestColorName } from '../../lib/colorNames';
import { GARMENT_STYLE_OPTIONS, isGarmentStyle } from '../../lib/garmentStyles';
import { SIZE_OPTIONS, isSizeLabel, type SizeLabel } from '../../lib/sizeChart';

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
      <Field label="Fabric color">
        <ColorField
          value={garment.fabricHex}
          onChange={(hex) => {
            const name = nearestColorName(hex);
            onChange(name ? { fabricHex: hex, fabricColorName: name } : { fabricHex: hex });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fabric color name">
          <TextInput
            value={garment.fabricColorName}
            onChange={(e) => onChange({ fabricColorName: e.target.value })}
          />
        </Field>
        <Field label="Fabric Pantone">
          <TextInput
            placeholder="e.g. 7528 C"
            value={garment.fabricPantone}
            onChange={(e) => onChange({ fabricPantone: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Fabric composition">
        <Textarea
          rows={2}
          placeholder="e.g. Combed cotton 240gsm, ring-spun"
          value={garment.fabricComposition}
          onChange={(e) => onChange({ fabricComposition: e.target.value })}
        />
      </Field>
    </div>
  );
}
