import type { Face } from '../types';
import { OVERSIZE_CHART, OVERSIZE_SIZES } from './oversizeChart';
import { templateScale } from './geometry';

export type GuideOrientation = 'horizontal' | 'vertical';

interface HorizontalGuideDef {
  orientation: 'horizontal';
  face: Face;
  color: string;
  /** Offset from the template's collar reference (in reference-image px) — matches
   *  templateScale's coordinate space so the guide always tracks the picture. */
  imgDY: number;
  /** Half-span from the vertical centerline, in the same reference-image px. */
  imgHalfWidth: number;
}

interface VerticalGuideDef {
  orientation: 'vertical';
  face: Face;
  color: string;
  imgDX: number;
  imgDYTop: number;
  imgDYBottom: number;
}

export type GuideDef = HorizontalGuideDef | VerticalGuideDef;

/**
 * Point definitions provided so far (A, B, C, D — from the front reference image with legend
 * lines). Position values are best-effort estimates read off that image; expect to refine once
 * more reference pictures come in for the remaining points.
 *
 * A point can have a guide on more than one face (e.g. A — total garment height — is the same
 * measurement on front and back), so each entry is a list of per-face definitions.
 */
export const MEASUREMENT_GUIDES: Partial<Record<string, GuideDef[]>> = {
  A: [
    { orientation: 'vertical', face: 'front', color: '#16a34a', imgDX: 0, imgDYTop: -53, imgDYBottom: 263 },
    { orientation: 'vertical', face: 'back', color: '#16a34a', imgDX: 0, imgDYTop: -11, imgDYBottom: 240 },
  ],
  D: [
    { orientation: 'horizontal', face: 'front', color: '#2563eb', imgDY: 70, imgHalfWidth: 125.5 },
    // Placed at the same real-cm distance below guide A's top as on the front (123px on the
    // front's own scale), converted to the back image's own calibration — not eyeballed
    // pixels, since the two reference images aren't drawn to the same proportions.
    { orientation: 'horizontal', face: 'back', color: '#2563eb', imgDY: 87, imgHalfWidth: 99.5 },
  ],
};

/** Looks up the cm value for a measurement point at the given reference size, from the same
 *  chart shown on the Input tab. */
export function guideValueCm(point: string, referenceSize: string): string | null {
  const row = OVERSIZE_CHART.find((r) => r.point === point);
  if (!row) return null;
  const idx = OVERSIZE_SIZES.indexOf(referenceSize as (typeof OVERSIZE_SIZES)[number]);
  if (idx === -1) return null;
  return row.values[idx] ?? null;
}

function guideValueNumber(point: string, referenceSize: string): number | null {
  const raw = guideValueCm(point, referenceSize);
  if (!raw) return null;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** RESCALE VARIANT: the garment's actual rendered width, in cm — driven by the oversize chart's
 *  point D value (the same number shown on the "D — Ncm" label) at the selected reference size,
 *  rather than the separate, simpler size chart. This is the one place that decides "how wide is
 *  the tee shirt for on-screen rendering purposes" (picture, safe area, canvas), so the drawn
 *  garment's own left/right edges always reach exactly to Guide D's endpoints (triangle 0 and
 *  triangle D-value). Falls back to the plain chest width only if the reference size has no D
 *  entry in the chart. */
export function effectiveChestWidthCm(chestWidthCm: number, referenceSize: string): number {
  const chartD = guideValueNumber('D', referenceSize);
  return chartD !== null ? chartD : chestWidthCm;
}

/** Half-width (in local cm, from the centerline) of a horizontal guide, using the point's actual
 *  chart value (the same number shown on its "X — Ncm" label) rather than the reference image's
 *  own raw pixel calibration — those two don't necessarily agree (the artwork isn't drawn
 *  perfectly to scale for every point), so a guide's *drawn* width wouldn't otherwise match the
 *  measurement it's labeled with. Falls back to the raw pixel-based half-width only if the
 *  reference size has no chart entry for that point. */
export function guideHorizontalHalfWidthLocalCm(
  point: string,
  face: Face,
  chestWidthCm: number,
  referenceSize: string
): number {
  const def = MEASUREMENT_GUIDES[point]?.find((d) => d.face === face);
  if (!def || def.orientation !== 'horizontal') return 0;
  const chartValue = guideValueNumber(point, referenceSize);
  if (chartValue !== null) return chartValue / 2;
  return def.imgHalfWidth * templateScale(chestWidthCm, face);
}

/** The "Top of Shirt" reference point for print-zone placement: the local-cm y-coordinate of
 *  guide A's top endpoint (the highest point of the shoulder) on the given face, so "measured
 *  from top of shirt" anchors to the same point the A guide line touches. */
export function guideATopLocalY(face: Face, chestWidthCm: number): number {
  const def = MEASUREMENT_GUIDES.A?.find((d) => d.face === face);
  if (!def || def.orientation !== 'vertical') return 0;
  return def.imgDYTop * templateScale(chestWidthCm, face);
}

/** The local-cm y-coordinate of guide A's bottom endpoint on the given face, measured as the
 *  pixel-accurate top plus point A's actual chart length (the same number shown on the "A — Ncm"
 *  label) — not the reference image's own raw pixel span, which doesn't match the chart value
 *  (the artwork isn't drawn perfectly to scale). Falls back to the raw pixel span only if the
 *  reference size has no chart entry. */
export function guideABottomLocalY(face: Face, chestWidthCm: number, referenceSize: string): number {
  const def = MEASUREMENT_GUIDES.A?.find((d) => d.face === face);
  if (!def || def.orientation !== 'vertical') return 0;
  const chartLength = guideValueNumber('A', referenceSize);
  if (chartLength !== null) return guideATopLocalY(face, chestWidthCm) + chartLength;
  return def.imgDYBottom * templateScale(chestWidthCm, face);
}

/** The local-cm y-coordinate of guide A's midpoint (mid-distance of the total garment length) on
 *  the given face — the same point the black dot on the A line marks. */
export function guideAMidLocalY(face: Face, chestWidthCm: number, referenceSize: string): number {
  return (guideATopLocalY(face, chestWidthCm) + guideABottomLocalY(face, chestWidthCm, referenceSize)) / 2;
}

/** The local-cm x-coordinate of guide D's left endpoint on the given face — the reference point
 *  the vertical grid's first column (0 in a triangle) lines up with, and where the guide D line
 *  itself actually starts once drawn at its chart-accurate width. */
export function guideDLeftLocalX(face: Face, chestWidthCm: number, referenceSize: string): number {
  return -guideHorizontalHalfWidthLocalCm('D', face, chestWidthCm, referenceSize);
}
