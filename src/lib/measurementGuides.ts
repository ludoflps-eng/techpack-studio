import type { Face } from '../types';
import { OVERSIZE_CHART, OVERSIZE_SIZES } from './oversizeChart';

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
 * Point definitions provided so far (A, B, D, E, F — from the front reference image with
 * legend lines). Position values are best-effort estimates read off that image; expect to
 * refine once more reference pictures come in for the remaining points.
 */
export const MEASUREMENT_GUIDES: Partial<Record<string, GuideDef>> = {
  A: { orientation: 'vertical', face: 'front', color: '#16a34a', imgDX: 0, imgDYTop: -53, imgDYBottom: 263 },
  B: { orientation: 'horizontal', face: 'front', color: '#dc2626', imgDY: 1, imgHalfWidth: 125.5 },
  D: { orientation: 'horizontal', face: 'front', color: '#2563eb', imgDY: 70, imgHalfWidth: 125.5 },
  E: { orientation: 'horizontal', face: 'front', color: '#f97316', imgDY: 150, imgHalfWidth: 125.5 },
  F: { orientation: 'horizontal', face: 'front', color: '#9333ea', imgDY: 224, imgHalfWidth: 125.5 },
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
