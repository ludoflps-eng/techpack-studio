import { nanoid } from 'nanoid';
import type { Face, FrontTextSpec, GarmentSpec, PrintZone, TechPack } from './types';
import { SIZE_CHART } from './lib/sizeChart';
import { GARMENT_STYLE_OPTIONS } from './lib/garmentStyles';
import { deriveZoneHeight } from './lib/text';

export function createGarmentDefaults(): GarmentSpec {
  return {
    style: GARMENT_STYLE_OPTIONS[0],
    ...SIZE_CHART.M,
    fabricColorName: 'White',
    fabricPantone: '',
    fabricHex: '#f5f5f0',
    fabricComposition: '100% cotton, 280gsm',
    technique: 'serigraphy-both',
    techniqueOther: '',
    gridLinesEnabled: false,
  };
}

export function createZone(face: Face, order: number): PrintZone {
  const content = 'YOUR TEXT';
  const textHeightCm = 10;
  return {
    id: nanoid(8),
    face,
    label: `Print ${order + 1}`,
    content,
    font: 'impact',
    textCase: 'uppercase',
    lineSpacing: 'normal',
    stretchToFit: false,
    colorName: 'Black',
    pantone: '',
    hex: '#111111',
    widthCm: 30,
    textHeightCm,
    heightCm: deriveZoneHeight(content, textHeightCm),
    anchorV: 'collar',
    distanceVCm: 14,
    anchorZoneId: '',
    anchorZoneEdge: 'bottom',
    showGuide: false,
    showCenterDot: false,
    centerBox: false,
    align: 'center',
    edgeMarginCm: 3,
    centerOffsetCm: 0,
    symbolNote: '',
    notes: '',
  };
}

/** Field defaults for a front-text item, deliberately without an `id` — used both to create a
 *  fresh item (via createFrontTextItem) and to backfill any missing fields on an existing item
 *  (spread over the stored object, whose own id always wins). */
export function createFrontTextDefaults(): Omit<FrontTextSpec, 'id'> {
  return {
    content: '',
    textHeightCm: 5,
    circleCm: 40,
    triangleCm: 20,
    showLimits: false,
    textCase: 'none',
    font: 'impact',
    textColorName: 'Black',
    textPantone: '',
    textHex: '#111111',
    anchorTextId: '',
    anchorBelowCm: 0,
    anchorRightCm: 0,
    centerHorizontally: false,
  };
}

export function createFrontTextItem(): FrontTextSpec {
  return { id: nanoid(8), ...createFrontTextDefaults() };
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
    frontTexts: [createFrontTextItem()],
    backTexts: [createFrontTextItem()],
  };
}
