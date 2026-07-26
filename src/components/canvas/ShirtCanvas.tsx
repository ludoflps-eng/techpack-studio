import { Fragment, useId } from 'react';
import type { Face, FrontTextSpec, GarmentSpec, PrintZone } from '../../types';
import {
  canvasSize,
  faceDisplayOffsetY,
  silhouetteKeyPoints,
  templateFillMaskImage,
  templateImage,
  zoneRect,
  type ZoneRect,
} from '../../lib/geometry';
import { guideABottomLocalY, guideATopLocalY, guideDLeftLocalX } from '../../lib/measurementGuides';
import { resolveFrontTextPosition } from '../../lib/frontTextLayout';
import { ZonePrint } from './ZonePrint';
import { MeasurementGuideOverlay } from './MeasurementGuideOverlay';
import { FrontTextOverlay } from './FrontTextOverlay';

export function ShirtCanvas({
  face,
  garment,
  zones,
  selectedZoneId,
  onSelectZone,
  guidesEnabled,
  selectedPoints,
  referenceSize,
  frontTexts,
  backTexts,
}: {
  face: Face;
  garment: GarmentSpec;
  zones: PrintZone[];
  selectedZoneId?: string | null;
  onSelectZone?: (id: string) => void;
  guidesEnabled?: boolean;
  selectedPoints?: string[];
  referenceSize?: string;
  /** Rendered when this canvas is the front face. */
  frontTexts?: FrontTextSpec[];
  /** Rendered when this canvas is the back face — same feature set as frontTexts, independent list. */
  backTexts?: FrontTextSpec[];
}) {
  const faceZones = zones.filter((z) => z.face === face);
  const faceTexts = face === 'front' ? frontTexts : backTexts;
  const effectiveReferenceSize = referenceSize ?? 'M';
  const { width, height, originX, originY } = canvasSize(garment, effectiveReferenceSize);
  const placement = templateImage(garment.chestWidthCm, face, effectiveReferenceSize);
  const fillMaskPlacement = templateFillMaskImage(garment.chestWidthCm, face, effectiveReferenceSize);
  const maskId = useId();
  const displayOffsetY = faceDisplayOffsetY(face, garment.chestWidthCm);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
      <g transform={`translate(${originX} ${originY + displayOffsetY})`}>
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
          const rect = zoneRect(zone, garment, effectiveReferenceSize, faceZones);
          return (
            <Fragment key={zone.id}>
              <ZonePrint
                zone={zone}
                rect={rect}
                selected={selectedZoneId === zone.id}
                onSelect={onSelectZone ? () => onSelectZone(zone.id) : undefined}
              />
              {zone.showGuide && (
                <>
                  <ZoneReferenceGuide
                    zone={zone}
                    rect={rect}
                    garment={garment}
                    face={face}
                    referenceSize={effectiveReferenceSize}
                    faceZones={faceZones}
                  />
                  <ZoneDimensionLabels rect={rect} />
                </>
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

        {garment.gridLinesEnabled && (
          <>
            <GridLinesOverlay face={face} garment={garment} referenceSize={effectiveReferenceSize} />
            <VerticalGridLinesOverlay face={face} garment={garment} referenceSize={effectiveReferenceSize} />
          </>
        )}

        {faceTexts
          ?.filter((ft) => ft.content.trim() !== '')
          .map((ft) => (
            <FrontTextOverlay
              key={ft.id}
              face={face}
              garment={garment}
              referenceSize={effectiveReferenceSize}
              frontText={{ ...ft, ...resolveFrontTextPosition(ft, faceTexts) }}
            />
          ))}
      </g>
    </svg>
  );
}

/** A 1cm-spaced horizontal ruler: the bottom line sits at guide A's bottom (the hem reference,
 *  0cm) and lines run upward from there to 85cm, 86 total. Each line extends 5cm past the
 *  sleeve cuff on both sides. Only every 5th line (0, 5, 10, … 85 — 18 in all) gets a numbered
 *  circle at its left end, labeled with its actual cm value; the rest are plain fine dotted
 *  lines. */
function GridLinesOverlay({
  face,
  garment,
  referenceSize,
}: {
  face: Face;
  garment: GarmentSpec;
  referenceSize: string;
}) {
  const bottomY = guideABottomLocalY(face, garment.chestWidthCm, referenceSize);
  const { sleeveCuffOuterX } = silhouetteKeyPoints(garment.chestWidthCm, referenceSize);
  const halfWidth = sleeveCuffOuterX + 5;
  const maxCm = 85;
  const labelStepCm = 5;

  return (
    <g pointerEvents="none">
      {Array.from({ length: maxCm + 1 }, (_, cm) => {
        const y = bottomY - cm;
        const labeled = cm % labelStepCm === 0;
        return (
          <g key={cm}>
            <line
              x1={-halfWidth}
              y1={y}
              x2={halfWidth}
              y2={y}
              stroke="#9ca3af"
              strokeWidth={0.1}
              strokeDasharray="0.3,0.3"
            />
            {labeled && (
              <>
                <circle cx={-halfWidth} cy={y} r={1.3} fill="white" stroke="#4b5563" strokeWidth={0.15} />
                <text
                  x={-halfWidth}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="Inter, sans-serif"
                  fontWeight={600}
                  fontSize={1.5}
                  fill="#374151"
                >
                  {cm}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A 1cm-spaced vertical ruler: the leftmost line sits at guide D's left endpoint (0cm) and
 *  lines run rightward from there up to 65cm (66 total). Each line extends 5cm past guide A's
 *  top and bottom. Only every 5th line (0, 5, 10, … 65) gets a numbered triangle at its bottom
 *  end, labeled with its actual cm value; the rest are plain fine dotted lines. */
function VerticalGridLinesOverlay({
  face,
  garment,
  referenceSize,
}: {
  face: Face;
  garment: GarmentSpec;
  referenceSize: string;
}) {
  const leftX = guideDLeftLocalX(face, garment.chestWidthCm, referenceSize);
  const topY = guideATopLocalY(face, garment.chestWidthCm) - 5;
  const bottomY = guideABottomLocalY(face, garment.chestWidthCm, referenceSize) + 5;
  const maxCm = 65;
  const labelStepCm = 5;

  return (
    <g pointerEvents="none">
      {Array.from({ length: maxCm + 1 }, (_, cm) => {
        const x = leftX + cm;
        const labeled = cm % labelStepCm === 0;
        const r = 1.5;
        const triangle = `${x},${bottomY - r} ${x + r * 0.866},${bottomY + r * 0.5} ${x - r * 0.866},${bottomY + r * 0.5}`;
        return (
          <g key={cm}>
            <line
              x1={x}
              y1={topY}
              x2={x}
              y2={bottomY}
              stroke="#9ca3af"
              strokeWidth={0.1}
              strokeDasharray="0.3,0.3"
            />
            {labeled && (
              <>
                <polygon points={triangle} fill="white" stroke="#4b5563" strokeWidth={0.15} />
                <text
                  x={x}
                  y={bottomY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="Inter, sans-serif"
                  fontWeight={600}
                  fontSize={1.5}
                  fill="#374151"
                >
                  {cm}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ZoneDimensionLabels({ rect }: { rect: ZoneRect }) {
  const fontSize = 2.2;
  const gap = 1.2;
  const textHalo = { paintOrder: 'stroke' as const, stroke: 'white', strokeWidth: 0.4, strokeLinejoin: 'round' as const };

  return (
    <g fontFamily="Inter, sans-serif" fontWeight={600} fontSize={fontSize} fill="#374151">
      <text x={rect.x + rect.width / 2} y={rect.y + rect.height + gap + fontSize * 0.8} textAnchor="middle" {...textHalo}>
        {rect.width.toFixed(1)} cm
      </text>
      <text x={rect.x - gap} y={rect.y + rect.height / 2} textAnchor="end" dominantBaseline="middle" {...textHalo}>
        {rect.height.toFixed(1)} cm
      </text>
    </g>
  );
}

function ZoneReferenceGuide({
  zone,
  rect,
  garment,
  face,
  referenceSize,
  faceZones,
}: {
  zone: PrintZone;
  rect: ZoneRect;
  garment: GarmentSpec;
  face: Face;
  referenceSize: string;
  faceZones: PrintZone[];
}) {
  const centerX = rect.x + rect.width / 2;

  if (zone.anchorV === 'zone') {
    const target = faceZones.find((z) => z.id === zone.anchorZoneId);
    if (!target) return null;
    const targetRect = zoneRect(target, garment, referenceSize, faceZones);
    const anchorY = zone.anchorZoneEdge === 'top' ? targetRect.y : targetRect.y + targetRect.height;
    const [y1, y2] = anchorY <= rect.y ? [anchorY, rect.y] : [rect.y + rect.height, anchorY];
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
