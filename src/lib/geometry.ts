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
  const shoulderY = -2;
  return {
    halfChest,
    neckHalf: chestWidthCm * 0.12,
    shoulderY,
    sleeveCapX: halfChest + 8,
    sleeveCapY: shoulderY + 5,
    sleeveCuffOuterX: halfChest + 7,
    sleeveCuffInnerX: halfChest + 2,
    sleeveCuffY: shoulderY + 8,
    underarmX: halfChest,
    underarmY: shoulderY + 10,
  };
}

export interface ImagePlacement {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCalibration {
  href: string;
  naturalWidth: number;
  naturalHeight: number;
  centerX: number;
  collarY: number;
  underarmDX: number;
}

/**
 * Calibration for each reference image: where its collar-base point (the "depuis le col" y=0
 * reference) and its underarm point (the safe-area x=halfChest reference) fall in image pixels,
 * so the picture can be scaled/positioned to line up with the same cm coordinate space every
 * print zone is placed in.
 */
const TEMPLATES: Record<Face, ImageCalibration> = {
  front: {
    href: '/front-template.png',
    naturalWidth: 419,
    naturalHeight: 318,
    centerX: 209.5,
    collarY: 38,
    underarmDX: 108.5,
  },
  back: {
    href: '/back-template.png',
    naturalWidth: 431,
    naturalHeight: 312,
    centerX: 215.5,
    collarY: 37,
    underarmDX: 111.5,
  },
};

export function templateImage(chestWidthCm: number, face: Face): ImagePlacement {
  const t = TEMPLATES[face];
  const halfChest = chestWidthCm / 2;
  const scale = halfChest / t.underarmDX;
  return {
    href: t.href,
    x: -t.centerX * scale,
    y: -t.collarY * scale,
    width: t.naturalWidth * scale,
    height: t.naturalHeight * scale,
  };
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
