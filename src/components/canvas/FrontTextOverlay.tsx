import { useMemo } from 'react';
import { fontCss, type Face, type FrontTextSpec, type GarmentSpec } from '../../types';
import { guideABottomLocalY, guideDLeftLocalX } from '../../lib/measurementGuides';
import { effectiveFontStyle, effectiveFontWeight, measureInk } from '../../lib/frontTextLayout';
import { splitLines } from '../../lib/text';

/** Reference font size (CSS px) used only to ask the browser's text-shaping engine for the
 *  font's ink-to-em-size ratio — large enough that the measurement isn't dominated by rounding.
 *  Canvas TextMetrics scale linearly with font size (per spec, based on the glyph outlines, not
 *  a rasterized/hinted bitmap), so one measurement at this size is enough to derive the exact
 *  font size needed for any target ink height. */
const MEASURE_REF_PX = 500;

interface LineLayout {
  fontSize: number;
  x: number;
  y: number;
  widthCm: number;
}

/** Computes the exact SVG font-size/x/y (in local cm / user-space units) so this line's actual
 *  glyph ink has height `textHeightCm` and its bottom-left ink corner lands exactly on
 *  (anchorX, anchorBottomY) — derived from one Canvas measurement rather than an SVG probe
 *  render, so it isn't at the mercy of a browser's SVG getBBox() returning loose, line-height-
 *  based bounds instead of tight ink bounds. */
function layoutLine(
  text: string,
  anchorX: number,
  anchorBottomY: number,
  textHeightCm: number,
  fontFamily: string,
  fontWeight: number,
  fontStyle: 'normal' | 'italic'
): LineLayout | null {
  if (!text || textHeightCm <= 0) return null;
  const m = measureInk(text, MEASURE_REF_PX, fontFamily, fontWeight, fontStyle);
  const inkHeightPx = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (!(inkHeightPx > 0)) return null;
  const scale = textHeightCm / inkHeightPx; // local-cm units per reference px, for this font/text
  return {
    fontSize: MEASURE_REF_PX * scale,
    x: anchorX + m.actualBoundingBoxLeft * scale,
    y: anchorBottomY - m.actualBoundingBoxDescent * scale,
    widthCm: (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * scale,
  };
}

/** One line of front text with no bounding box and no width-fit — just content, rendered so its
 *  actual glyph ink has height `textHeightCm` and its bottom-left corner lands exactly on
 *  (anchorX, anchorBottomY) — deliberately NOT reusing the old box/stretch-to-fit machinery that
 *  caused problems. */
function AnchoredTextLine({
  text,
  anchorX,
  anchorBottomY,
  textHeightCm,
  fontFamily,
  fontWeight,
  fontStyle,
  underline,
  fill,
}: {
  text: string;
  anchorX: number;
  anchorBottomY: number;
  textHeightCm: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  fill: string;
}) {
  const layout = useMemo(
    () => layoutLine(text, anchorX, anchorBottomY, textHeightCm, fontFamily, fontWeight, fontStyle),
    [text, anchorX, anchorBottomY, textHeightCm, fontFamily, fontWeight, fontStyle]
  );

  if (!layout) return null;
  return (
    <text
      x={layout.x}
      y={layout.y}
      textAnchor="start"
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      fontStyle={fontStyle}
      textDecoration={underline ? 'underline' : undefined}
      fontSize={layout.fontSize}
      fill={fill}
      xmlSpace="preserve"
      style={{ whiteSpace: 'pre' }}
    >
      {text}
    </text>
  );
}

/** Diagnostic-only bounding box drawn flush against the text's actual rendered ink — 4 fine red
 *  lines (top, bottom, left, right) plus their width/height measurements, so the reported on-shirt
 *  size can be cross-checked visually. Purely a read-out of where the ink already landed; it never
 *  feeds back into how the text itself is sized or positioned. */
function TextLimitsOverlay({
  left,
  right,
  top,
  bottom,
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  const color = '#dc2626';
  const width = right - left;
  const height = bottom - top;
  const fontSize = 2.2;
  const gap = 1.2;
  const textHalo = { paintOrder: 'stroke' as const, stroke: 'white', strokeWidth: 0.4, strokeLinejoin: 'round' as const };

  return (
    <g pointerEvents="none">
      <line x1={left} y1={top} x2={right} y2={top} stroke={color} strokeWidth={0.15} />
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={color} strokeWidth={0.15} />
      <line x1={left} y1={top} x2={left} y2={bottom} stroke={color} strokeWidth={0.15} />
      <line x1={right} y1={top} x2={right} y2={bottom} stroke={color} strokeWidth={0.15} />
      <g fontFamily="Inter, sans-serif" fontWeight={600} fontSize={fontSize} fill={color}>
        <text x={(left + right) / 2} y={bottom + gap + fontSize * 0.8} textAnchor="middle" {...textHalo}>
          {width.toFixed(1)} cm
        </text>
        <text x={left - gap} y={(top + bottom) / 2} textAnchor="end" dominantBaseline="middle" {...textHalo}>
          {height.toFixed(1)} cm
        </text>
      </g>
    </g>
  );
}

export function FrontTextOverlay({
  face,
  garment,
  referenceSize,
  frontText,
}: {
  face: Face;
  garment: GarmentSpec;
  referenceSize: string;
  frontText: FrontTextSpec;
}) {
  const lines = splitLines(frontText.content, frontText.textCase);
  const anchorX = guideDLeftLocalX(face, garment.chestWidthCm, referenceSize) + frontText.triangleCm;
  const anchorBottomY = guideABottomLocalY(face, garment.chestWidthCm, referenceSize) - frontText.circleCm;
  const { cssFamily: fontFamily } = fontCss(frontText.font);
  const fontWeight = effectiveFontWeight(frontText);
  const fontStyle = effectiveFontStyle(frontText);

  // Keyed by line index rather than reset-on-content-change: a stale entry from a previously
  // longer text is simply never read once `lines` shrinks, so there's no need to clear it.
  const widths = lines.map(
    (line, i) =>
      layoutLine(
        line,
        anchorX,
        anchorBottomY + i * frontText.textHeightCm,
        frontText.textHeightCm,
        fontFamily,
        fontWeight,
        fontStyle
      )?.widthCm ?? null
  );
  const allMeasured = frontText.showLimits && widths.every((w): w is number => w !== null);
  const maxWidthCm = allMeasured ? Math.max(...widths) : 0;

  return (
    <g pointerEvents="none">
      {lines.map((line, i) => (
        <AnchoredTextLine
          key={i}
          text={line}
          anchorX={anchorX}
          anchorBottomY={anchorBottomY + i * frontText.textHeightCm}
          textHeightCm={frontText.textHeightCm}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          underline={frontText.underline}
          fill={frontText.textHex}
        />
      ))}
      {allMeasured && (
        <TextLimitsOverlay
          left={anchorX}
          right={anchorX + maxWidthCm}
          top={anchorBottomY - frontText.textHeightCm}
          bottom={anchorBottomY + (lines.length - 1) * frontText.textHeightCm}
        />
      )}
    </g>
  );
}
