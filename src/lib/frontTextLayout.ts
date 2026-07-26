import { fontCss, type FrontTextSpec } from '../types';
import { splitLines } from './text';

export interface ResolvedFrontTextPosition {
  circleCm: number;
  triangleCm: number;
}

/** Reference font size (CSS px) used only to ask the browser's text-shaping engine for the
 *  font's ink-to-em-size ratio — large enough that the measurement isn't dominated by rounding.
 *  Canvas TextMetrics scale linearly with font size (per spec, based on the glyph outlines, not
 *  a rasterized/hinted bitmap), so one measurement at this size is enough to derive the exact
 *  font size needed for any target ink height. */
const MEASURE_REF_PX = 500;

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d')!;
  }
  return measureCtx;
}

/** Tight ink metrics for `text` at `fontSizePx`, via Canvas 2D's `actualBoundingBox*` fields.
 *  Unlike SVG's `getBBox()` — which some browsers/fonts report as a loose, font-metrics-based
 *  box (full line height, not the glyphs' actual ink) — `actualBoundingBox*` is specced to be
 *  the tight bounding box of the rendered glyphs, so it's the reliable source of truth here. */
export function measureInk(text: string, fontSizePx: number, fontFamily: string, fontWeight: number) {
  const ctx = getMeasureContext();
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  return ctx.measureText(text);
}

/** The actual rendered print-box size for a front/back text item — the same thing "Show text
 *  limits" draws on the canvas. Height is exactly line-count × textHeightCm, since lines stack
 *  with no extra gap by construction; width is the widest line's measured ink width, via the
 *  same Canvas-based technique used to size the text on the canvas, so this figure can never
 *  drift out of sync with what's actually drawn. */
export function printBoxSizeCm(text: FrontTextSpec): { widthCm: number; heightCm: number } {
  const lines = splitLines(text.content, text.textCase);
  const { cssFamily: fontFamily, weight: fontWeight } = fontCss(text.font);
  const widths = lines.map((line) => {
    if (!line || text.textHeightCm <= 0) return 0;
    const m = measureInk(line, MEASURE_REF_PX, fontFamily, fontWeight);
    const inkHeightPx = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (!(inkHeightPx > 0)) return 0;
    const scale = text.textHeightCm / inkHeightPx;
    return (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * scale;
  });
  return {
    widthCm: widths.length > 0 ? Math.max(...widths) : 0,
    heightCm: lines.length * text.textHeightCm,
  };
}

/**
 * Resolves a front text's actual (circle, triangle) position, following its anchor chain (if
 * any) to another text in the same pack. An anchored text sits `anchorBelowCm` away from that
 * target's own RESOLVED position along the circle axis — negative values put it below, positive
 * values put it above — and `anchorRightCm` to the right (triangle axis, negative = left) of
 * that same resolved position. Resolving the TARGET's position (not its raw stored one) means a
 * target anchored to yet another text still carries everything anchored to it along
 * transitively, and moving any text in the chain moves all of its dependents with it.
 *
 * Falls back to the text's own absolute circleCm/triangleCm if it isn't anchored, its target is
 * missing (e.g. deleted), or the anchor chain cycles back on itself — `visiting` tracks the ids
 * already being resolved so a cycle (A anchored to B anchored back to A) can't recurse forever.
 */
export function resolveFrontTextPosition(
  text: FrontTextSpec,
  allTexts: FrontTextSpec[],
  visiting: Set<string> = new Set()
): ResolvedFrontTextPosition {
  if (!text.anchorTextId || visiting.has(text.id)) {
    return { circleCm: text.circleCm, triangleCm: text.triangleCm };
  }
  const target = allTexts.find((t) => t.id === text.anchorTextId);
  if (!target || target.id === text.id) {
    return { circleCm: text.circleCm, triangleCm: text.triangleCm };
  }
  const nextVisiting = new Set(visiting);
  nextVisiting.add(text.id);
  const targetPos = resolveFrontTextPosition(target, allTexts, nextVisiting);
  return {
    circleCm: targetPos.circleCm + text.anchorBelowCm,
    triangleCm: targetPos.triangleCm + text.anchorRightCm,
  };
}
