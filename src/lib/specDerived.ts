import { PRINT_TECHNIQUE_LABELS, type GarmentSpec, type PrintZone } from '../types';
import { zoneRect } from './geometry';

export function positionLabel(zone: PrintZone, garment: GarmentSpec): string {
  const rect = zoneRect(zone, garment);
  const anchor = zone.anchorV === 'collar' ? 'from collar' : 'from hem';
  const distance = zone.anchorV === 'collar' ? rect.y : garment.bodyLengthCm - (rect.y + rect.height);
  return `${distance.toFixed(1)} cm ${anchor}`;
}

export function alignmentLabel(zone: PrintZone, garment: GarmentSpec): string {
  const rect = zoneRect(zone, garment);
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

export function techniqueLabel(zone: PrintZone): string {
  return zone.technique === 'other' && zone.techniqueOther ? zone.techniqueOther : PRINT_TECHNIQUE_LABELS[zone.technique];
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
