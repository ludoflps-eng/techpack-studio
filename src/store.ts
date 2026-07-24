import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Face, PrintZone, TechPack } from './types';
import { createTechPack, createZone } from './factories';
import { SIZE_CHART, type SizeLabel } from './lib/sizeChart';

interface StoreState {
  packs: TechPack[];
  activeId: string | null;

  createPack: () => string;
  duplicatePack: (id: string) => string;
  deletePack: (id: string) => void;
  setActive: (id: string | null) => void;
  updatePack: (id: string, patch: Partial<Omit<TechPack, 'id' | 'zones'>>) => void;
  updateGarment: (id: string, patch: Partial<TechPack['garment']>) => void;
  applySize: (id: string, size: SizeLabel) => void;
  importPack: (pack: TechPack) => string;

  addZone: (packId: string, face: Face) => string;
  updateZone: (packId: string, zoneId: string, patch: Partial<PrintZone>) => void;
  removeZone: (packId: string, zoneId: string) => void;
  reorderZone: (packId: string, zoneId: string, direction: -1 | 1) => void;

  addNote: (packId: string, note: string) => void;
  updateNote: (packId: string, index: number, note: string) => void;
  removeNote: (packId: string, index: number) => void;
}

function touch(pack: TechPack): TechPack {
  return { ...pack, updatedAt: Date.now() };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      packs: [],
      activeId: null,

      createPack: () => {
        const pack = createTechPack();
        set((s) => ({ packs: [...s.packs, pack], activeId: pack.id }));
        return pack.id;
      },

      duplicatePack: (id) => {
        const src = get().packs.find((p) => p.id === id);
        if (!src) return id;
        const copy: TechPack = {
          ...src,
          id: nanoid(8),
          styleName: `${src.styleName} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          zones: src.zones.map((z) => ({ ...z, id: nanoid(8) })),
        };
        set((s) => ({ packs: [...s.packs, copy], activeId: copy.id }));
        return copy.id;
      },

      deletePack: (id) => {
        set((s) => ({
          packs: s.packs.filter((p) => p.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        }));
      },

      setActive: (id) => set({ activeId: id }),

      updatePack: (id, patch) => {
        set((s) => ({
          packs: s.packs.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        }));
      },

      updateGarment: (id, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === id ? touch({ ...p, garment: { ...p.garment, ...patch } }) : p
          ),
        }));
      },

      applySize: (id, size) => {
        const { chestWidthCm, bodyLengthCm } = SIZE_CHART[size];
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === id
              ? touch({
                  ...p,
                  referenceSize: size,
                  garment: { ...p.garment, chestWidthCm, bodyLengthCm },
                })
              : p
          ),
        }));
      },

      importPack: (pack) => {
        // Assign fresh ids so importing a file twice (or a file that shares an id with an
        // existing pack) never collides with a pack already in this browser's storage.
        const now = Date.now();
        const imported: TechPack = {
          ...pack,
          id: nanoid(8),
          createdAt: now,
          updatedAt: now,
          zones: pack.zones.map((z) => ({ ...z, id: nanoid(8) })),
        };
        set((s) => ({ packs: [...s.packs, imported], activeId: imported.id }));
        return imported.id;
      },

      addZone: (packId, face) => {
        let newId = '';
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const count = p.zones.filter((z) => z.face === face).length;
            const zone = createZone(face, count);
            newId = zone.id;
            return touch({ ...p, zones: [...p.zones, zone] });
          }),
        }));
        return newId;
      },

      updateZone: (packId, zoneId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  zones: p.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)),
                })
          ),
        }));
      },

      removeZone: (packId, zoneId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId ? p : touch({ ...p, zones: p.zones.filter((z) => z.id !== zoneId) })
          ),
        }));
      },

      reorderZone: (packId, zoneId, direction) => {
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const zones = [...p.zones];
            const idx = zones.findIndex((z) => z.id === zoneId);
            if (idx < 0) return p;
            const face = zones[idx].face;
            // Find the nearest neighbor on the same face in the requested direction.
            let targetIdx = idx + direction;
            while (targetIdx >= 0 && targetIdx < zones.length && zones[targetIdx].face !== face) {
              targetIdx += direction;
            }
            if (targetIdx < 0 || targetIdx >= zones.length) return p;
            [zones[idx], zones[targetIdx]] = [zones[targetIdx], zones[idx]];
            return touch({ ...p, zones });
          }),
        }));
      },

      addNote: (packId, note) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId ? p : touch({ ...p, productionNotes: [...p.productionNotes, note] })
          ),
        }));
      },

      updateNote: (packId, index, note) => {
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const notes = [...p.productionNotes];
            notes[index] = note;
            return touch({ ...p, productionNotes: notes });
          }),
        }));
      },

      removeNote: (packId, index) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({ ...p, productionNotes: p.productionNotes.filter((_, i) => i !== index) })
          ),
        }));
      },
    }),
    {
      name: 'techpack-studio',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as StoreState;
        if (version < 1 && state?.packs) {
          state.packs = state.packs.map((p) =>
            p.styleName === 'Shy boy need kiss' ? { ...p, styleName: 'Shy boy needs a kiss' } : p
          );
        }
        return state;
      },
    }
  )
);
