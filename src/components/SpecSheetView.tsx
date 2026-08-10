import { useEffect, useState, type ReactNode } from 'react';
import type { FrontTextSpec, GarmentSpec, LogoSpec, PrintZone, TechPack } from '../types';
import { fontCss } from '../types';
import { ShirtCanvas } from './canvas/ShirtCanvas';
import { zoneRect } from '../lib/geometry';
import { alignmentLabel, positionLabel, techniqueLabel, uniqueInks } from '../lib/specDerived';
import { printBoxSizeCm, resolveFrontTextPosition, type FaceGarmentCtx } from '../lib/frontTextLayout';
import { createFrontTextDefaults, createLogoDefaults } from '../factories';
import { findContentBounds, type ContentBounds } from '../lib/imageBackgroundRemoval';
import { MeasurementGuideControl, POINTS as MEASUREMENT_POINTS } from './forms/MeasurementGuideControl';
import { OversizeSpecDiagram } from './OversizeSpecDiagram';

const CHECKER_BG = {
  backgroundImage:
    'repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 6px, #ffffff 6px, #ffffff 12px)',
};

/** A picture's real visible-artwork size (in cm) and bounding box (as fractions of its full
 *  canvas) — what's actually left after background removal, which is often smaller than the raw
 *  file dimensions (e.g. a non-square source photo leaves a transparent margin around the
 *  subject). Reported and drawn everywhere a picture's "size" is shown, instead of the full,
 *  padding-inclusive canvas size. */
interface LogoContentSize extends ContentBounds {
  widthCm: number;
  heightCm: number;
}

const FULL_BOUNDS: ContentBounds = { leftFrac: 0, topFrac: 0, rightFrac: 1, bottomFrac: 1 };

function contentSizeFromBounds(logo: LogoSpec, bounds: ContentBounds): LogoContentSize {
  const heightCmFull = logo.widthCm * (logo.naturalHeightPx / logo.naturalWidthPx);
  return {
    ...bounds,
    widthCm: logo.widthCm * (bounds.rightFrac - bounds.leftFrac),
    heightCm: heightCmFull * (bounds.bottomFrac - bounds.topFrac),
  };
}

/** Computes each picture's real visible-artwork size by scanning its alpha channel for the tight
 *  content bounding box — async (a canvas pixel scan), so this starts every logo at its full,
 *  untrimmed size and swaps in the trimmed measurement once computed (near-instant for these
 *  size-capped images, but avoids blocking the initial render on it). Keyed by logo id, recomputed
 *  only when that logo's own image data changes. */
