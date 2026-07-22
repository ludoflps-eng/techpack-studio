import { useId } from 'react';
import type { Face, GarmentSpec, PrintZone } from '../../types';
import { canvasSize, templateImage, zoneRect } from '../../lib/geometry';
import { ZonePrint } from './ZonePrint';
import { MeasurementGuideOverlay } from './MeasurementGuideOverlay';

export function ShirtCanvas({
  face,
  garment,
  zones,
  selectedZoneId,
  onSelectZone,
  guidesEnabled,
  selectedPoints,
  referenceSize,
}: {
  face: Face;
  garment: GarmentSpec;
  zones: PrintZone[];
  selectedZoneId?: string | null;
  onSelectZone?: (id: string) => void;
  guidesEnabled?: boolean;
  selectedPoints?: string[];
  referenceSize?: string;
}) {
  const { width, height, originX, originY } = canvasSize(garment);
  const faceZones = zones.filter((z) => z.face === face);
  const placement = templateImage(garment.chestWidthCm, face);
  const maskId = useId();

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <g transform={`translate(${originX} ${originY})`}>
        <image {...placement} preserveAspectRatio="none" />

        {garment.fabricHex && (
          <>
            <mask id={maskId}>
              <image {...placement} preserveAspectRatio="none" />
            </mask>
            <rect
              x={placement.x}
              y={placement.y}
              width={placement.width}
              height={placement.height}
              fill={garment.fabricHex}
              mask={`url(#${maskId})`}
              style={{ mixBlendMode: 'multiply' }}
              pointerEvents="none"
            />
          </>
        )}

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

        {guidesEnabled && selectedPoints && selectedPoints.length > 0 && (
          <MeasurementGuideOverlay
            face={face}
            garment={garment}
            referenceSize={referenceSize ?? 'M'}
            selectedPoints={selectedPoints}
          />
        )}
      </g>
    </svg>
  );
}
