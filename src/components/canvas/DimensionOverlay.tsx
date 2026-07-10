import type { GarmentSpec, PrintZone } from '../../types';
import type { ZoneRect } from '../../lib/geometry';

const DIM = '#1e293b';
const ACCENT = '#e11d48';
const GAP = 2.4;
const TICK = 0.9;
const FONT = 2.3;
const LINE_W = 0.22;

/** White halo behind label text so it stays legible over any fabric color. */
const textHalo = { paintOrder: 'stroke' as const, stroke: 'white', strokeWidth: 0.5, strokeLinejoin: 'round' as const };

function WidthBracket({ rect }: { rect: ZoneRect }) {
  const y = rect.y + rect.height + GAP;
  return (
    <g stroke={DIM} strokeWidth={LINE_W} fontSize={FONT} fontFamily="Inter, sans-serif" fontWeight={600}>
      <line x1={rect.x} y1={rect.y + rect.height} x2={rect.x} y2={y} strokeDasharray="0.5,0.5" />
      <line
        x1={rect.x + rect.width}
        y1={rect.y + rect.height}
        x2={rect.x + rect.width}
        y2={y}
        strokeDasharray="0.5,0.5"
      />
      <line x1={rect.x} y1={y} x2={rect.x + rect.width} y2={y} />
      <line x1={rect.x} y1={y - TICK / 2} x2={rect.x} y2={y + TICK / 2} />
      <line x1={rect.x + rect.width} y1={y - TICK / 2} x2={rect.x + rect.width} y2={y + TICK / 2} />
      <text x={rect.x + rect.width / 2} y={y + FONT * 1.15} textAnchor="middle" fill={DIM} {...textHalo}>
        {rect.width.toFixed(1)} cm
      </text>
    </g>
  );
}

function HeightBracket({ rect }: { rect: ZoneRect }) {
  const x = rect.x + rect.width + GAP;
  return (
    <g stroke={DIM} strokeWidth={LINE_W} fontSize={FONT} fontFamily="Inter, sans-serif" fontWeight={600}>
      <line x1={rect.x + rect.width} y1={rect.y} x2={x} y2={rect.y} strokeDasharray="0.5,0.5" />
      <line
        x1={rect.x + rect.width}
        y1={rect.y + rect.height}
        x2={x}
        y2={rect.y + rect.height}
        strokeDasharray="0.5,0.5"
      />
      <line x1={x} y1={rect.y} x2={x} y2={rect.y + rect.height} />
      <line x1={x - TICK / 2} y1={rect.y} x2={x + TICK / 2} y2={rect.y} />
      <line x1={x - TICK / 2} y1={rect.y + rect.height} x2={x + TICK / 2} y2={rect.y + rect.height} />
      <text
        x={x + FONT * 1.15}
        y={rect.y + rect.height / 2}
        textAnchor="middle"
        fill={DIM}
        transform={`rotate(-90 ${x + FONT * 1.15} ${rect.y + rect.height / 2})`}
        {...textHalo}
      >
        {rect.height.toFixed(1)} cm
      </text>
    </g>
  );
}

/** Vertical guide from the collar (y=0) or hem (y=bodyLength) reference line to the box's near edge. */
function AnchorLine({ zone, rect, garment }: { zone: PrintZone; rect: ZoneRect; garment: GarmentSpec }) {
  const guideX = -garment.chestWidthCm / 2 - GAP * 2;
  const refY = zone.anchorV === 'collar' ? 0 : garment.bodyLengthCm;
  const nearY = zone.anchorV === 'collar' ? rect.y : rect.y + rect.height;
  const effectiveDistance = Math.abs(nearY - refY);
  const label = `${effectiveDistance.toFixed(1)} cm from ${zone.anchorV === 'collar' ? 'collar' : 'hem'}`;
  return (
    <g stroke={DIM} strokeWidth={LINE_W} fontSize={FONT} fontFamily="Inter, sans-serif" fontWeight={600}>
      <line x1={-garment.chestWidthCm / 2} y1={refY} x2={guideX} y2={refY} strokeDasharray="0.5,0.5" />
      <line x1={rect.x} y1={nearY} x2={guideX} y2={nearY} strokeDasharray="0.5,0.5" />
      <line x1={guideX} y1={refY} x2={guideX} y2={nearY} />
      <line x1={guideX - TICK / 2} y1={refY} x2={guideX + TICK / 2} y2={refY} />
      <line x1={guideX - TICK / 2} y1={nearY} x2={guideX + TICK / 2} y2={nearY} />
      <text
        x={guideX - 0.6}
        y={(refY + nearY) / 2}
        textAnchor="end"
        fill={DIM}
        dominantBaseline="middle"
        {...textHalo}
      >
        {label}
      </text>
    </g>
  );
}

function AlignLabel({ zone, rect, garment }: { zone: PrintZone; rect: ZoneRect; garment: GarmentSpec }) {
  const y = rect.y - GAP * 0.5;
  const halfChest = garment.chestWidthCm / 2;
  const effectiveMargin =
    zone.align === 'left' ? rect.x - -halfChest : zone.align === 'right' ? halfChest - (rect.x + rect.width) : 0;
  const label =
    zone.align === 'center'
      ? 'centered'
      : zone.align === 'left'
        ? `left-aligned · ${effectiveMargin.toFixed(1)} cm margin`
        : `right-aligned · ${effectiveMargin.toFixed(1)} cm margin`;
  return (
    <text
      x={rect.x + rect.width / 2}
      y={y}
      textAnchor="middle"
      fill={ACCENT}
      fontSize={FONT}
      fontFamily="Inter, sans-serif"
      fontWeight={700}
      {...textHalo}
    >
      {label}
    </text>
  );
}

export function DimensionOverlay({
  zone,
  rect,
  garment,
}: {
  zone: PrintZone;
  rect: ZoneRect;
  garment: GarmentSpec;
}) {
  return (
    <g>
      <WidthBracket rect={rect} />
      <HeightBracket rect={rect} />
      <AnchorLine zone={zone} rect={rect} garment={garment} />
      <AlignLabel zone={zone} rect={rect} garment={garment} />
    </g>
  );
}