function useLogoContentSizes(logos: LogoSpec[]): Record<string, LogoContentSize> {
  const [sizes, setSizes] = useState<Record<string, LogoContentSize>>({});
  const key = logos.map((l) => `${l.id}:${l.imageDataUrl.length}`).join('|');

  useEffect(() => {
    let cancelled = false;
    logos.forEach((logo) => {
      findContentBounds(logo.imageDataUrl)
        .then((bounds) => {
          if (cancelled) return;
          setSizes((prev) => ({ ...prev, [logo.id]: contentSizeFromBounds(logo, bounds) }));
        })
        .catch(() => {
          // Leave this logo's size unset — callers fall back to its full canvas size.
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return sizes;
}

function zoneSpecRows(zone: PrintZone, garment: GarmentSpec, referenceSize: string, allZones: PrintZone[]): [string, string][] {
  const fitted = zoneRect(zone, garment, referenceSize, allZones);
  return [
    ['Content', zone.content.split('\n').join(' / ') || '—'],
    ['Font', fontCss(zone.font).label],
    ['Case', zone.textCase === 'none' ? 'As typed' : zone.textCase],
    ['Line spacing', zone.lineSpacing === 'tight' ? 'Tight (lines nearly touching)' : 'Normal'],
    ['Stretch to fit', zone.stretchToFit ? 'Yes — letters stretched to fill width' : 'No'],
    ['Ink color', `${zone.colorName}${zone.pantone ? ` — Pantone ${zone.pantone}` : ''} (${zone.hex})`],
    ['Print width', `${fitted.width.toFixed(1)} cm`],
    ['Print height', `${fitted.height.toFixed(1)} cm`],
    ['Position', positionLabel(zone, garment, referenceSize, allZones)],
    ['Alignment', alignmentLabel(zone, garment, referenceSize, allZones)],
    ...(zone.symbolNote ? ([['Symbol note', zone.symbolNote]] as [string, string][]) : []),
    ...(zone.notes ? ([['Notes', zone.notes]] as [string, string][]) : []),
  ];
}

function SpecTable({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <div className="avoid-break mb-4 overflow-hidden rounded-md border border-neutral-200">
      <div className="bg-neutral-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={`${k}-${i}`} className="border-t border-neutral-100 first:border-t-0">
              <td className="w-1/3 bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 align-top">
                {k}
              </td>
              <td className="px-3 py-1.5 text-neutral-800 align-top">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small marker icons matching the same circle/triangle style used by the grid-line rulers on
 *  the canvas, so the recap table visually ties back to the position system it's reporting on. */
function CircleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" className="inline-block shrink-0 align-middle">
      <circle cx={7} cy={7} r={6} fill="white" stroke="#4b5563" strokeWidth={1.5} />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" className="inline-block shrink-0 align-middle">
      <polygon points="7,1 13,12.5 1,12.5" fill="white" stroke="#4b5563" strokeWidth={1.5} />
    </svg>
  );
}

/** One row-set per non-empty front (or back) text: its content, ink color, and resolved (circle,
 *  triangle) position — resolved rather than raw, so an anchored text reports where it actually
 *  ends up, not just its own stored offset. */
function frontTextRecapRows(texts: FrontTextSpec[], ctx: FaceGarmentCtx): [string, ReactNode][] {
  const rows: [string, ReactNode][] = [];
  texts.forEach((text, i) => {
    if (text.content.trim() === '') return;
    const n = i + 1;
    const { circleCm, triangleCm } = resolveFrontTextPosition(text, texts, ctx);
    // Rounded for display only — centered positions are computed from real text measurements
    // and land on long floats (e.g. 19.561025943396228), unlike hand-typed absolute/anchor
    // values which are already whole numbers most of the time.
    const circleCmRounded = Math.round(circleCm * 10) / 10;
    const triangleCmRounded = Math.round(triangleCm * 10) / 10;
    const caseLabel = text.textCase === 'uppercase' ? 'UPPER' : text.textCase === 'lowercase' ? 'lower' : 'As typed';
    const styleLabels = [
      text.bold && 'Bold',
      text.italic && 'Italic',
      text.underline && 'Underline',
    ].filter((s): s is string => Boolean(s));
    rows.push([`Text ${n}`, text.content.split('\n').join(' / ')]);
    rows.push([`Text ${n} - Font`, fontCss(text.font).label]);
    rows.push([`Text ${n} - Case`, caseLabel]);
    rows.push([`Text ${n} - Style`, styleLabels.length > 0 ? styleLabels.join(', ') : 'Regular']);
    rows.push([
      `Text ${n} - Color`,
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-4 w-4 shrink-0 rounded border border-neutral-300 align-middle" style={{ background: text.textHex }} />
        {text.textColorName}
        {text.textPantone ? ` — Pantone ${text.textPantone}` : ''}
      </span>,
    ]);
    rows.push([
      `Text ${n} - Position (Y — circle)`,
      <span className="inline-flex items-center gap-2">
        <CircleIcon /> {circleCmRounded} cm
      </span>,
    ]);
    rows.push([
      `Text ${n} - Position (X — triangle)`,
      <span className="inline-flex items-center gap-2">
        <TriangleIcon /> {triangleCmRounded} cm
      </span>,
    ]);
    const { widthCm, heightCm } = printBoxSizeCm(text);
    rows.push([`Text ${n} - Print Box`, `Height ${heightCm.toFixed(1)} cm - Length ${widthCm.toFixed(1)} cm`]);
    if (text.rotationDeg) rows.push([`Text ${n} - Rotation`, `${text.rotationDeg}° clockwise`]);
  });
  return rows;
}

/** One row-set per uploaded picture/logo: a thumbnail, its (circle, triangle) position — the
 *  point its blue-dot reference marker sits on, same reporting convention as text — and its
 *  size — the visible artwork's own size (after background removal), not the full underlying
 *  file's canvas size, which can include a transparent margin around the subject. */
function logoRecapRows(logos: LogoSpec[], sizes: Record<string, LogoContentSize>): [string, ReactNode][] {
  const rows: [string, ReactNode][] = [];
  logos.forEach((logo, i) => {
    const n = i + 1;
    const size = sizes[logo.id] ?? contentSizeFromBounds(logo, FULL_BOUNDS);
    rows.push([
      `Picture ${n}`,
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-10 w-10 shrink-0 overflow-hidden rounded border border-neutral-300" style={CHECKER_BG}>
          <img src={logo.imageDataUrl} alt="" className="h-full w-full object-contain" />
        </span>
      </span>,
    ]);
    rows.push([
      `Picture ${n} - Position (Y — circle)`,
      <span className="inline-flex items-center gap-2">
        <CircleIcon /> {Math.round(logo.circleCm * 10) / 10} cm
      </span>,
    ]);
    rows.push([
      `Picture ${n} - Position (X — triangle)`,
      <span className="inline-flex items-center gap-2">
        <TriangleIcon /> {Math.round(logo.triangleCm * 10) / 10} cm
      </span>,
    ]);
    rows.push([`Picture ${n} - Size`, `Height ${size.heightCm.toFixed(1)} cm - Width ${size.widthCm.toFixed(1)} cm`]);
    if (logo.rotationDeg) rows.push([`Picture ${n} - Rotation`, `${logo.rotationDeg}° clockwise`]);
  });
  return rows;
}

/** A full-size, isolated view of one picture/logo — the annex a supplier actually works from,
 *  since the small thumbnail in the recap table isn't enough to check fine artwork detail. Shown
 *  on a checkerboard so the file's real transparency (not the fabric color behind it) is clear.
 *  The blue reference-point dot is overlaid directly on the artwork (same marker style as the
 *  "Reference point to position text" legend and the upload form's placement preview), with its
 *  (circle, triangle) coordinates called out beside it, so a supplier can see exactly which point
 *  on the picture those numbers describe without cross-referencing a separate table. The dotted
 *  dimension lines are drawn tight against the visible artwork's own bounding box — not the full
 *  image canvas — so they read as the actual printed size, ignoring any transparent margin left
 *  around the subject after background removal. */
function LogoAnnex({ label, logo, size }: { label: string; logo: LogoSpec; size: LogoContentSize }) {
  const circleCmRounded = Math.round(logo.circleCm * 10) / 10;
  const triangleCmRounded = Math.round(logo.triangleCm * 10) / 10;
  const { leftFrac, topFrac, rightFrac, bottomFrac } = size;
  const midXFrac = (leftFrac + rightFrac) / 2;
  const midYFrac = (topFrac + bottomFrac) / 2;
  return (
    <div className="avoid-break mb-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <div className="mx-auto flex max-w-[600px] items-center justify-center gap-5">
        <div className="min-w-0 flex-1 rounded-md border border-neutral-300 p-4 pb-9 pr-9" style={CHECKER_BG}>
          {/* An inner box locked to the artwork's own aspect ratio, so the image fills it exactly
              (no object-contain letterboxing) and the dot's percentage position — and the
              dimension lines below/right of it — line up with the actual pixels, matching the
              reference point set in the upload form. */}
          <div
            className="relative mx-auto max-h-[460px] w-full"
            style={{ aspectRatio: `${logo.naturalWidthPx} / ${logo.naturalHeightPx}` }}
          >
            <img src={logo.imageDataUrl} alt={label} className="block h-full w-full object-contain" />
            <div
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: `${logo.crossXPercent * 100}%`,
                top: `${logo.crossYPercent * 100}%`,
                background: '#2563eb',
              }}
            />
            {/* Width — a fine dotted line spanning only the visible artwork's own width (not the
                full image canvas), just below it. */}
            <div
              className="pointer-events-none absolute -bottom-6 border-t border-dotted border-neutral-400"
              style={{ left: `${leftFrac * 100}%`, right: `${(1 - rightFrac) * 100}%` }}
            />
            <span
              className="pointer-events-none absolute -bottom-[2.35rem] -translate-x-1/2 whitespace-nowrap bg-white px-1 text-[10px] text-neutral-500"
              style={{ left: `${midXFrac * 100}%` }}
            >
              {size.widthCm.toFixed(1)} cm
            </span>
            {/* Height — a fine dotted line spanning only the visible artwork's own height, just to
                its right. */}
            <div
              className="pointer-events-none absolute -right-6 border-l border-dotted border-neutral-400"
              style={{ top: `${topFrac * 100}%`, bottom: `${(1 - bottomFrac) * 100}%` }}
            />
            <span
              className="pointer-events-none absolute -right-6 -translate-y-1/2 translate-x-full whitespace-nowrap bg-white px-1 text-[10px] text-neutral-500"
              style={{ top: `${midYFrac * 100}%`, writingMode: 'vertical-rl' }}
            >
              {size.heightCm.toFixed(1)} cm
            </span>
          </div>
        </div>
        <div className="w-28 shrink-0 space-y-1.5 text-xs text-neutral-600">
          <p className="mb-1 inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-neutral-400">
            Reference point (<span className="inline-block h-2 w-2 rounded-full" style={{ background: '#2563eb' }} />)
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CircleIcon /> {circleCmRounded} cm
          </p>
          <p className="inline-flex items-center gap-1.5">
            <TriangleIcon /> {triangleCmRounded} cm
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Rendered size: {size.heightCm.toFixed(1)} cm (H) × {size.widthCm.toFixed(1)} cm (W)
      </p>
    </div>
  );
}

export function SpecSheetView({ pack }: { pack: TechPack }) {
  const inks = uniqueInks(pack.zones);
  const front = pack.zones.filter((z) => z.face === 'front');
  const back = pack.zones.filter((z) => z.face === 'back');

  // Same defensive fallback as the Design view: backfill any field an older/partial pack might
  // be missing, field by field, so this never crashes regardless of migration timing.
  const frontTexts = (pack.frontTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
  const backTexts = (pack.backTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
  const frontLogos = (pack.frontLogos ?? []).map((l) => ({ ...createLogoDefaults(), ...l }));
  const backLogos = (pack.backLogos ?? []).map((l) => ({ ...createLogoDefaults(), ...l }));
  const frontTextRows = frontTextRecapRows(frontTexts, {
    face: 'front',
    chestWidthCm: pack.garment.chestWidthCm,
    referenceSize: pack.referenceSize,
  });
  const backTextRows = frontTextRecapRows(backTexts, {
    face: 'back',
    chestWidthCm: pack.garment.chestWidthCm,
    referenceSize: pack.referenceSize,
  });
  const logoSizes = useLogoContentSizes([...frontLogos, ...backLogos]);
  const frontLogoRows = logoRecapRows(frontLogos, logoSizes);
  const backLogoRows = logoRecapRows(backLogos, logoSizes);

  // Grid lines and measurement guides are display preferences for reviewing this document, not
  // part of the tech pack's own data — kept local here (never persisted, never touching the
  // shared garment record) so they don't leak into the Design tab or the saved pack.
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [guidePoints, setGuidePoints] = useState<string[]>(MEASUREMENT_POINTS);
  const specGarment = { ...pack.garment, gridLinesEnabled: showGrid };

  return (
    <div className="spec-sheet-scroll h-full overflow-y-auto bg-neutral-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1200px] bg-white p-8 shadow-sm print:shadow-none print:p-0">
        <div className="mb-6 flex items-center justify-between bg-neutral-900 px-6 py-5 text-white">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{pack.styleName || 'Untitled style'}</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-300">
              Graphic tech pack {pack.styleCode && `— ${pack.styleCode}`}
            </p>
          </div>
          <p className="text-xs uppercase tracking-widest text-neutral-300">
            Reference size: {pack.referenceSize}
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
            01 — Placement schema
          </h2>
          <div className="no-print flex flex-wrap items-center gap-3">
            <MeasurementGuideControl
              enabled={showGuides}
              onEnabledChange={setShowGuides}
              selectedPoints={guidePoints}
              onSelectedPointsChange={setGuidePoints}
            />
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="h-4 w-4 accent-rose-600"
              />
              Grid lines
            </label>
          </div>
        </div>
        <div className="mb-8 grid grid-cols-2 gap-10">
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Front
            </p>
            <ShirtCanvas
              face="front"
              garment={specGarment}
              zones={pack.zones}
              referenceSize={pack.referenceSize}
              guidesEnabled={showGuides}
              selectedPoints={guidePoints}
              frontTexts={frontTexts}
              frontLogos={frontLogos}
            />
          </div>
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Back
            </p>
            <ShirtCanvas
              face="back"
              garment={specGarment}
              zones={pack.zones}
              referenceSize={pack.referenceSize}
              guidesEnabled={showGuides}
              selectedPoints={guidePoints}
              backTexts={backTexts}
              backLogos={backLogos}
            />
          </div>
        </div>

        <div className="mb-8 flex items-end gap-4">
          <img
            src={`${import.meta.env.BASE_URL}legend.png`}
            alt="Reference point to position text — legend"
            width={251}
            height={54}
          />
          <img
            src={`${import.meta.env.BASE_URL}legend2.png`}
            alt="Text placement example — legend"
            width={84}
            height={54}
          />
        </div>

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          02 — Technical specifications
        </h2>

        {front.length > 0 && (
          <div className="mb-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Front</p>
            {front.map((zone) => (
              <SpecTable
                key={zone.id}
                title={zone.label}
                rows={zoneSpecRows(zone, pack.garment, pack.referenceSize, pack.zones)}
              />
            ))}
          </div>
        )}

        {back.length > 0 && (
          <div className="mb-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Back</p>
            {back.map((zone) => (
              <SpecTable
                key={zone.id}
                title={zone.label}
                rows={zoneSpecRows(zone, pack.garment, pack.referenceSize, pack.zones)}
              />
            ))}
          </div>
        )}

        <SpecTable
          title="Colors, fabric & technique"
          rows={[
            ['Fabric color', `${pack.garment.fabricColorName}${pack.garment.fabricPantone ? ` — Pantone ${pack.garment.fabricPantone}` : ''}`],
            ['Fabric composition', pack.garment.fabricComposition || '—'],
            ['Print technique', techniqueLabel(pack.garment)],
          ]}
        />

        {pack.productionNotes.length > 0 && (
          <div className="mb-6 border-l-4 border-rose-600 bg-neutral-50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Production notes
            </p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-800">
              {pack.productionNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          03 — Front Tee shirt
        </h2>
        {frontTextRows.length > 0 ? (
          <SpecTable title="Front text" rows={frontTextRows} />
        ) : (
          <p className="mb-6 rounded-md border border-neutral-200 px-3 py-4 text-center text-sm text-neutral-400">
            No front text yet
          </p>
        )}
        {frontLogoRows.length > 0 && <SpecTable title="Front picture(s)" rows={frontLogoRows} />}

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          04 — Back Tee shirt
        </h2>
        {backTextRows.length > 0 ? (
          <SpecTable title="Back text" rows={backTextRows} />
        ) : (
          <p className="mb-6 rounded-md border border-neutral-200 px-3 py-4 text-center text-sm text-neutral-400">
            No back text yet
          </p>
        )}
        {backLogoRows.length > 0 && <SpecTable title="Back picture(s)" rows={backLogoRows} />}

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          05 — Tee Shirt dimensions
        </h2>
        <div className="avoid-break mb-6">
          <OversizeSpecDiagram />
        </div>

        {(frontLogos.length > 0 || backLogos.length > 0) && (
          <>
            <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
              06 — Annexes
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Zoomed artwork for each uploaded picture/logo, for the supplier's reference.
            </p>
            {frontLogos.map((logo, i) => (
              <LogoAnnex
                key={logo.id}
                label={`Front picture ${i + 1}`}
                logo={logo}
                size={logoSizes[logo.id] ?? contentSizeFromBounds(logo, FULL_BOUNDS)}
              />
            ))}
            {backLogos.map((logo, i) => (
              <LogoAnnex
                key={logo.id}
                label={`Back picture ${i + 1}`}
                logo={logo}
                size={logoSizes[logo.id] ?? contentSizeFromBounds(logo, FULL_BOUNDS)}
              />
            ))}
          </>
        )}

        {inks.length === 1 && (
          <div className="flex items-center gap-3 rounded-md bg-rose-600 px-4 py-2.5 text-white">
            <span className="h-3 w-3 rounded-full bg-white" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Single ink throughout — {inks[0].colorName}
              {inks[0].pantone ? ` / Pantone ${inks[0].pantone}` : ''} ({inks[0].hex})
            </span>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-neutral-400">
          {pack.styleName} — {pack.styleCode} — Graphic tech pack
        </p>
      </div>
    </div>
  );
}
