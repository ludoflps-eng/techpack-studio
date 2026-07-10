import type { GarmentSpec } from '../../types';
import { Field, NumberInput, TextInput, ColorField, Textarea } from '../ui/Field';
import { nearestColorName } from '../../lib/colorNames';

export function GarmentForm({
  garment,
  onChange,
}: {
  garment: GarmentSpec;
  onChange: (patch: Partial<GarmentSpec>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chest width (flat, cm)">
          <NumberInput
            value={garment.chestWidthCm}
            onChange={(e) => onChange({ chestWidthCm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Body length, collar to hem (cm)">
          <NumberInput
            value={garment.bodyLengthCm}
            onChange={(e) => onChange({ bodyLengthCm: Number(e.target.value) })}
          />
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
