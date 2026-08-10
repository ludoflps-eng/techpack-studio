export type Face = 'front' | 'back';

export type HAlign = 'center' | 'left' | 'right';

export type VAnchor = 'collar' | 'hem' | 'zone';

export type ZoneEdge = 'top' | 'bottom';

export type TextCase = 'none' | 'uppercase' | 'lowercase';

export type LineSpacing = 'normal' | 'tight';

export type PrintTechnique =
  | 'serigraphy-both'
  | 'screen-print'
  | 'dtg'
  | 'embroidery'
  | 'vinyl'
  | 'sublimation'
  | 'puff'
  | 'other';

export const PRINT_TECHNIQUE_LABELS: Record<PrintTechnique, string> = {
  'serigraphy-both': 'Serigraphy Front & Back',
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
  /** The actual rendered height of one line of letters, in cm — the value the user sets.
   *  `heightCm` (the print box height) is exclusively derived from this: textHeightCm times the
   *  number of lines in `content`, kept in sync whenever either changes. It is never edited
   *  directly. */
  textHeightCm: number;
  heightCm: number;
  anchorV: VAnchor;
  distanceVCm: number;
  /** When anchorV is 'zone', the id of the print zone this one is positioned relative to. */
  anchorZoneId: string;
  /** When anchorV is 'zone', which edge of the target zone distanceVCm is measured from — this
   *  zone's top sits `distanceVCm` below that edge (negative moves it above instead). */
  anchorZoneEdge: ZoneEdge;
  /** Shows a dotted line on the canvas from the chosen anchor point to this zone's box. */
  showGuide: boolean;
  /** Shows a tiny dot at the geometric center of this zone's box. */
  showCenterDot: boolean;
  /** When true, the box is auto-positioned so its center coincides with guide A's midpoint,
   *  and distanceVCm is derived rather than user-editable. */
  centerBox: boolean;
  align: HAlign;
  /** Used when align is 'left' or 'right': distance in cm from that garment edge to the box edge. */
  edgeMarginCm: number;
  /** Used when align is 'center': horizontal offset in cm from the garment centerline (positive = right). */
  centerOffsetCm: number;
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
  /** Print technique used for the whole tech pack — a garment-level spec, not per-zone. */
  technique: PrintTechnique;
  techniqueOther: string;
  /** Shows a 5cm-spaced horizontal ruler grid over each garment canvas, row 1 at guide A's
   *  bottom (the hem reference), numbered upward from there. */
  gridLinesEnabled: boolean;
}

/** Simple text placed on the front tee shirt — no bounding box, no width-fit, just content,
 *  letter height, and a position given as a (grid-circle cm, grid-triangle cm) coordinate. The
 *  bottom-left corner of the first line's letters lands exactly on that point. A pack can have
 *  any number of these, each positioned independently. */
