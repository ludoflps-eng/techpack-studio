import { useState } from 'react';
import type { TechPack } from '../types';
import { useStore } from '../store';
import { ShirtCanvas } from './canvas/ShirtCanvas';
import { GarmentForm } from './forms/GarmentForm';
import { ZoneList } from './forms/ZoneList';
import { NotesForm } from './forms/NotesForm';

type Section = 'garment' | 'front' | 'back' | 'notes';

export function DesignView({ pack }: { pack: TechPack }) {
  const store = useStore();
  const [section, setSection] = useState<Section>('front');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(true);

  const tabs: { id: Section; label: string }[] = [
    { id: 'garment', label: 'Garment & fabric' },
    { id: 'front', label: `Front (${pack.zones.filter((z) => z.face === 'front').length})` },
    { id: 'back', label: `Back (${pack.zones.filter((z) => z.face === 'back').length})` },
    { id: 'notes', label: 'Production notes' },
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-6">
        <label className="flex w-fit items-center gap-2 self-end text-xs font-medium text-neutral-600">
          <input
            type="checkbox"
            checked={showDimensions}
            onChange={(e) => setShowDimensions(e.target.checked)}
            className="h-4 w-4 accent-rose-600"
          />
          Show measurement guides
        </label>
        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Front
            </p>
            <ShirtCanvas
              face="front"
              garment={pack.garment}
              zones={pack.zones}
              showDimensions={showDimensions}
              selectedZoneId={selectedZoneId}
              onSelectZone={(id) => {
                setSelectedZoneId(id);
                setSection('front');
              }}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Back
            </p>
            <ShirtCanvas
              face="back"
              garment={pack.garment}
              zones={pack.zones}
              showDimensions={showDimensions}
              selectedZoneId={selectedZoneId}
              onSelectZone={(id) => {
                setSelectedZoneId(id);
                setSection('back');
              }}
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
            <GarmentForm garment={pack.garment} onChange={(patch) => store.updateGarment(pack.id, patch)} />
          )}

          {(section === 'front' || section === 'back') && (
            <ZoneList
              face={section}
              zones={pack.zones}
              garment={pack.garment}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              onChangeZone={(id, patch) => store.updateZone(pack.id, id, patch)}
              onRemoveZone={(id) => {
                store.removeZone(pack.id, id);
                if (selectedZoneId === id) setSelectedZoneId(null);
              }}
              onMoveZone={(id, dir) => store.reorderZone(pack.id, id, dir)}
              onAddZone={(face) => setSelectedZoneId(store.addZone(pack.id, face))}
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
