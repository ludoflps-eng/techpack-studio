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

interface SilhouetteKeyPoints {
  halfChest: number;
  neckHalf: number;
  shoulderY: number;
  sleeveTipX: number;
  sleeveTipY: number;
  underarmX: number;
  underarmY: number;
}

function keyPoints(chestWidthCm: number): SilhouetteKeyPoints {
  const halfChest = chestWidthCm / 2;
  return {
    halfChest,
    neckHalf: chestWidthCm * 0.15,
    shoulderY: -2.5,
    sleeveTipX: halfChest + 13,
    sleeveTipY: -2.5 + 9,
    underarmX: halfChest,
    underarmY: -2.5 + 13,
  };
}

function neckDipFor(face: Face) {
  return face === 'front' ? 3.6 : 1.4;
}

/** Returns an SVG path `d` string (in local cm coords) for a generic flat tee sketch. */
export function shirtPath(chestWidthCm: number, bodyLengthCm: number, face: Face): string {
  const { neckHalf, shoulderY, sleeveTipX, sleeveTipY, underarmX, underarmY } = keyPoints(chestWidthCm);
  const neckDip = neckDipFor(face);
  const hemY = bodyLengthCm;

  return [
    `M ${-neckHalf} ${shoulderY}`,
    `L ${-sleeveTipX} ${sleeveTipY}`,
    `L ${-underarmX} ${underarmY}`,
    `L ${-underarmX} ${hemY}`,
    `L ${underarmX} ${hemY}`,
    `L ${underarmX} ${underarmY}`,
    `L ${sleeveTipX} ${sleeveTipY}`,
    `L ${neckHalf} ${shoulderY}`,
    `Q 0 ${shoulderY + neckDip} ${-neckHalf} ${shoulderY}`,
    'Z',
  ].join(' ');
}

/**
 * The rectangular area of the torso that's guaranteed to be fully inside the shirt silhouette
 * for every x in range — i.e. below the underarm, where the side seams run straight down to the
 * hem. Above this line the silhouette narrows into the neckline/shoulder/sleeve taper, so a
 * full-chest-width box can't be guaranteed to stay on fabric.
 */
export function safeArea(garment: GarmentSpec) {
  const { halfChest, underarmY } = keyPoints(garment.chestWidthCm);
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