export interface FrontTextSpec {
  id: string;
  content: string;
  textHeightCm: number;
  /** cm value of the horizontal grid line (numbered circle) the text's bottom edge sits on. */
  circleCm: number;
  /** cm value of the vertical grid line (numbered triangle) the text's left edge sits on. */
  triangleCm: number;
  /** When true, draws 4 fine red lines flush against the text's actual rendered ink (top,
   *  bottom, left, right) plus width/height measurements — a diagnostic overlay to cross-check
   *  the text's real on-shirt size, not a layout constraint. */
  showLimits: boolean;
  /** How the content is capitalized on render — 'none' prints it exactly as typed. */
  textCase: TextCase;
  /** One of FONT_OPTIONS' `value`s — defaults to 'impact'. */
  font: string;
  /** Ink color name, Pantone reference, and resolved hex — same Pantone-lookup pattern as the
   *  garment's fabric color. */
  textColorName: string;
  textPantone: string;
  textHex: string;
  /** When set to another front text's id (within the same pack), this text's position is
   *  computed relative to that text's own (resolved) position instead of using circleCm/
   *  triangleCm directly — so moving the anchor target carries this text along with it. Empty
   *  string means "position absolutely", using circleCm/triangleCm as-is. */
  anchorTextId: string;
  /** cm this text sits away from its anchor target along the circle axis — negative moves it
   *  below, positive moves it above. Only used when anchorTextId is set. */
  anchorBelowCm: number;
  /** cm this text sits to the right of its anchor target, along the triangle axis (negative =
   *  left). Only used when anchorTextId is set. */
  anchorRightCm: number;
  /** When true, the text's horizontal (triangle-axis) position is computed automatically so its
   *  print box sits centered on guide A (the garment's vertical centerline) instead of using
   *  triangleCm/anchorRightCm — recomputed live from the text's actual width, so it stays
   *  centered as content, font, size, or case change. Vertical (circle-axis) position is
   *  unaffected and still works normally, including anchoring. */
  centerHorizontally: boolean;
  /** When true, renders at a bold weight (700) regardless of the chosen font's own base weight. */
  bold: boolean;
  /** When true, renders slanted (italic, or a synthesized oblique slant for fonts with no italic
   *  variant of their own). */
  italic: boolean;
  /** When true, draws a line under the text. */
  underline: boolean;
  /** Stacking order relative to every OTHER text/picture on the same face — higher renders on
   *  top. Compared across frontTexts and frontLogos together (or backTexts/backLogos), so "bring
   *  to front"/"send to back" can reorder a text above or below a picture, not just other texts. */
  layerOrder: number;
  /** Rotation in degrees (clockwise positive), applied around this text's own reference point —
   *  the same (circle, triangle) point its position is set from — so rotating never moves that
   *  point, only spins the text around it. */
  rotationDeg: number;
}

/** A picture/logo placed on the front or back of the shirt — background already removed (a
 *  transparent PNG data URL), positioned by a single reference point rather than a bounding-box
 *  corner: `crossXPercent`/`crossYPercent` mark where, WITHIN the image itself, that reference
 *  point sits (0-1 each way), and `circleCm`/`triangleCm` place that same point on the garment —
 *  the same (circle, triangle) coordinate system front/back text already uses. That reference
 *  point is drawn on the canvas as a small blue dot (matching the spec sheet's "Reference point
 *  to position text" legend), so it's visible where the image is actually anchored, not just
 *  where its corner happens to fall. */
export interface LogoSpec {
  id: string;
  /** Background-removed image, as a data URL (PNG, with transparency) — stored inline since the
   *  app is local-first with no backend of its own. */
  imageDataUrl: string;
  /** The stored image's own pixel dimensions — used to keep the aspect ratio locked when sizing
   *  it on the garment via widthCm alone. */
  naturalWidthPx: number;
  naturalHeightPx: number;
  /** Rendered width in cm; height is always derived from this via the natural aspect ratio, so
   *  the image can never be stretched out of proportion. */
  widthCm: number;
  /** Where the reference point (the blue dot) sits within the image, as a 0-1 fraction of its
   *  width/height — (0,0) is the image's top-left corner, (0.5, 0.5) its center. */
  crossXPercent: number;
  crossYPercent: number;
  /** cm value of the horizontal grid line (numbered circle) the reference point sits on — same
   *  convention as front/back text. */
  circleCm: number;
  /** cm value of the vertical grid line (numbered triangle) the reference point sits on — same
   *  convention as front/back text. */
  triangleCm: number;
  /** Stacking order relative to every OTHER text/picture on the same face — higher renders on
   *  top. Compared across frontTexts and frontLogos together (or backTexts/backLogos), so "bring
   *  to front"/"send to back" can reorder a picture above or below a text, not just other
   *  pictures. */
  layerOrder: number;
  /** Rotation in degrees (clockwise positive), applied around this picture's own reference point
   *  (the blue dot) — so rotating never moves that point, only spins the image around it. */
  rotationDeg: number;
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
  frontTexts: FrontTextSpec[];
  backTexts: FrontTextSpec[];
  frontLogos: LogoSpec[];
  backLogos: LogoSpec[];
}

export const FONT_OPTIONS: { value: string; label: string; cssFamily: string; weight: number }[] = [
  { value: 'impact', label: 'Impact', cssFamily: "Impact, Haettenschweiler, 'Franklin Gothic Bold', sans-serif", weight: 400 },
  { value: 'georgia', label: 'Georgia', cssFamily: "Georgia, 'Times New Roman', serif", weight: 400 },
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
