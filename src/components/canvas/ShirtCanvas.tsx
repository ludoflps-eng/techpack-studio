import type { Face, GarmentSpec, PrintZone } from '../../types';
import { canvasSize, templateImage, zoneRect } from '../../lib/geometry';
import { ZonePrint } from './ZonePrint';

export function ShirtCanvas({
  face,
  garment,
  zones,
  selectedZoneId,
  onSelectZone,
}: {
  face: Face;
  garment: GarmentSpec;
  zones: PrintZone[];
  selectedZoneId?: string | null;
  onSelectZone?: (id: string) => void;
}) {
  const { width, height, originX, originY } = canvasSize(garment);
  const faceZones = zones.filter((z) => z.face === face);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <g transform={`translate(${originX} ${originY})`}>
        <image {...templateImage(garment.chestWidthCm, face)} preserveAspectRatio="none" />

        {faceZones.map((zone) => {
          const rect = zoneRect(zone, garment);
          return (
            <ZonePrint
              key={zone.id}
              zone={zone}
              rect={rect}
              selected={selectedZoneId === zone.id}
              onSelect={onSelectZone ? () => onSelectZone(zone.id) : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}
