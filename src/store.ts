import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Face, FrontTextSpec, PrintZone, TechPack } from './types';
import { createFrontTextDefaults, createFrontTextItem, createTechPack, createZone } from './factories';
import { SIZE_CHART, type SizeLabel } from './lib/sizeChart';
import { countLines } from './lib/text';

interface StoreState {
  packs: TechPack[];
  activeId: string | null;

  createPack: () => string;
  duplicatePack: (id: string) => string;
  deletePack: (id: string) => void;
  setActive: (id: string | null) => void;
  updatePack: (id: string, patch: Partial<Omit<TechPack, 'id' | 'zones'>>) => void;
  updateGarment: (id: string, patch: Partial<TechPack['garment']>) => void;
  addFrontText: (packId: string) => string;
  updateFrontText: (packId: string, textId: string, patch: Partial<FrontTextSpec>) => void;
  removeFrontText: (packId: string, textId: string) => void;
  addBackText: (packId: string) => string;
  updateBackText: (packId: string, textId: string, patch: Partial<FrontTextSpec>) => void;
  removeBackText: (packId: string, textId: string) => void;
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
          frontTexts: (src.frontTexts ?? []).map((t) => ({ ...t, id: nanoid(8) })),
          backTexts: (src.backTexts ?? []).map((t) => ({ ...t, id: nanoid(8) })),
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

      addFrontText: (packId) => {
        const item = createFrontTextItem();
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === packId ? touch({ ...p, frontTexts: [...p.frontTexts, item] }) : p
          ),
        }));
        return item.id;
      },

      updateFrontText: (packId, textId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  frontTexts: p.frontTexts.map((t) =>
                    t.id === textId ? { ...createFrontTextDefaults(), ...t, ...patch } : t
                  ),
                })
          ),
        }));
      },

      removeFrontText: (packId, textId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  frontTexts: p.frontTexts
                    .filter((t) => t.id !== textId)
                    // Any text anchored to the one being removed falls back to its own absolute
                    // position rather than pointing at a now-nonexistent target.
                    .map((t) => (t.anchorTextId === textId ? { ...t, anchorTextId: '' } : t)),
                })
          ),
        }));
      },

      addBackText: (packId) => {
        const item = createFrontTextItem();
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === packId ? touch({ ...p, backTexts: [...(p.backTexts ?? []), item] }) : p
          ),
        }));
        return item.id;
      },

      updateBackText: (packId, textId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  backTexts: (p.backTexts ?? []).map((t) =>
                    t.id === textId ? { ...createFrontTextDefaults(), ...t, ...patch } : t
                  ),
                })
          ),
        }));
      },

      removeBackText: (packId, textId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  backTexts: (p.backTexts ?? [])
                    .filter((t) => t.id !== textId)
                    .map((t) => (t.anchorTextId === textId ? { ...t, anchorTextId: '' } : t)),
                })
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
      version: 11,
      migrate: (persisted, version) => {
        // Legacy pack shapes vary release to release (frontText -> frontTexts, fields added to
        // items, etc.), so this whole function works loosely-typed rather than fighting the
        // current TechPack type at every step.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persisted as any;
        if (version < 1 && state?.packs) {
          state.packs = state.packs.map((p: any) =>
            p.styleName === 'Shy boy need kiss' ? { ...p, styleName: 'Shy boy needs a kiss' } : p
          );
        }
        if (version < 2 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            zones: p.zones.map((z: any) => (z.label === 'Main print' ? { ...z, label: 'Print 1' } : z)),
          }));
        }
        if (version < 3 && state?.packs) {
          // "Print height" is gone — box height is now exclusively derived from a per-line
          // "Text height" times the number of lines. Back-derive that text height from each
          // existing zone's current box height so it renders exactly as it did before.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            zones: p.zones.map((z: PrintZone & { textHeightCm?: number }) => ({
              ...z,
              textHeightCm: z.textHeightCm ?? z.heightCm / countLines(z.content),
            })),
          }));
        }
        if (version < 4 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontText: p.frontText ?? createFrontTextDefaults(),
          }));
        }
        if (version < 5 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontText: { ...createFrontTextDefaults(), ...p.frontText },
          }));
        }
        if (version < 6 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontText: { ...createFrontTextDefaults(), ...p.frontText },
          }));
        }
        if (version < 7 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontText: { ...createFrontTextDefaults(), ...p.frontText },
          }));
        }
        if (version < 8 && state?.packs) {
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontText: { ...createFrontTextDefaults(), ...p.frontText },
          }));
        }
        if (version < 9 && state?.packs) {
          // frontText (singular) -> frontTexts (array) — a pack can now have any number of front
          // texts. Wrap the old single object into a one-item array, backfilling any missing
          // fields and assigning it an id (older shape never had one).
          state.packs = state.packs.map((p: any) => {
            const { frontText, ...rest } = p;
            return {
              ...rest,
              frontTexts: [{ ...createFrontTextDefaults(), ...frontText, id: frontText?.id ?? nanoid(8) }],
            };
          });
        }
        if (version < 10 && state?.packs) {
          // Front texts can now anchor their position to another text in the same pack.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontTexts: p.frontTexts.map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
          }));
        }
        if (version < 11 && state?.packs) {
          // Back texts: same feature set as front texts, independent list per pack.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            backTexts: Array.isArray(p.backTexts)
              ? p.backTexts.map((t: any) => ({ ...createFrontTextDefaults(), ...t, id: t.id ?? nanoid(8) }))
              : [createFrontTextItem()],
          }));
        }
        return state;
      },
    }
  )
);
