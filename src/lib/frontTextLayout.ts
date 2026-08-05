import { fontCss, type Face, type FrontTextSpec } from '../types';
import { guideDLeftLocalX } from './measurementGuides';
import { splitLines } from './text';

/** The garment context needed to place a text on a specific face/size — everything
 *  resolveFrontTextPosition needs beyond the texts themselves to compute a centered position. */
export interface FaceGarmentCtx {
  face: Face;
  chestWidthCm: number;
  referenceSize: string;
}

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
export function measureInk(
  text: string,
  fontSizePx: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: 'normal' | 'italic' = 'normal'
) {
  const ctx = getMeasureContext();
  ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
  return ctx.measureText(text);
}

/** The bold/italic-aware font weight and style a text actually renders at — `bold`/`italic`
 *  override the chosen font's own base weight, so Canvas measurement and SVG rendering always
 *  agree on which weight/style is really in effect. */
export function effectiveFontWeight(text: FrontTextSpec): number {
  return text.bold ? 700 : fontCss(text.font).weight;
}

export function effectiveFontStyle(text: FrontTextSpec): 'normal' | 'italic' {
  return text.italic ? 'italic' : 'normal';
}

/** The actual rendered print-box size for a front/back text item — the same thing "Show text
 *  limits" draws on the canvas. Height is exactly line-count × textHeightCm, since lines stack
 *  with no extra gap by construction; width is the widest line's measured ink width, via the
 *  same Canvas-based technique used to size the text on the canvas, so this figure can never
 *  drift out of sync with what's actually drawn. */
export function printBoxSizeCm(text: FrontTextSpec): { widthCm: number; heightCm: number } {
  const lines = splitLines(text.content, text.textCase);
  const { cssFamily: fontFamily } = fontCss(text.font);
  const fontWeight = effectiveFontWeight(text);
  const fontStyle = effectiveFontStyle(text);
  const widths = lines.map((line) => {
    if (!line || text.textHeightCm <= 0) return 0;
    const m = measureInk(line, MEASURE_REF_PX, fontFamily, fontWeight, fontStyle);
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

/** The triangle-axis (horizontal) cm value that puts `text`'s actual print-box width centered on
 *  guide A — the garment's vertical centerline (x = 0 in local cm) — on the given face/size. Used
 *  both to render a centered text and to show the live equivalent cm value in the form, so the
 *  two can never disagree. */
export function centeredTriangleCm(text: FrontTextSpec, ctx: FaceGarmentCtx): number {
  const { widthCm } = printBoxSizeCm(text);
  return -guideDLeftLocalX(ctx.face, ctx.chestWidthCm, ctx.referenceSize) - widthCm / 2;
}

function rawPosition(text: FrontTextSpec): ResolvedFrontTextPosition {
  return { circleCm: text.circleCm, triangleCm: text.triangleCm };
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
 *
 * If `text.centerHorizontally` is set, the resolved triangleCm is always overridden to the
 * centered value regardless of anchor/absolute mode — vertical (circleCm) position from the
 * anchor chain or absolute value is unaffected, so a text can be both anchored vertically to
 * another text AND centered horizontally at the same time.
 */
export function resolveFrontTextPosition(
  text: FrontTextSpec,
  allTexts: FrontTextSpec[],
  ctx: FaceGarmentCtx,
  visiting: Set<string> = new Set()
): ResolvedFrontTextPosition {
  const base = resolveBasePosition(text, allTexts, ctx, visiting);
  if (!text.centerHorizontally) return base;
  return { circleCm: base.circleCm, triangleCm: centeredTriangleCm(text, ctx) };
}

function resolveBasePosition(
  text: FrontTextSpec,
  allTexts: FrontTextSpec[],
  ctx: FaceGarmentCtx,
  visiting: Set<string>
): ResolvedFrontTextPosition {
  if (!text.anchorTextId || visiting.has(text.id)) {
    return rawPosition(text);
  }
  const target = allTexts.find((t) => t.id === text.anchorTextId);
  if (!target || target.id === text.id) {
    return rawPosition(text);
  }
  const nextVisiting = new Set(visiting);
  nextVisiting.add(text.id);
  const targetPos = resolveFrontTextPosition(target, allTexts, ctx, nextVisiting);
  return {
    circleCm: targetPos.circleCm + text.anchorBelowCm,
    triangleCm: targetPos.triangleCm + text.anchorRightCm,
  };
}
