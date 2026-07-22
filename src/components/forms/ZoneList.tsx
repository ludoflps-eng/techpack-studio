import type { Face, GarmentSpec, PrintZone } from '../../types';
import { ZoneCard } from './ZoneCard';

export function ZoneList({
  face,
  zones,
  garment,
  referenceSize,
  selectedZoneId,
  onSelectZone,
  onChangeZone,
  onRemoveZone,
  onMoveZone,
  onAddZone,
}: {
  face: Face;
  zones: PrintZone[];
  garment: GarmentSpec;
  referenceSize: string;
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  onChangeZone: (id: string, patch: Partial<PrintZone>) => void;
  onRemoveZone: (id: string) => void;
  onMoveZone: (id: string, direction: -1 | 1) => void;
  onAddZone: (face: Face) => void;
}) {
  const faceZones = zones.filter((z) => z.face === face);

  return (
    <div className="space-y-2">
      {faceZones.map((zone, i) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          garment={garment}
          referenceSize={referenceSize}
          selected={selectedZoneId === zone.id}
          onSelect={() => onSelectZone(zone.id)}
          onChange={(patch) => onChangeZone(zone.id, patch)}
          onRemove={() => onRemoveZone(zone.id)}
          onMove={(dir) => onMoveZone(zone.id, dir)}
          canMoveUp={i > 0}
          canMoveDown={i < faceZones.length - 1}
        />
      ))}
      <button
        type="button"
        onClick={() => onAddZone(face)}
        className="w-full rounded-md border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 hover:border-rose-400 hover:text-rose-600"
      >
        + Add print zone ({face})
      </button>
    </div>
  );
}
