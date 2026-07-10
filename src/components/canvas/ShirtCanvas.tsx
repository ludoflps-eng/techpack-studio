import type { Face, GarmentSpec, PrintZone } from '../../types';
import { canvasSize, shirtPath, zoneRect } from '../../lib/geometry';
import { ZonePrint } from './ZonePrint';
import { DimensionOverlay } from './DimensionOverlay';

export function ShirtCanvas({
  face,
  garment,
  zones,
  showDimensions,
  selectedZoneId,
  onSelectZone,
}: {
  face: Face;
  garment: GarmentSpec;
  zones: PrintZone[];
  showDimensions: boolean;
  selectedZoneId?: string | null;
  onSelectZone?: (id: string) => void;
}) {
  const { width, height, originX, originY } = canvasSize(garment);
  const faceZones = zones.filter((z) => z.face === face);
  const halfChest = garment.chestWidthCm / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <g transform={`translate(${originX} ${originY})`}>
        <path
          d={shirtPath(garment.chestWidthCm, garment.bodyLengthCm, face)}
          fill={garment.fabricHex}
          stroke="#2a2a2a"
          strokeWidth={0.25}
          strokeLinejoin="round"
        />

        {showDimensions && (
          <g stroke="#64748b" strokeWidth={0.18}>
            <line x1={0} y1={-4} x2={0} y2={garment.bodyLengthCm} strokeDasharray="0.4,0.7" />
            <line x1={-halfChest} y1={0} x2={halfChest} y2={0} strokeDasharray="0.4,0.7" />
          </g>
        )}

        {faceZones.map((zone) => {
          const rect = zoneRect(zone, garment);
          return (
            <g key={zone.id}>
              <ZonePrint
                zone={zone}
                rect={rect}
                selected={selectedZoneId === zone.id}
                onSelect={onSelectZone ? () => onSelectZone(zone.id) : undefined}
              />
              {showDimensions && <DimensionOverlay zone={zone} rect={rect} garment={garment} />}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
