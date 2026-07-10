import type { TechPack } from '../types';

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
        const data = JSON.parse(reader.result as string) as TechPack;
        if (!data.zones || !data.garment) throw new Error('Not a valid tech pack file');
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
