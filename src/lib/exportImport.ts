import { nanoid } from 'nanoid';
import type { FrontTextSpec, TechPack } from '../types';
import { createFrontTextDefaults } from '../factories';

function slug(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'tech-pack';
}

export function downloadTechPack(pack: TechPack) {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(pack.styleCode || pack.styleName)}.techpack.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readTechPackFile(file: File): Promise<TechPack> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as TechPack & { frontText?: FrontTextSpec };
        if (!data.zones || !data.garment) throw new Error('Not a valid tech pack file');
        // Back-compat: older exports had a single `frontText` object instead of a `frontTexts`
        // array, and even the array shape may predate a field added since. Normalize both.
        const legacySingle = data.frontText;
        delete data.frontText;
        const rawList = Array.isArray(data.frontTexts) ? data.frontTexts : legacySingle ? [legacySingle] : [];
        data.frontTexts = rawList.map((t) => ({ ...createFrontTextDefaults(), ...t, id: t.id ?? nanoid(8) }));
        const rawBackList = Array.isArray(data.backTexts) ? data.backTexts : [];
        data.backTexts = rawBackList.map((t) => ({ ...createFrontTextDefaults(), ...t, id: t.id ?? nanoid(8) }));
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
