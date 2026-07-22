import { Fragment, useId } from 'react';
import type { Face, GarmentSpec, PrintZone } from '../../types';
import { canvasSize, templateFillMaskImage, templateImage, zoneRect, type ZoneRect } from '../../lib/geometry';
import { guideABottomLocalY, guideATopLocalY } from '../../lib/measurementGuides';
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
  const effectiveReferenceSize = referenceSize ?? 'M';
  const placement = templateImage(garment.chestWidthCm, face, effectiveReferenceSize);
  const fillMaskPlacement = templateFillMaskImage(garment.chestWidthCm, face, effectiveReferenceSize);
  const maskId = useId();

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <g transform={`translate(${originX} ${originY})`}>
        <image {...placement} preserveAspectRatio="none" />

        {garment.fabricHex && (
          <>
            <mask id={maskId}>
              <image {...fillMaskPlacement} preserveAspectRatio="none" />
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
          const rect = zoneRect(zone, garment, effectiveReferenceSize);
          return (
            <Fragment key={zone.id}>
              <ZonePrint
                zone={zone}
                rect={rect}
                selected={selectedZoneId === zone.id}
                onSelect={onSelectZone ? () => onSelectZone(zone.id) : undefined}
              />
              {zone.showGuide && (
                <ZoneReferenceGuide
                  zone={zone}
                  rect={rect}
                  garment={garment}
                  face={face}
                  referenceSize={effectiveReferenceSize}
                />
              )}
            </Fragment>
          );
        })}

        {guidesEnabled && selectedPoints && selectedPoints.length > 0 && (
          <MeasurementGuideOverlay
            face={face}
            garment={garment}
            referenceSize={effectiveReferenceSize}
            selectedPoints={selectedPoints}
          />
        )}
      </g>
    </svg>
  );
}

function ZoneReferenceGuide({
  zone,
  rect,
  garment,
  face,
  referenceSize,
}: {
  zone: PrintZone;
  rect: ZoneRect;
  garment: GarmentSpec;
  face: Face;
  referenceSize: string;
}) {
  const centerX = rect.x + rect.width / 2;
  const isFromTop = zone.anchorV === 'collar';
  const anchorY = isFromTop
    ? guideATopLocalY(face, garment.chestWidthCm)
    : guideABottomLocalY(face, garment.chestWidthCm, referenceSize);
  const zoneEdgeY = isFromTop ? rect.y : rect.y + rect.height;
  const [y1, y2] = isFromTop ? [anchorY, zoneEdgeY] : [zoneEdgeY, anchorY];

  return (
    <line
      x1={centerX}
      y1={y1}
      x2={centerX}
      y2={y2}
      stroke="#6b7280"
      strokeWidth={0.2}
      strokeDasharray="0.8,0.8"
      pointerEvents="none"
    />
  );
}
