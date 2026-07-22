import type { Face, GarmentSpec, PrintZone } from '../types';
import { guideABottomLocalY, guideAMidLocalY, guideATopLocalY } from './measurementGuides';

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

/** Purely visual vertical shift for the front canvas so it lines up with the back canvas on
 *  screen: the two reference images have different amounts of empty margin above the shoulder
 *  peak (guide A's top), so at the same originY they'd otherwise show the garment starting at
 *  different heights. Shifts front down to match back's shoulder-peak height; never the reverse,
 *  and never changes the underlying local-cm coordinates used for zone/guide math. */
export function faceDisplayOffsetY(face: Face, chestWidthCm: number): number {
  if (face !== 'front') return 0;
  return guideATopLocalY('back', chestWidthCm) - guideATopLocalY('front', chestWidthCm);
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
  fillMaskHref: string;
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
    href: `${import.meta.env.BASE_URL}front-template.png`,
    fillMaskHref: `${import.meta.env.BASE_URL}front-template-fillmask.png`,
    naturalWidth: 429,
    naturalHeight: 322,
    centerX: 214.5,
    collarY: 58,
    underarmDX: 125.5,
  },
  back: {
    href: `${import.meta.env.BASE_URL}back-template.png`,
    fillMaskHref: `${import.meta.env.BASE_URL}back-template-fillmask.png`,
    naturalWidth: 358,
    naturalHeight: 256,
    centerX: 174.5,
    collarY: 15,
    underarmDX: 99.5,
  },
};

/** cm-per-reference-image-pixel for a given face — shared by the template image itself and by
 *  measurement guide overlays, so a guide drawn at any (imgDX, imgDY) offset from the image's
 *  collar/center reference always lines up with the picture regardless of chest width. */
export function templateScale(chestWidthCm: number, face: Face): number {
  return chestWidthCm / 2 / TEMPLATES[face].underarmDX;
}

function placeImage(chestWidthCm: number, face: Face, href: string, height: number): ImagePlacement {
  const t = TEMPLATES[face];
  const scale = templateScale(chestWidthCm, face);
  return {
    href,
    x: -t.centerX * scale,
    y: -t.collarY * scale,
    width: t.naturalWidth * scale,
    height,
  };
}

/** The image's natural pixel height, stretched (never shrunk) so its bottom edge reaches guide
 *  A's chart-based bottom point — otherwise the guide line extends past the artwork whenever the
 *  chart value is longer than the reference image's own drawn proportions. */
function templateImageHeight(chestWidthCm: number, face: Face, referenceSize: string): number {
  const t = TEMPLATES[face];
  const scale = templateScale(chestWidthCm, face);
  const topY = -t.collarY * scale;
  const bottomY = guideABottomLocalY(face, chestWidthCm, referenceSize);
  return Math.max(bottomY - topY, t.naturalHeight * scale);
}

export function templateImage(chestWidthCm: number, face: Face, referenceSize: string): ImagePlacement {
  const height = templateImageHeight(chestWidthCm, face, referenceSize);
  return placeImage(chestWidthCm, face, TEMPLATES[face].href, height);
}

/** The fill-only mask: white where the garment's plain fabric (recolorable) sits, transparent
 *  everywhere else (contour outline, grey seam lines, background) — so a color overlay masked by
 *  this always leaves the outline/seams untouched regardless of the chosen fabric color. */
export function templateFillMaskImage(chestWidthCm: number, face: Face, referenceSize: string): ImagePlacement {
  const height = templateImageHeight(chestWidthCm, face, referenceSize);
  return placeImage(chestWidthCm, face, TEMPLATES[face].fillMaskHref, height);
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

function rawZoneRect(zone: PrintZone, garment: GarmentSpec, referenceSize: string): ZoneRect {
  const halfChest = garment.chestWidthCm / 2;

  const y = zone.centerBox
    ? guideAMidLocalY(zone.face, garment.chestWidthCm, referenceSize) - zone.heightCm / 2
    : zone.anchorV === 'collar'
      ? guideATopLocalY(zone.face, garment.chestWidthCm) + zone.distanceVCm
      : guideABottomLocalY(zone.face, garment.chestWidthCm, referenceSize) - zone.distanceVCm - zone.heightCm;

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
export function zoneRect(zone: PrintZone, garment: GarmentSpec, referenceSize: string): ZoneRect {
  const raw = rawZoneRect(zone, garment, referenceSize);
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
