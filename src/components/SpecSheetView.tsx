import type { GarmentSpec, PrintZone, TechPack } from '../types';
import { fontCss } from '../types';
import { ShirtCanvas } from './canvas/ShirtCanvas';
import { zoneRect } from '../lib/geometry';
import { alignmentLabel, positionLabel, techniqueLabel, uniqueInks } from '../lib/specDerived';

function zoneSpecRows(zone: PrintZone, garment: GarmentSpec, referenceSize: string): [string, string][] {
  const fitted = zoneRect(zone, garment, referenceSize);
  return [
    ['Content', zone.content.split('\n').join(' / ') || '—'],
    ['Font', fontCss(zone.font).label],
    ['Case', zone.textCase === 'none' ? 'As typed' : zone.textCase],
    ['Line spacing', zone.lineSpacing === 'tight' ? 'Tight (lines nearly touching)' : 'Normal'],
    ['Stretch to fit', zone.stretchToFit ? 'Yes — letters stretched to fill width' : 'No'],
    ['Ink color', `${zone.colorName}${zone.pantone ? ` — Pantone ${zone.pantone}` : ''} (${zone.hex})`],
    ['Print width', `${fitted.width.toFixed(1)} cm`],
    ['Print height', `${fitted.height.toFixed(1)} cm`],
    ['Position', positionLabel(zone, garment, referenceSize)],
    ['Alignment', alignmentLabel(zone, garment, referenceSize)],
    ...(zone.symbolNote ? ([['Symbol note', zone.symbolNote]] as [string, string][]) : []),
    ...(zone.notes ? ([['Notes', zone.notes]] as [string, string][]) : []),
  ];
}

function SpecTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="avoid-break mb-4 overflow-hidden rounded-md border border-neutral-200">
      <div className="bg-neutral-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-neutral-100 first:border-t-0">
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

export function SpecSheetView({ pack }: { pack: TechPack }) {
  const inks = uniqueInks(pack.zones);
  const front = pack.zones.filter((z) => z.face === 'front');
  const back = pack.zones.filter((z) => z.face === 'back');

  return (
    <div className="spec-sheet-scroll h-full overflow-y-auto bg-neutral-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[900px] bg-white p-8 shadow-sm print:shadow-none print:p-0">
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

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          01 — Placement schema
        </h2>
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Front
            </p>
            <ShirtCanvas face="front" garment={pack.garment} zones={pack.zones} referenceSize={pack.referenceSize} />
          </div>
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Back
            </p>
            <ShirtCanvas face="back" garment={pack.garment} zones={pack.zones} referenceSize={pack.referenceSize} />
          </div>
        </div>

        <h2 className="mb-3 border-b-2 border-rose-600 pb-1 text-sm font-bold uppercase tracking-widest text-neutral-900">
          02 — Technical specifications
        </h2>

        {front.length > 0 && (
          <div className="mb-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Front</p>
            {front.map((zone) => (
              <SpecTable key={zone.id} title={zone.label} rows={zoneSpecRows(zone, pack.garment, pack.referenceSize)} />
            ))}
          </div>
        )}

        {back.length > 0 && (
          <div className="mb-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">Back</p>
            {back.map((zone) => (
              <SpecTable key={zone.id} title={zone.label} rows={zoneSpecRows(zone, pack.garment, pack.referenceSize)} />
            ))}
          </div>
        )}

        <SpecTable
          title="Colors, fabric & technique"
          rows={[
            ['Ink colors used', inks.length ? inks.map((i) => `${i.colorName}${i.pantone ? ` (Pantone ${i.pantone})` : ''}`).join(', ') : '—'],
            ['Number of inks', String(inks.length)],
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
          03 — Recap — size {pack.referenceSize}
        </h2>
        <table className="mb-6 w-full border-collapse overflow-hidden rounded-md text-sm">
          <thead>
            <tr className="bg-neutral-900 text-white">
              {['Face', 'Element', 'Position', 'Width', 'Height', 'Alignment'].map((h) => (
                <th key={h} className="px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pack.zones.map((zone) => {
              const fitted = zoneRect(zone, pack.garment, pack.referenceSize);
              return (
                <tr key={zone.id} className="border-t border-neutral-100">
                  <td className="px-3 py-1.5 capitalize text-neutral-800">{zone.face}</td>
                  <td className="px-3 py-1.5 text-neutral-800">{zone.label}</td>
                  <td className="px-3 py-1.5 text-neutral-800">{positionLabel(zone, pack.garment, pack.referenceSize)}</td>
                  <td className="px-3 py-1.5 text-neutral-800">{fitted.width.toFixed(1)} cm</td>
                  <td className="px-3 py-1.5 text-neutral-800">{fitted.height.toFixed(1)} cm</td>
                  <td className="px-3 py-1.5 text-neutral-800">{alignmentLabel(zone, pack.garment, pack.referenceSize)}</td>
                </tr>
              );
            })}
            {pack.zones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-neutral-400">
                  No print zones yet
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
