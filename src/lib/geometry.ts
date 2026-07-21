import type { Face, GarmentSpec, PrintZone } from '../types';

/**
 * All measurements are in a "garment-local" coordinate space, in centimeters:
 *   x = 0 at the garment centerline (negative = toward left edge, positive = right edge)
 *   y = 0 at the neckline base ("depuis le col" reference point used throughout tech packs)
 *   y increases downward toward the hem.
 * The silhouette and every print zone share this same space, so a <g> translated by
 * (PAD.side + chestWidthCm / 2, PAD.top) can render both directly in cm units.
 */
export const PAD = { top: 12, side: 26, bottom: 8 };

export function canvasSize(garment: GarmentSpec) {
  return {
    width: garment.chestWidthCm + PAD.side * 2,
    height: PAD.top + garment.bodyLengthCm + PAD.bottom,
    originX: PAD.side + garment.chestWidthCm / 2,
    originY: PAD.top,
  };
}

export interface SilhouetteKeyPoints {
  halfChest: number;
  neckHalf: number;
  shoulderY: number;
  shoulderPointX: number;
  sleeveCapX: number;
  sleeveCapY: number;
  sleeveCuffOuterX: number;
  sleeveCuffInnerX: number;
  sleeveCuffY: number;
  underarmX: number;
  underarmY: number;
}

/** Shared measurements for both the filled body/sleeve outline and the seam-line overlays,
 *  so the two always line up. Only x-dimensions scale with chest width — the y-offsets are
 *  fixed, matching how the rest of the app treats vertical garment proportions. */
export function silhouetteKeyPoints(chestWidthCm: number): SilhouetteKeyPoints {
  const halfChest = chestWidthCm / 2;
  const shoulderY = -1;
  return {
    halfChest,
    neckHalf: chestWidthCm * 0.12,
    shoulderY,
    shoulderPointX: halfChest * 0.5,
    sleeveCapX: halfChest + 7,
    sleeveCapY: shoulderY + 1,
    sleeveCuffOuterX: halfChest + 6,
    sleeveCuffInnerX: halfChest + 1.5,
    sleeveCuffY: shoulderY + 8,
    underarmX: halfChest,
    underarmY: shoulderY + 10.5,
  };
}

export function neckDipFor(face: Face) {
  return face === 'front' ? 3.6 : 1.4;
}

/** Returns an SVG path `d` string (in local cm coords) for a flat tee sketch with distinct
 *  cap sleeves and a rounded crew neckline. */
export function shirtPath(chestWidthCm: number, bodyLengthCm: number, face: Face): string {
  const {
    neckHalf,
    shoulderY,
    shoulderPointX,
    sleeveCapX,
    sleeveCapY,
    sleeveCuffOuterX,
    sleeveCuffInnerX,
    sleeveCuffY,
    underarmX,
    underarmY,
  } = silhouetteKeyPoints(chestWidthCm);
  const neckDip = neckDipFor(face);
  const hemY = bodyLengthCm;

  return [
    `M ${-neckHalf} ${shoulderY}`,
    `L ${-shoulderPointX} ${shoulderY}`,
    `L ${-sleeveCapX} ${sleeveCapY}`,
    `L ${-sleeveCuffOuterX} ${sleeveCuffY}`,
    `L ${-sleeveCuffInnerX} ${sleeveCuffY}`,
    `Q ${-underarmX} ${sleeveCuffY} ${-underarmX} ${underarmY}`,
    `L ${-underarmX} ${hemY}`,
    `L ${underarmX} ${hemY}`,
    `L ${underarmX} ${underarmY}`,
    `Q ${underarmX} ${sleeveCuffY} ${sleeveCuffInnerX} ${sleeveCuffY}`,
    `L ${sleeveCuffOuterX} ${sleeveCuffY}`,
    `L ${sleeveCapX} ${sleeveCapY}`,
    `L ${shoulderPointX} ${shoulderY}`,
    `L ${neckHalf} ${shoulderY}`,
    `Q 0 ${shoulderY + neckDip} ${-neckHalf} ${shoulderY}`,
    'Z',
  ].join(' ');
}

export interface SeamLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SeamOverlay {
  /** Ribbed collar band's inner edge — also doubles as the collar seam line. */
  collarPath: string;
  hemLine: SeamLine;
  cuffLines: SeamLine[];
  shoulderTicks: SeamLine[];
}

