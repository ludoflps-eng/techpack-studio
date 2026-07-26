import { useEffect, useRef, useState } from 'react';
import { fontCss, type PrintZone } from '../../types';
import type { ZoneRect } from '../../lib/geometry';
import { splitLines } from '../../lib/text';

const ANCHOR: Record<PrintZone['align'], 'start' | 'middle' | 'end'> = {
  left: 'start',
  center: 'middle',
  right: 'end',
};

/** Font-size used to measure a probe render of the text, before scaling to the real target.
 *  Deliberately a fixed, moderate size — never the (possibly very large or very small) target
 *  size itself — so the measurement never has to render or rasterize glyphs at an extreme
 *  scale, which is where cross-browser hinting/rounding behavior diverges most. */
const PROBE_FONT_SIZE = 50;

/** One line of print text, sized and positioned so its actual rendered glyph ink — not the SVG
 *  font-size, which is just the type's em-square and doesn't match visible letter height —
 *  exactly fills its vertical slot: top edge at `slotTop`, height equal to `slotHeight`, no gap
 *  above and no descender overflow below. Measured once on the live SVG element at a fixed,
 *  moderate probe size and then scaled mathematically to the target — not by iterating the
 *  element up toward the (possibly huge or tiny) target size and re-measuring each step, which
 *  is far more exposed to per-browser glyph-rasterization quirks at extreme sizes.
 *
 *  Width-fitting (`targetWidth`) is applied as an explicit horizontal `scale()` transform on a
 *  wrapping `<g>`, pivoted at the text's own anchor point — NOT via SVG's native
 *  `textLength`/`lengthAdjust="spacingAndGlyphs"`. That path is unreliable in Chrome under heavy
 *  compression: it reports a correct height via getBBox() but can visibly *paint* the glyphs
 *  shorter than that, so text that needs significant horizontal squeezing (e.g. two wide
 *  characters forced into a narrow box) silently undershoots its requested height on screen even
 *  though every measurement says it's correct. A plain 2D scale has no such ambiguity: it can
 *  only affect the dimension it's given.
 *
 *  Waits for webfonts to finish loading before measuring, since an early measurement would
 *  calibrate against the fallback font instead of the real one. */
function ZoneTextLine({
  text,
  x,
  slotTop,
  slotHeight,
  targetWidth,
  textAnchor,
  fontFamily,
  fontWeight,
  fill,
}: {
  text: string;
  x: number;
  slotTop: number;
  slotHeight: number;
  targetWidth?: number;
  textAnchor: 'start' | 'middle' | 'end';
  fontFamily: string;
  fontWeight: number;
  fill: string;
}) {
  const ref = useRef<SVGTextElement>(null);
  const [fontSize, setFontSize] = useState(slotHeight);
  const [y, setY] = useState(slotTop + slotHeight);
  const [scaleX, setScaleX] = useState(1);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;

    const attemptMeasure = (attemptsLeft: number) => {
      if (cancelled) return;
      const el = ref.current;
      if (!el || !text || slotHeight <= 0) return;
      try {
        const probeY = slotTop + slotHeight;
        el.setAttribute('font-size', String(PROBE_FONT_SIZE));
        el.setAttribute('y', String(probeY));
        const probeBox = el.getBBox();
        if (probeBox.height <= 0) {
          if (attemptsLeft > 0) rafId = requestAnimationFrame(() => attemptMeasure(attemptsLeft - 1));
          return;
        }
        const scale = slotHeight / probeBox.height;
        const finalSize = PROBE_FONT_SIZE * scale;
        // The probe's ink starts `probeY - probeBox.y` above its baseline; scale that same
        // proportion to the final size, then place the baseline so the ink's top edge lands
        // exactly on the slot's top edge.
        const finalY = slotTop + (probeY - probeBox.y) * scale;
        // Natural (unstretched) width at the final size, scaled the same way as the height —
        // used to work out how much horizontal squeeze `targetWidth` actually needs.
        const naturalWidthAtFinalSize = probeBox.width * scale;
        const finalScaleX =
          targetWidth && naturalWidthAtFinalSize > 0 ? targetWidth / naturalWidthAtFinalSize : 1;
        el.setAttribute('font-size', String(finalSize));
        el.setAttribute('y', String(finalY));
        if (Number.isFinite(finalSize) && finalSize > 0) setFontSize(finalSize);
        if (Number.isFinite(finalY)) setY(finalY);
        if (Number.isFinite(finalScaleX) && finalScaleX > 0) setScaleX(finalScaleX);
      } catch {
        if (attemptsLeft > 0) rafId = requestAnimationFrame(() => attemptMeasure(attemptsLeft - 1));
      }
    };

    const start = () => attemptMeasure(10);
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (!cancelled) start();
      });
    } else {
      start();
    }
    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // Re-measure only when the text/font/slot/target width actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fontFamily, fontWeight, slotTop, slotHeight, targetWidth]);

  return (
    <g transform={scaleX !== 1 ? `translate(${x} 0) scale(${scaleX} 1) translate(${-x} 0)` : undefined}>
      <text ref={ref} x={x} y={y} textAnchor={textAnchor} fontFamily={fontFamily} fontWeight={fontWeight} fontSize={fontSize} fill={fill}>
        {text}
      </text>
    </g>
  );
}

export function ZonePrint({
  zone,
  rect,
  selected,
  onSelect,
}: {
  zone: PrintZone;
  rect: ZoneRect;
  selected: boolean;
  onSelect?: () => void;
}) {
  const lines = splitLines(zone.content, zone.textCase);
  const font = fontCss(zone.font);
  // Each line's rendered letters fill their slot exactly — the box height always matches the
  // letters' actual height with no gap, so lines pack back-to-back with zero extra spacing.
  const lineHeight = rect.height / Math.max(lines.length, 1);

  const textAnchor = ANCHOR[zone.align];
  const anchorX = zone.align === 'left' ? rect.x : zone.align === 'right' ? rect.x + rect.width : rect.x + rect.width / 2;

  return (
    <g onClick={onSelect} style={{ cursor: onSelect ? 'pointer' : undefined }}>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={selected ? 'rgba(225,29,72,0.08)' : 'rgba(225,29,72,0.04)'}
        stroke={selected ? '#e11d48' : 'rgba(225,29,72,0.85)'}
        strokeWidth={selected ? 0.4 : 0.28}
        strokeDasharray={selected ? undefined : '0.9,0.6'}
      />
      {lines.map((line, i) => (
        <ZoneTextLine
          key={i}
          text={line}
          x={anchorX}
          slotTop={rect.y + lineHeight * i}
          slotHeight={lineHeight}
          textAnchor={textAnchor}
          fontFamily={font.cssFamily}
          fontWeight={font.weight}
          fill={zone.hex}
          targetWidth={zone.stretchToFit ? rect.width : undefined}
        />
      ))}
      {zone.showCenterDot && (
        <circle cx={rect.x + rect.width / 2} cy={rect.y + rect.height / 2} r={0.5} fill="#111827" />
      )}
    </g>
  );
}
