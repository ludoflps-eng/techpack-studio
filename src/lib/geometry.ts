import type { Face, GarmentSpec, PrintZone } from '../types';
import { effectiveChestWidthCm, guideABottomLocalY, guideAMidLocalY, guideATopLocalY } from './measurementGuides';

/**
 * All measurements are in a "garment-local" coordinate space, in centimeters:
 *   x = 0 at the garment centerline (negative = toward left edge, positive = right edge)
 *   y = 0 at the neckline base ("depuis le col" reference point used throughout tech packs)
 *   y increases downward toward the hem.
 * The silhouette and every print zone share this same space, so a <g> translated by
 * (originX, originY) can render both directly in cm units.
 */
export const PAD = { top: 12, side: 26, bottom: 8 };

/**
 * Canvas dimensions sized from the actual rendered content's bounds — both faces' template
 * images (front shifted by its display offset, same as ShirtCanvas applies it) plus, when grid
 * lines are on, the ruler overlays' own fixed reach (85cm vertical span, 5cm past guide A on the
 * vertical grid, 5cm past the sleeve cuff on the horizontal grid) — rather than the separate,
 * approximate chestWidthCm/bodyLengthCm size-chart figures. Those figures don't necessarily
 * match how wide/tall the picture or its guide-driven rulers actually render (the whole point of
 * the "rescale" and chart-accurate guide work), so computing straight from geometry is the only
 * way to guarantee nothing clips at any selectable size. PAD is then just a fixed safety margin
 * on top of that real content, not a size-dependent calibration that can go stale.
 */