/** Stitch-line details (collar rib, cuff hem, body hem, shoulder seam ticks) drawn on top of
 *  the filled silhouette, at fixed insets from the matching edges in `shirtPath`. */
export function seamOverlay(chestWidthCm: number, bodyLengthCm: number, face: Face): SeamOverlay {
  const kp = silhouetteKeyPoints(chestWidthCm);
  const neckDip = neckDipFor(face);

  const collarNeckHalf = Math.max(kp.neckHalf - 1.3, 1);
  const collarShoulderY = kp.shoulderY + 1.1;
  const collarDip = neckDip * 0.7;
  const collarPath = `M ${-collarNeckHalf} ${collarShoulderY} Q 0 ${collarShoulderY + collarDip} ${collarNeckHalf} ${collarShoulderY}`;

  const hemInset = 1.8;
  const hemY = bodyLengthCm - hemInset;
  const hemLine: SeamLine = { x1: -kp.underarmX, y1: hemY, x2: kp.underarmX, y2: hemY };

  const cuffInset = 1.2;
  const cuffY = kp.sleeveCuffY - cuffInset;
  const cuffLines: SeamLine[] = [
    { x1: -kp.sleeveCuffOuterX, y1: cuffY, x2: -kp.sleeveCuffInnerX, y2: cuffY },
    { x1: kp.sleeveCuffInnerX, y1: cuffY, x2: kp.sleeveCuffOuterX, y2: cuffY },
  ];

  const tickHalfLen = 0.5;
  const shoulderTicks: SeamLine[] = [];
  for (const t of [0.3, 0.5, 0.7]) {
    const dist = kp.neckHalf + t * (kp.shoulderPointX - kp.neckHalf);
    shoulderTicks.push({ x1: -dist, y1: kp.shoulderY - tickHalfLen, x2: -dist, y2: kp.shoulderY + tickHalfLen });
    shoulderTicks.push({ x1: dist, y1: kp.shoulderY - tickHalfLen, x2: dist, y2: kp.shoulderY + tickHalfLen });
  }

  return { collarPath, hemLine, cuffLines, shoulderTicks };
}

/**
 * The rectangular area of the torso that's guaranteed to be fully inside the shirt silhouette
 * for every x in range — i.e. below the underarm, where the side seams run straight down to the
 * hem. Above this line the silhouette narrows into the neckline/shoulder/sleeve taper, so a
 * full-chest-width box can't be guaranteed to stay on fabric.
 */
export function safeArea(garment: GarmentSpec) {
  const { halfChest, underarmY } = silhouetteKeyPoints(garment.chestWidthCm);
  return { minX: -halfChest, maxX: halfChest, minY: underarmY, maxY: garment.bodyLengthCm };
}

export interface ZoneRect {
  x: number; // left edge, local coords (cm from centerline)
  y: number; // top edge, local coords (cm from neck base)
  width: number;
  height: number;
}

function rawZoneRect(zone: PrintZone, garment: GarmentSpec): ZoneRect {
  const halfChest = garment.chestWidthCm / 2;

  const y =
    zone.anchorV === 'collar'
      ? zone.distanceVCm
      : garment.bodyLengthCm - zone.distanceVCm - zone.heightCm;

  let x: number;
  if (zone.align === 'left') {
    x = -halfChest + zone.edgeMarginCm;
  } else if (zone.align === 'right') {
    x = halfChest - zone.edgeMarginCm - zone.widthCm;
  } else {
    x = zone.centerOffsetCm - zone.widthCm / 2;
  }

  return { x, y, width: zone.widthCm, height: zone.heightCm };
}

/**
 * The zone's box, scaled down (preserving aspect ratio) and repositioned so it always lands
 * fully within `safeArea` — print boxes can never spill off the garment.
 */
export function zoneRect(zone: PrintZone, garment: GarmentSpec): ZoneRect {
  const raw = rawZoneRect(zone, garment);
  const { minX, maxX, minY, maxY } = safeArea(garment);
  const safeWidth = maxX - minX;
  const safeHeight = maxY - minY;

  const scale = Math.min(1, safeWidth / raw.width, safeHeight / raw.height);
  const width = raw.width * scale;
  const height = raw.height * scale;

  const x = Math.min(Math.max(raw.x, minX), maxX - width);
  const y = Math.min(Math.max(raw.y, minY), maxY - height);

  return { x, y, width, height };
}
