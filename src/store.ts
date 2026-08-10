import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Face, FrontTextSpec, LogoSpec, PrintZone, TechPack } from './types';
import {
  createFrontTextDefaults,
  createFrontTextItem,
  createLogoDefaults,
  createLogoItem,
  createTechPack,
  createZone,
} from './factories';
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
  addFrontLogo: (packId: string, image: { imageDataUrl: string; naturalWidthPx: number; naturalHeightPx: number }) => string;
  updateFrontLogo: (packId: string, logoId: string, patch: Partial<LogoSpec>) => void;
  removeFrontLogo: (packId: string, logoId: string) => void;
  addBackLogo: (packId: string, image: { imageDataUrl: string; naturalWidthPx: number; naturalHeightPx: number }) => string;
  updateBackLogo: (packId: string, logoId: string, patch: Partial<LogoSpec>) => void;
  removeBackLogo: (packId: string, logoId: string) => void;
  /** Moves a front/back text or picture above everything else on the same face (both kinds
   *  compared together), so overlapping items can be reordered regardless of type. */
  bringLayerToFront: (packId: string, face: Face, kind: 'text' | 'logo', itemId: string) => void;
  sendLayerToBack: (packId: string, face: Face, kind: 'text' | 'logo', itemId: string) => void;
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

/** The layerOrder one above everything currently on this face (texts and pictures compared
 *  together) — assigned to a freshly added text/picture so it starts out on top, matching how a
 *  newly added item has always visually landed above the rest. */
