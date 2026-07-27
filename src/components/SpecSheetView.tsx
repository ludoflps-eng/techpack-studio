import { useState, type ReactNode } from 'react';
import type { FrontTextSpec, GarmentSpec, PrintZone, TechPack } from '../types';
import { fontCss } from '../types';
import { ShirtCanvas } from './canvas/ShirtCanvas';
import { zoneRect } from '../lib/geometry';
import { alignmentLabel, positionLabel, techniqueLabel, uniqueInks } from '../lib/specDerived';
import { printBoxSizeCm, resolveFrontTextPosition, type FaceGarmentCtx } from '../lib/frontTextLayout';
import { createFrontTextDefaults } from '../factories';
import { MeasurementGuideControl, POINTS as MEASUREMENT_POINTS } from './forms/MeasurementGuideControl';
import { OversizeSpecDiagram } from './OversizeSpecDiagram';

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
    rows.push([`Text ${n}`, text.content.split('\n').join(' / ')]);
    rows.push([`Text ${n} - Font`, fontCss(text.font).label]);
    rows.push([`Text ${n} - Case`, caseLabel]);
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
  });
  return rows;
}

export function SpecSheetView({ pack }: { pack: TechPack }) {
  const inks = uniqueInks(pack.zones);
  const front = pack.zones.filter((z) => z.face === 'front');
  const back = pack.zones.filter((z) => z.face === 'back');

  // Same defensive fallback as the Design view: backfill any field an older/partial pack might
  // be missing, field by field, so this never crashes regardless of migration timing.
  const frontTexts = (pack.frontTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
  const backTexts = (pack.backTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
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

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          05 — Tee Shirt dimensions
        </h2>
        <div className="avoid-break mb-6">
          <OversizeSpecDiagram />
        </div>

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
