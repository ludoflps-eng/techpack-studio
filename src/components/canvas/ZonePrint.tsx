import { fontCss, type PrintZone } from '../../types';
import type { ZoneRect } from '../../lib/geometry';
import { splitLines } from '../../lib/text';

const ANCHOR: Record<PrintZone['align'], 'start' | 'middle' | 'end'> = {
  left: 'start',
  center: 'middle',
  right: 'end',
};

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
  const lineHeight = rect.height / Math.max(lines.length, 1);
  const fontFactor = zone.lineSpacing === 'tight' ? 0.98 : 0.78;
  const fontSize = lineHeight * fontFactor;

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
        <text
          key={i}
          x={anchorX}
          y={rect.y + lineHeight * (i + 1) - lineHeight * (1 - fontFactor) * 0.5}
          textAnchor={textAnchor}
          fontFamily={font.cssFamily}
          fontWeight={font.weight}
          fontSize={fontSize}
          fill={zone.hex}
          textLength={zone.stretchToFit ? rect.width : undefined}
          lengthAdjust={zone.stretchToFit ? 'spacingAndGlyphs' : undefined}
        >
          {line}
        </text>
      ))}
    </g>
  );
}
