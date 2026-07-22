export type Face = 'front' | 'back';

export type HAlign = 'center' | 'left' | 'right';

export type VAnchor = 'collar' | 'hem';

export type TextCase = 'none' | 'uppercase' | 'lowercase';

export type LineSpacing = 'normal' | 'tight';

export type PrintTechnique =
  | 'screen-print'
  | 'dtg'
  | 'embroidery'
  | 'vinyl'
  | 'sublimation'
  | 'puff'
  | 'other';

export const PRINT_TECHNIQUE_LABELS: Record<PrintTechnique, string> = {
  'screen-print': 'Screen print',
  dtg: 'DTG (direct-to-garment)',
  embroidery: 'Embroidery',
  vinyl: 'Heat transfer vinyl',
  sublimation: 'Sublimation',
  puff: 'Puff print',
  other: 'Other',
};

export interface PrintZone {
  id: string;
  face: Face;
  label: string;
  content: string;
  font: string;
  textCase: TextCase;
  lineSpacing: LineSpacing;
  stretchToFit: boolean;
  colorName: string;
  pantone: string;
  hex: string;
  widthCm: number;
  heightCm: number;
  anchorV: VAnchor;
  distanceVCm: number;
  /** Shows a dotted line on the canvas from the chosen anchor point to this zone's box. */
  showGuide: boolean;
  align: HAlign;
  /** Used when align is 'left' or 'right': distance in cm from that garment edge to the box edge. */
  edgeMarginCm: number;
  /** Used when align is 'center': horizontal offset in cm from the garment centerline (positive = right). */
  centerOffsetCm: number;
  technique: PrintTechnique;
  techniqueOther: string;
  symbolNote: string;
  notes: string;
}

export interface GarmentSpec {
  style: string;
  chestWidthCm: number;
  bodyLengthCm: number;
  fabricColorName: string;
  fabricPantone: string;
  fabricHex: string;
  fabricComposition: string;
}

export interface TechPack {
  id: string;
  createdAt: number;
  updatedAt: number;
  brand: string;
  styleName: string;
  styleCode: string;
  referenceSize: string;
  garment: GarmentSpec;
  zones: PrintZone[];
  productionNotes: string[];
}

export const FONT_OPTIONS: { value: string; label: string; cssFamily: string; weight: number }[] = [
  { value: 'big-shoulders', label: 'Big Shoulders Display — Extra Bold', cssFamily: "'Big Shoulders Display', sans-serif", weight: 800 },
  { value: 'alfa-slab', label: 'Alfa Slab One — Bold', cssFamily: "'Alfa Slab One', serif", weight: 400 },
  { value: 'bebas-neue', label: 'Bebas Neue (all caps only)', cssFamily: "'Bebas Neue', sans-serif", weight: 400 },
  { value: 'anton', label: 'Anton', cssFamily: "'Anton', sans-serif", weight: 400 },
  { value: 'archivo-black', label: 'Archivo Black', cssFamily: "'Archivo Black', sans-serif", weight: 400 },
  { value: 'oswald', label: 'Oswald — Bold', cssFamily: "'Oswald', sans-serif", weight: 700 },
];

export function fontCss(value: string) {
  return FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0];
}
