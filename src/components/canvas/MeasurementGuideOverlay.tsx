import type { Face, GarmentSpec } from '../../types';
import { templateScale } from '../../lib/geometry';
import { MEASUREMENT_GUIDES, guideValueCm } from '../../lib/measurementGuides';

export function MeasurementGuideOverlay({
  face,
  garment,
  referenceSize,
  selectedPoints,
}: {
  face: Face;
  garment: GarmentSpec;
  referenceSize: string;
  selectedPoints: string[];
}) {
  const scale = templateScale(garment.chestWidthCm, face);
  const fontSize = 2.6;
  const textHalo = { paintOrder: 'stroke' as const, stroke: 'white', strokeWidth: 0.5, strokeLinejoin: 'round' as const };

  return (
    <g fontFamily="Inter, sans-serif" fontWeight={700} fontSize={fontSize}>
      {selectedPoints.flatMap((point) => {
        const defs = MEASUREMENT_GUIDES[point];
        const def = defs?.find((d) => d.face === face);
        if (!def) return [];
        const value = guideValueCm(point, referenceSize);
        const label = value ? `${point} — ${value} cm` : point;

        if (def.orientation === 'vertical') {
          const x = def.imgDX * scale;
          const y1 = def.imgDYTop * scale;
          const y2 = def.imgDYBottom * scale;
          return (
            <g key={point}>
              <line x1={x} y1={y1} x2={x} y2={y2} stroke={def.color} strokeWidth={0.3} />
              <text x={x + 1.2} y={(y1 + y2) / 2} fill={def.color} {...textHalo}>
                {label}
              </text>
            </g>
          );
        }

        const y = def.imgDY * scale;
        const halfWidth = def.imgHalfWidth * scale;
        return (
          <g key={point}>
            <line x1={-halfWidth} y1={y} x2={halfWidth} y2={y} stroke={def.color} strokeWidth={0.3} />
            <text x={0} y={y - 1.2} textAnchor="middle" fill={def.color} {...textHalo}>
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
