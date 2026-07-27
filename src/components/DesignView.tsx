import { useState } from 'react';
import type { TechPack } from '../types';
import { useStore } from '../store';
import { createFrontTextDefaults } from '../factories';
import { ShirtCanvas } from './canvas/ShirtCanvas';
import { GarmentForm } from './forms/GarmentForm';
import { FrontTextForm } from './forms/FrontTextForm';
import { NotesForm } from './forms/NotesForm';
import { MeasurementGuideControl, POINTS as MEASUREMENT_POINTS } from './forms/MeasurementGuideControl';

type Section = 'garment' | 'fronttext' | 'backtext' | 'notes';

export function DesignView({ pack }: { pack: TechPack }) {
  const store = useStore();
  // Defensive fallback for packs saved before any given frontText field (or the frontTexts/
  // backTexts array itself) existed — merged field by field, not just "does it exist at all",
  // since a pack can have an older, partial item missing only the newest fields. The store
  // migration should already backfill this, but a merge here means an older/partial pack never
  // crashes the view.
  const frontTexts = (pack.frontTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
  const backTexts = (pack.backTexts ?? []).map((t) => ({ ...createFrontTextDefaults(), ...t }));
  const [section, setSection] = useState<Section>('garment');
  const [guidesEnabled, setGuidesEnabled] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<string[]>(MEASUREMENT_POINTS);

  const tabs: { id: Section; label: string }[] = [
    { id: 'garment', label: 'Garment & fabric' },
    { id: 'fronttext', label: 'Front text' },
    { id: 'backtext', label: 'Back text' },
    { id: 'notes', label: 'Production notes' },
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[1fr_300px]">
      <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto p-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <MeasurementGuideControl
            enabled={guidesEnabled}
            onEnabledChange={setGuidesEnabled}
            selectedPoints={selectedPoints}
            onSelectedPointsChange={setSelectedPoints}
          />
          <label className="flex items-center gap-2 self-end text-xs font-medium text-neutral-600">
            <input
              type="checkbox"
              checked={!!pack.garment.gridLinesEnabled}
              onChange={(e) => store.updateGarment(pack.id, { gridLinesEnabled: e.target.checked })}
              className="h-4 w-4 accent-rose-600"
            />
            Grid lines
          </label>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-1">
            <p className="mb-0.5 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Front
            </p>
            <ShirtCanvas
              face="front"
              garment={pack.garment}
              zones={[]}
              guidesEnabled={guidesEnabled}
              selectedPoints={selectedPoints}
              referenceSize={pack.referenceSize}
              frontTexts={frontTexts}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-1">
            <p className="mb-0.5 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Back
            </p>
            <ShirtCanvas
              face="back"
              garment={pack.garment}
              zones={[]}
              guidesEnabled={guidesEnabled}
              selectedPoints={selectedPoints}
              referenceSize={pack.referenceSize}
              backTexts={backTexts}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden border-t border-neutral-200 lg:border-l lg:border-t-0">
        <div className="flex shrink-0 border-b border-neutral-200 bg-neutral-50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`flex-1 px-2 py-2.5 text-xs font-semibold ${
                section === t.id
                  ? 'border-b-2 border-rose-600 text-rose-600'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {section === 'garment' && (
            <GarmentForm
              garment={pack.garment}
              referenceSize={pack.referenceSize}
              onChange={(patch) => store.updateGarment(pack.id, patch)}
              onSizeChange={(size) => store.applySize(pack.id, size)}
            />
          )}

          {section === 'fronttext' && (
            <FrontTextForm
              frontTexts={frontTexts}
              onAdd={() => store.addFrontText(pack.id)}
              onChange={(textId, patch) => store.updateFrontText(pack.id, textId, patch)}
              onRemove={(textId) => store.removeFrontText(pack.id, textId)}
              ctx={{ face: 'front', chestWidthCm: pack.garment.chestWidthCm, referenceSize: pack.referenceSize }}
            />
          )}

          {section === 'backtext' && (
            <FrontTextForm
              frontTexts={backTexts}
              onAdd={() => store.addBackText(pack.id)}
              onChange={(textId, patch) => store.updateBackText(pack.id, textId, patch)}
              onRemove={(textId) => store.removeBackText(pack.id, textId)}
              ctx={{ face: 'back', chestWidthCm: pack.garment.chestWidthCm, referenceSize: pack.referenceSize }}
            />
          )}

          {section === 'notes' && (
            <NotesForm
              notes={pack.productionNotes}
              onAdd={() => store.addNote(pack.id, '')}
              onUpdate={(i, v) => store.updateNote(pack.id, i, v)}
              onRemove={(i) => store.removeNote(pack.id, i)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
