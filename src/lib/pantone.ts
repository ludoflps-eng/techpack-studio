/**
 * Curated Pantone Solid Coated (C) reference -> approximate hex/name lookup.
 * This is NOT the official licensed Pantone library (proprietary, ~2,000+ colors) —
 * it's a best-effort subset of commonly used apparel/print references. Unrecognized
 * codes resolve to null so the UI can show a clear "not recognized" state instead of
 * guessing a wrong color.
 */
export interface PantoneSwatch {
  code: string;
  hex: string;
  name: string;
}

export interface PantoneCategory {
  category: string;
  swatches: PantoneSwatch[];
}

const PANTONE_CATEGORIES: PantoneCategory[] = [
  {
    category: 'Neutrals',
    swatches: [
      { code: 'BLACK C', hex: '#2d2926', name: 'Black' },
      { code: 'WHITE', hex: '#f2f2f2', name: 'White' },
      { code: 'COOL GRAY 1 C', hex: '#d9d9d6', name: 'Cool Gray 1' },
      { code: 'COOL GRAY 2 C', hex: '#d0d0ce', name: 'Cool Gray 2' },
      { code: 'COOL GRAY 3 C', hex: '#c8c9c7', name: 'Cool Gray 3' },
      { code: 'COOL GRAY 4 C', hex: '#bbbcbc', name: 'Cool Gray 4' },
      { code: 'COOL GRAY 5 C', hex: '#b1b3b3', name: 'Cool Gray 5' },
      { code: 'COOL GRAY 6 C', hex: '#a7a8aa', name: 'Cool Gray 6' },
      { code: 'COOL GRAY 7 C', hex: '#97999b', name: 'Cool Gray 7' },
      { code: 'COOL GRAY 8 C', hex: '#888b8d', name: 'Cool Gray 8' },
      { code: 'COOL GRAY 9 C', hex: '#75787b', name: 'Cool Gray 9' },
      { code: 'COOL GRAY 10 C', hex: '#6d6e71', name: 'Cool Gray 10' },
      { code: 'COOL GRAY 11 C', hex: '#53565a', name: 'Cool Gray 11' },
      { code: 'WARM GRAY 1 C', hex: '#d7d2cb', name: 'Warm Gray 1' },
      { code: 'WARM GRAY 4 C', hex: '#bfb8ad', name: 'Warm Gray 4' },
      { code: 'WARM GRAY 7 C', hex: '#a39485', name: 'Warm Gray 7' },
      { code: 'WARM GRAY 10 C', hex: '#8b7e74', name: 'Warm Gray 10' },
    ],
  },
  {
    category: 'Yellows',
    swatches: [
      { code: '100 C', hex: '#f7ea48', name: 'Yellow' },
      { code: '101 C', hex: '#f9e547', name: 'Yellow' },
      { code: '102 C', hex: '#fce300', name: 'Yellow' },
      { code: '108 C', hex: '#ffd100', name: 'Yellow' },
      { code: '109 C', hex: '#ffd100', name: 'Yellow' },
      { code: '116 C', hex: '#ffcd00', name: 'Golden Yellow' },
      { code: '123 C', hex: '#ffc72c', name: 'Golden Yellow' },
      { code: '130 C', hex: '#f2a900', name: 'Gold' },
      { code: '137 C', hex: '#ffa300', name: 'Orange Yellow' },
    ],
  },
  {
    category: 'Oranges',
    swatches: [
      { code: '151 C', hex: '#ff8200', name: 'Orange' },
      { code: '158 C', hex: '#e8632b', name: 'Orange' },
      { code: '165 C', hex: '#ff6720', name: 'Orange' },
      { code: '172 C', hex: '#fa4616', name: 'Red Orange' },
    ],
  },
  {
    category: 'Reds',
    swatches: [
      { code: '032 C', hex: '#ef3340', name: 'Red' },
      { code: '185 C', hex: '#e4002b', name: 'Red' },
      { code: '186 C', hex: '#c8102e', name: 'Red' },
      { code: '199 C', hex: '#d50032', name: 'Red' },
      { code: '200 C', hex: '#ba0c2f', name: 'Red' },
      { code: '202 C', hex: '#862633', name: 'Dark Red' },
    ],
  },
  {
    category: 'Pinks / magentas',
    swatches: [
      { code: '213 C', hex: '#e10098', name: 'Pink' },
      { code: '219 C', hex: '#d0006f', name: 'Pink' },
      { code: '226 C', hex: '#e3006d', name: 'Magenta' },
      { code: '233 C', hex: '#aa0061', name: 'Magenta' },
      { code: '240 C', hex: '#cb6ce6', name: 'Orchid' },
      { code: '812 C', hex: '#e8306a', name: 'Rose' },
    ],
  },
  {
    category: 'Purples / violets',
    swatches: [
      { code: '253 C', hex: '#9063cd', name: 'Purple' },
      { code: '259 C', hex: '#582c83', name: 'Purple' },
      { code: '266 C', hex: '#6e3fa3', name: 'Violet' },
      { code: '267 C', hex: '#663399', name: 'Violet' },
      { code: '2685 C', hex: '#34174a', name: 'Dark Violet' },
    ],
  },
  {
    category: 'Blues',
    swatches: [
      { code: '279 C', hex: '#418fde', name: 'Blue' },
      { code: '285 C', hex: '#0072ce', name: 'Blue' },
      { code: '286 C', hex: '#0032a0', name: 'Blue' },
      { code: '293 C', hex: '#001489', name: 'Blue' },
      { code: '300 C', hex: '#005eb8', name: 'Blue' },
      { code: '301 C', hex: '#00629b', name: 'Blue' },
      { code: '307 C', hex: '#005587', name: 'Blue' },
      { code: '072 C', hex: '#00205b', name: 'Navy' },
      { code: '3005 C', hex: '#0077c8', name: 'Blue' },
    ],
  },
  {
    category: 'Teals / cyans',
    swatches: [
      { code: '320 C', hex: '#00a3ad', name: 'Teal' },
      { code: '321 C', hex: '#00778b', name: 'Teal' },
      { code: '326 C', hex: '#00a99d', name: 'Teal' },
      { code: '335 C', hex: '#007a78', name: 'Teal' },
    ],
  },
  {
    category: 'Greens',
    swatches: [
      { code: '340 C', hex: '#009b77', name: 'Green' },
      { code: '347 C', hex: '#009a44', name: 'Green' },
      { code: '348 C', hex: '#00843d', name: 'Green' },
      { code: '355 C', hex: '#00b140', name: 'Green' },
      { code: '361 C', hex: '#43b02a', name: 'Green' },
      { code: '368 C', hex: '#78be20', name: 'Green' },
      { code: '376 C', hex: '#84bd00', name: 'Lime Green' },
      { code: '390 C', hex: '#c4d600', name: 'Lime' },
    ],
  },
  {
    category: 'Browns / tans / beige',
    swatches: [
      { code: '469 C', hex: '#7b3f00', name: 'Brown' },
      { code: '476 C', hex: '#4a3728', name: 'Dark Brown' },
      { code: '4625 C', hex: '#4a2e2a', name: 'Espresso' },
      { code: '7528 C', hex: '#dac9a4', name: 'Sand / Beige' },
      { code: '7530 C', hex: '#cabfa8', name: 'Stone' },
      { code: '7532 C', hex: '#ad9c8e', name: 'Taupe' },
    ],
  },
];