function nextTopLayerOrder(pack: TechPack, face: Face): number {
  const texts = face === 'front' ? (pack.frontTexts ?? []) : (pack.backTexts ?? []);
  const logos = face === 'front' ? (pack.frontLogos ?? []) : (pack.backLogos ?? []);
  const orders = [...texts, ...logos].map((x) => x.layerOrder ?? 0);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

/** Reassigns one text/picture's layerOrder to sit above (toFront) or below (!toFront) every
 *  OTHER text/picture on the same face — texts and pictures are compared together, so this can
 *  move a text above a picture or vice versa, not just reorder within its own type. */
function withReorderedLayer(
  pack: TechPack,
  face: Face,
  kind: 'text' | 'logo',
  itemId: string,
  toFront: boolean
): TechPack {
  const texts = face === 'front' ? (pack.frontTexts ?? []) : (pack.backTexts ?? []);
  const logos = face === 'front' ? (pack.frontLogos ?? []) : (pack.backLogos ?? []);
  const orders = [...texts, ...logos].map((x) => x.layerOrder ?? 0);
  const newOrder = orders.length === 0 ? 0 : toFront ? Math.max(...orders) + 1 : Math.min(...orders) - 1;
  if (kind === 'text') {
    const updated = texts.map((t) => (t.id === itemId ? { ...t, layerOrder: newOrder } : t));
    return face === 'front' ? { ...pack, frontTexts: updated } : { ...pack, backTexts: updated };
  }
  const updated = logos.map((l) => (l.id === itemId ? { ...l, layerOrder: newOrder } : l));
  return face === 'front' ? { ...pack, frontLogos: updated } : { ...pack, backLogos: updated };
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
          frontLogos: (src.frontLogos ?? []).map((l) => ({ ...l, id: nanoid(8) })),
          backLogos: (src.backLogos ?? []).map((l) => ({ ...l, id: nanoid(8) })),
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
        let newId = '';
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const item = { ...createFrontTextItem(), layerOrder: nextTopLayerOrder(p, 'front') };
            newId = item.id;
            return touch({ ...p, frontTexts: [...p.frontTexts, item] });
          }),
        }));
        return newId;
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
        let newId = '';
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const item = { ...createFrontTextItem(), layerOrder: nextTopLayerOrder(p, 'back') };
            newId = item.id;
            return touch({ ...p, backTexts: [...(p.backTexts ?? []), item] });
          }),
        }));
        return newId;
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

      addFrontLogo: (packId, image) => {
        let newId = '';
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const item = { ...createLogoItem(image), layerOrder: nextTopLayerOrder(p, 'front') };
            newId = item.id;
            return touch({ ...p, frontLogos: [...(p.frontLogos ?? []), item] });
          }),
        }));
        return newId;
      },

      updateFrontLogo: (packId, logoId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  frontLogos: (p.frontLogos ?? []).map((l) =>
                    l.id === logoId ? { ...createLogoDefaults(), ...l, ...patch } : l
                  ),
                })
          ),
        }));
      },

      removeFrontLogo: (packId, logoId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({ ...p, frontLogos: (p.frontLogos ?? []).filter((l) => l.id !== logoId) })
          ),
        }));
      },

      addBackLogo: (packId, image) => {
        let newId = '';
        set((s) => ({
          packs: s.packs.map((p) => {
            if (p.id !== packId) return p;
            const item = { ...createLogoItem(image), layerOrder: nextTopLayerOrder(p, 'back') };
            newId = item.id;
            return touch({ ...p, backLogos: [...(p.backLogos ?? []), item] });
          }),
        }));
        return newId;
      },

      updateBackLogo: (packId, logoId, patch) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({
                  ...p,
                  backLogos: (p.backLogos ?? []).map((l) =>
                    l.id === logoId ? { ...createLogoDefaults(), ...l, ...patch } : l
                  ),
                })
          ),
        }));
      },

      removeBackLogo: (packId, logoId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id !== packId
              ? p
              : touch({ ...p, backLogos: (p.backLogos ?? []).filter((l) => l.id !== logoId) })
          ),
        }));
      },

      bringLayerToFront: (packId, face, kind, itemId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === packId ? touch(withReorderedLayer(p, face, kind, itemId, true)) : p
          ),
        }));
      },

      sendLayerToBack: (packId, face, kind, itemId) => {
        set((s) => ({
          packs: s.packs.map((p) =>
            p.id === packId ? touch(withReorderedLayer(p, face, kind, itemId, false)) : p
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
      version: 16,
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
        if (version < 12 && state?.packs) {
          // Front/back texts can now auto-center horizontally on guide A.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontTexts: (p.frontTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
            backTexts: (p.backTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
          }));
        }
        if (version < 13 && state?.packs) {
          // Front/back texts can now be bold, italic, and/or underlined.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontTexts: (p.frontTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
            backTexts: (p.backTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
          }));
        }
        if (version < 14 && state?.packs) {
          // Packs can now have front/back logos (pictures with their background removed).
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontLogos: Array.isArray(p.frontLogos)
              ? p.frontLogos.map((l: any) => ({ ...createLogoDefaults(), ...l }))
              : [],
            backLogos: Array.isArray(p.backLogos)
              ? p.backLogos.map((l: any) => ({ ...createLogoDefaults(), ...l }))
              : [],
          }));
        }
        if (version < 15 && state?.packs) {
          // Texts and pictures can now be reordered ("bring to front"/"send to back") relative
          // to each other. Backfill layerOrder from each item's current array position — texts
          // first, then pictures — so nothing visually reshuffles on this migration: pictures
          // already rendered on top of texts before this feature existed, and this preserves
          // that exact stacking as the starting point.
          const withLayerOrder = <T extends { layerOrder?: number }>(items: T[], startAt: number): T[] =>
            items.map((item, i) => ({ ...item, layerOrder: item.layerOrder ?? startAt + i }));
          state.packs = state.packs.map((p: any) => {
            const frontTexts = withLayerOrder(p.frontTexts ?? [], 0);
            const backTexts = withLayerOrder(p.backTexts ?? [], 0);
            return {
              ...p,
              frontTexts,
              backTexts,
              frontLogos: withLayerOrder(p.frontLogos ?? [], frontTexts.length),
              backLogos: withLayerOrder(p.backLogos ?? [], backTexts.length),
            };
          });
        }
        if (version < 16 && state?.packs) {
          // Texts and pictures can now be rotated around their own reference point.
          state.packs = state.packs.map((p: any) => ({
            ...p,
            frontTexts: (p.frontTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
            backTexts: (p.backTexts ?? []).map((t: any) => ({ ...createFrontTextDefaults(), ...t })),
            frontLogos: (p.frontLogos ?? []).map((l: any) => ({ ...createLogoDefaults(), ...l })),
            backLogos: (p.backLogos ?? []).map((l: any) => ({ ...createLogoDefaults(), ...l })),
          }));
        }
        return state;
      },
    }
  )
);
