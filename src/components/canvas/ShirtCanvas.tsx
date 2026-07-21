import type { Face, GarmentSpec, PrintZone } from '../../types';
import { canvasSize, frontTemplateImage, seamOverlay, shirtPath, zoneRect } from '../../lib/geometry';
import { ZonePrint } from './ZonePrint';

function SeamDetails({ chestWidthCm, bodyLengthCm, face }: { chestWidthCm: number; bodyLengthCm: number; face: Face }) {
  const { collarPath, hemLine, cuffLines, shoulderTicks } = seamOverlay(chestWidthCm, bodyLengthCm, face);
  return (
    <g stroke="#2a2a2a" fill="none" strokeLinecap="round">
      <path d={collarPath} strokeWidth={0.2} strokeDasharray="0.4,0.4" />
      <line {...hemLine} strokeWidth={0.2} strokeDasharray="0.4,0.4" />
      {cuffLines.map((line, i) => (
        <line key={i} {...line} strokeWidth={0.2} strokeDasharray="0.4,0.4" />
      ))}
      {shoulderTicks.map((tick, i) => (
        <line key={i} {...tick} strokeWidth={0.25} />
      ))}
    </g>
  );
}

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
        {face === 'front' ? (
          <image {...frontTemplateImage(garment.chestWidthCm)} preserveAspectRatio="none" />
        ) : (
          <>
            <path
              d={shirtPath(garment.chestWidthCm, garment.bodyLengthCm, face)}
              fill={garment.fabricHex}
              stroke="#2a2a2a"
              strokeWidth={0.25}
              strokeLinejoin="round"
            />
            <SeamDetails chestWidthCm={garment.chestWidthCm} bodyLengthCm={garment.bodyLengthCm} face={face} />
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
      </g>
    </svg>
  );
}
