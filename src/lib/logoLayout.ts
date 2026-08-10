import type { Face, LogoSpec } from '../types';
import { guideABottomLocalY, guideDLeftLocalX } from './measurementGuides';

export interface LogoRect {
  /** Left edge, in local cm (same coordinate space as everything else on the canvas). */
  x: number;
  /** Top edge, in local cm. */
  y: number;
  widthCm: number;
  heightCm: number;
}

/** The local-cm point a logo's reference point (the blue dot) actually sits at,
 *  from its stored (circle, triangle) coordinate. Same convention front/back text already use:
 *  triangleCm is measured from guide D's left edge, circleCm up from guide A's bottom (the hem). */
export function logoAnchorLocal(
  logo: LogoSpec,
  face: Face,
  chestWidthCm: number,
  referenceSize: string
): { x: number; y: number } {
  return {
    x: guideDLeftLocalX(face, chestWidthCm, referenceSize) + logo.triangleCm,
    y: guideABottomLocalY(face, chestWidthCm, referenceSize) - logo.circleCm,
  };
}

/** The image's actual rendered rectangle (in local cm), sized from `widthCm` with the aspect
 *  ratio locked to its natural pixel dimensions, and positioned so that its own reference point
 *  — crossXPercent/crossYPercent within the image — lands exactly on the given anchor point. */
export function logoPlacement(logo: LogoSpec, anchor: { x: number; y: number }): LogoRect {
  const heightCm = logo.widthCm * (logo.naturalHeightPx / logo.naturalWidthPx);
  return {
    x: anchor.x - logo.widthCm * logo.crossXPercent,
    y: anchor.y - heightCm * logo.crossYPercent,
    widthCm: logo.widthCm,
    heightCm,
  };
}