/** All curated Pantone swatches grouped by category, for UI pickers. */
export function pantoneCategories(): PantoneCategory[] {
  return PANTONE_CATEGORIES;
}

const PANTONE_TABLE: Record<string, { hex: string; name: string }> = Object.fromEntries(
  PANTONE_CATEGORIES.flatMap((cat) => cat.swatches.map((s) => [s.code, { hex: s.hex, name: s.name }]))
);

function normalizeRef(ref: string): string {
  return ref
    .trim()
    .toUpperCase()
    .replace(/^PANTONE\s*/, '')
    .replace(/\s+/g, ' ');
}

export interface PantoneMatch {
  hex: string;
  name: string;
}

/** Looks up a Pantone reference, tolerating case, extra spacing, and a missing " C" suffix. */
export function lookupPantone(reference: string): PantoneMatch | null {
  const normalized = normalizeRef(reference);
  if (!normalized) return null;

  if (PANTONE_TABLE[normalized]) return PANTONE_TABLE[normalized];

  const withSuffix = /\bC$/.test(normalized) ? normalized : `${normalized} C`;
  if (PANTONE_TABLE[withSuffix]) return PANTONE_TABLE[withSuffix];

  const withoutSuffix = normalized.replace(/\s*C$/, '');
  if (PANTONE_TABLE[withoutSuffix]) return PANTONE_TABLE[withoutSuffix];

  return null;
}
