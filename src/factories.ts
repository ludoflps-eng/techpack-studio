import { nanoid } from 'nanoid';
import type { Face, GarmentSpec, PrintZone, TechPack } from './types';
import { SIZE_CHART } from './lib/sizeChart';

export function createGarmentDefaults(): GarmentSpec {
  return {
    ...SIZE_CHART.M,
    fabricColorName: 'White',
    fabricPantone: '',
    fabricHex: '#f5f5f0',
    fabricComposition: '100% cotton, 180gsm',
  };
}

export function createZone(face: Face, order: number): PrintZone {
  return {
    id: nanoid(8),
    face,
    label: order === 0 ? 'Main print' : `Print ${order + 1}`,
    content: 'YOUR TEXT',
    font: 'big-shoulders',
    textCase: 'uppercase',
    lineSpacing: 'normal',
    stretchToFit: false,
    colorName: 'Black',
    pantone: '',
    hex: '#111111',
    widthCm: 30,
    heightCm: 10,
    anchorV: 'collar',
    distanceVCm: 14,
    align: 'center',
    edgeMarginCm: 3,
    centerOffsetCm: 0,
    technique: 'screen-print',
    techniqueOther: '',
    symbolNote: '',
    notes: '',
  };
}

export function createTechPack(name = 'Collection'): TechPack {
  const now = Date.now();
  return {
    id: nanoid(8),
    createdAt: now,
    updatedAt: now,
    brand: '',
    styleName: name,
    styleCode: '',
    referenceSize: 'M',
    garment: createGarmentDefaults(),
    zones: [],
    productionNotes: [],
  };
}
