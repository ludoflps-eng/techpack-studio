import { PRINT_TECHNIQUE_LABELS, type GarmentSpec, type PrintZone } from '../types';
import { zoneRect } from './geometry';
import { guideABottomLocalY, guideATopLocalY } from './measurementGuides';

export function positionLabel(zone: PrintZone, garment: GarmentSpec, referenceSize: string): string {
  const rect = zoneRect(zone, garment, referenceSize);
  const anchor = zone.anchorV === 'collar' ? 'from top of shirt' : 'from hem';
  const distance =
    zone.anchorV === 'collar'
      ? rect.y - guideATopLocalY(zone.face, garment.chestWidthCm)
      : guideABottomLocalY(zone.face, garment.chestWidthCm, referenceSize) - (rect.y + rect.height);
  return `${distance.toFixed(1)} cm ${anchor}`;
}

export function alignmentLabel(zone: PrintZone, garment: GarmentSpec, referenceSize: string): string {
  const rect = zoneRect(zone, garment, referenceSize);
  const halfChest = garment.chestWidthCm / 2;
  if (zone.align === 'center') {
    const offset = rect.x + rect.width / 2;
    return Math.abs(offset) > 0.05 ? `Centered, offset ${offset.toFixed(1)} cm` : 'Centered';
  }
  if (zone.align === 'left') {
    return `Aligned left, ${(rect.x - -halfChest).toFixed(1)} cm margin`;
  }
  return `Aligned right, ${(halfChest - (rect.x + rect.width)).toFixed(1)} cm margin`;
}

/** The garment-level print technique, phrased for the spec sheet — "Serigraphy Front & Back" gets
 *  a sentence spelling out that it covers both faces, since it's the one technique that isn't
 *  self-evidently per-zone. */
export function techniqueLabel(garment: GarmentSpec): string {
  if (garment.technique === 'serigraphy-both') {
    return 'Serigraphy technique to be used for both front & back of the tee shirt';
  }
  return garment.technique === 'other' && garment.techniqueOther
    ? garment.techniqueOther
    : PRINT_TECHNIQUE_LABELS[garment.technique];
}

export interface InkSummary {
  hex: string;
  pantone: string;
  colorName: string;
}

export function uniqueInks(zones: PrintZone[]): InkSummary[] {
  const seen = new Map<string, InkSummary>();
  for (const z of zones) {
    const key = `${z.hex}|${z.pantone}`;
    if (!seen.has(key)) seen.set(key, { hex: z.hex, pantone: z.pantone, colorName: z.colorName });
  }
  return [...seen.values()];
}