export function canvasSize(garment: GarmentSpec, referenceSize: string) {
  const faces: Face[] = ['front', 'back'];
  let minY = 0;
  let maxY = garment.bodyLengthCm;
  let maxHalfWidth = effectiveChestWidthCm(garment.chestWidthCm, referenceSize) / 2;

  for (const face of faces) {
    const offsetY = faceDisplayOffsetY(face, garment.chestWidthCm);
    const img = templateImage(garment.chestWidthCm, face, referenceSize);
    minY = Math.min(minY, img.y + offsetY);
    maxY = Math.max(maxY, img.y + img.height + offsetY);
    maxHalfWidth = Math.max(maxHalfWidth, Math.abs(img.x), Math.abs(img.x + img.width));

    if (garment.gridLinesEnabled) {
      const { sleeveCuffOuterX } = silhouetteKeyPoints(garment.chestWidthCm, referenceSize);
      maxHalfWidth = Math.max(maxHalfWidth, sleeveCuffOuterX + 5);
      const bottomY = guideABottomLocalY(face, garment.chestWidthCm, referenceSize);
      const topY = guideATopLocalY(face, garment.chestWidthCm);
      minY = Math.min(minY, bottomY - 85 + offsetY, topY - 5 + offsetY);
      maxY = Math.max(maxY, bottomY + 5 + offsetY);
    }
  }

  return {
    width: maxHalfWidth * 2 + PAD.side * 2,
    height: PAD.top + (maxY - minY) + PAD.bottom,
    originX: PAD.side + maxHalfWidth,
    originY: PAD.top - minY,
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
 *  fixed, matching how the rest of the app treats vertical garment proportions.
 *  RESCALE VARIANT: x-dimensions are derived from the oversize chart's own D value (via
 *  effectiveChestWidthCm), not the plain chest width, so the drawn silhouette's actual edges
 *  always reach Guide D's chart-accurate endpoints. */
export function silhouetteKeyPoints(chestWidthCm: number, referenceSize: string): SilhouetteKeyPoints {
  const effectiveWidth = effectiveChestWidthCm(chestWidthCm, referenceSize);
  const halfChest = effectiveWidth / 2;
  const shoulderY = -2;
  return {
    halfChest,
    neckHalf: effectiveWidth * 0.12,
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
 *  collar/center reference always lines up with the picture regardless of chest width. Governs
 *  vertical (y) placement only in the rescale variant — see templateScaleX for horizontal. */
export function templateScale(chestWidthCm: number, face: Face): number {
  return chestWidthCm / 2 / TEMPLATES[face].underarmDX;
}

/** RESCALE VARIANT: cm-per-reference-image-pixel for horizontal (x) placement, derived from the
 *  oversize chart's D value instead of the plain chest width — so the picture's own width (and
 *  center offset) always stretches to match Guide D's chart-accurate span, independent of the
 *  vertical scale above. */
export function templateScaleX(chestWidthCm: number, face: Face, referenceSize: string): number {
  return effectiveChestWidthCm(chestWidthCm, referenceSize) / 2 / TEMPLATES[face].underarmDX;
}

function placeImage(
  chestWidthCm: number,
  face: Face,
  href: string,
  height: number,
  referenceSize: string
): ImagePlacement {
  const t = TEMPLATES[face];
  const scaleY = templateScale(chestWidthCm, face);
  const scaleX = templateScaleX(chestWidthCm, face, referenceSize);
  return {
    href,
    x: -t.centerX * scaleX,
    y: -t.collarY * scaleY,
    width: t.naturalWidth * scaleX,
    height,
  };
}

/** The image's rendered height, stretched OR compressed (via the `<image>`'s non-uniform
 *  `preserveAspectRatio="none"` scaling) so its bottom edge always lands exactly on guide A's
 *  chart-based bottom point — the "0" the circle-numbered grid and every front text's position
 *  are measured from. This must never be a max/min against the reference image's own natural
 *  proportions: doing so lets the artwork's bottom edge drift away from that "0" point whenever
 *  the chart value and the image's natural aspect ratio disagree (as they now do at the larger
 *  sizes, since Guide A's chart values don't scale linearly with chestWidthCm) — the artwork
 *  would still be a fine-looking t-shirt, just one whose hem no longer sits on "0". */
function templateImageHeight(chestWidthCm: number, face: Face, referenceSize: string): number {
  const t = TEMPLATES[face];
  const scale = templateScale(chestWidthCm, face);
  const topY = -t.collarY * scale;
  const bottomY = guideABottomLocalY(face, chestWidthCm, referenceSize);
  return Math.max(0.1, bottomY - topY);
}

export function templateImage(chestWidthCm: number, face: Face, referenceSize: string): ImagePlacement {
  const height = templateImageHeight(chestWidthCm, face, referenceSize);
  return placeImage(chestWidthCm, face, TEMPLATES[face].href, height, referenceSize);
}

/** The fill-only mask: white where the garment's plain fabric (recolorable) sits, transparent
 *  everywhere else (contour outline, grey seam lines, background) — so a color overlay masked by
 *  this always leaves the outline/seams untouched regardless of the chosen fabric color. */
export function templateFillMaskImage(chestWidthCm: number, face: Face, referenceSize: string): ImagePlacement {
  const height = templateImageHeight(chestWidthCm, face, referenceSize);
  return placeImage(chestWidthCm, face, TEMPLATES[face].fillMaskHref, height, referenceSize);
}

/**
 * The rectangular area print zones are clamped into. The top bound is guide A's own top point
 * — the same "top of shirt" reference the anchor system is built around — so a zone explicitly
 * placed "0cm from top of shirt" actually lands flush with it instead of being silently pushed
 * down to the underarm. Full chest width is allowed at any height in this range; a box that
 * wide right at the neckline will visually run past the actual (narrower) shoulder taper, but
 * that's a rendering nicety, not a safety clamp this function is responsible for.
 */
export function safeArea(garment: GarmentSpec, face: Face, referenceSize: string) {
  const { halfChest } = silhouetteKeyPoints(garment.chestWidthCm, referenceSize);
  return {
    minX: -halfChest,
    maxX: halfChest,
    minY: guideATopLocalY(face, garment.chestWidthCm),
    maxY: garment.bodyLengthCm,
  };
}

export interface ZoneRect {
  x: number; // left edge, local coords (cm from centerline)
  y: number; // top edge, local coords (cm from neck base)
  width: number;
  height: number;
}

/**
 * Vertical position of a zone anchored to another zone's edge — e.g. "top of zone 2 sits
 * 10cm below the bottom of zone 1". Resolves the target zone's own (fully clamped) rect
 * first, so chained anchors ("zone 3 below zone 2 below zone 1") stack correctly. Falls back
 * to a top-of-shirt anchor if the target is missing, on a different face, self-referencing, or
 * part of a reference cycle — `visiting` tracks the chain of zone ids already being resolved so
 * a cycle (A anchored to B anchored back to A) can't recurse forever.
 */
function resolveZoneAnchorY(
  zone: PrintZone,
  garment: GarmentSpec,
  referenceSize: string,
  allZones: PrintZone[],
  visiting: Set<string>
): number {
  const target = allZones.find((z) => z.id === zone.anchorZoneId);
  if (!target || target.face !== zone.face || target.id === zone.id || visiting.has(zone.id)) {
    return guideATopLocalY(zone.face, garment.chestWidthCm) + zone.distanceVCm;
  }
  const nextVisiting = new Set(visiting);
  nextVisiting.add(zone.id);
  const targetRect = zoneRectResolved(target, garment, referenceSize, allZones, nextVisiting);
  const targetEdgeY = zone.anchorZoneEdge === 'top' ? targetRect.y : targetRect.y + targetRect.height;
  return targetEdgeY + zone.distanceVCm;
}

function rawZoneRect(
  zone: PrintZone,
  garment: GarmentSpec,
  referenceSize: string,
  allZones: PrintZone[],
  visiting: Set<string>
): ZoneRect {
  const halfChest = effectiveChestWidthCm(garment.chestWidthCm, referenceSize) / 2;

  const y = zone.centerBox
    ? guideAMidLocalY(zone.face, garment.chestWidthCm, referenceSize) - zone.heightCm / 2
    : zone.anchorV === 'zone'
      ? resolveZoneAnchorY(zone, garment, referenceSize, allZones, visiting)
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

function zoneRectResolved(
  zone: PrintZone,
  garment: GarmentSpec,
  referenceSize: string,
  allZones: PrintZone[],
  visiting: Set<string>
): ZoneRect {
  const raw = rawZoneRect(zone, garment, referenceSize, allZones, visiting);
  const { minX, maxX, minY, maxY } = safeArea(garment, zone.face, referenceSize);
  const safeWidth = maxX - minX;
  const safeHeight = maxY - minY;

  const scale = Math.min(1, safeWidth / raw.width, safeHeight / raw.height);
  const width = raw.width * scale;
  const height = raw.height * scale;

  const x = Math.min(Math.max(raw.x, minX), maxX - width);
  const y = Math.min(Math.max(raw.y, minY), maxY - height);

  return { x, y, width, height };
}

/**
 * The zone's box, scaled down (preserving aspect ratio) and repositioned so it always lands
 * fully within `safeArea` — print boxes can never spill off the garment. `allZones` is only
 * needed when this (or an ancestor) zone is anchored to another zone's edge — pass the pack's
 * full zone list so that lookup can resolve; omit it for zones anchored to the shirt itself.
 */
export function zoneRect(
  zone: PrintZone,
  garment: GarmentSpec,
  referenceSize: string,
  allZones: PrintZone[] = []
): ZoneRect {
  return zoneRectResolved(zone, garment, referenceSize, allZones, new Set());
}
