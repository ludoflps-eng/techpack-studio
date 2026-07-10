/** A curated apparel/print color palette used to auto-suggest a name for a picked hex. */
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Off-White / Natural', hex: '#f5f0e6' },
  { name: 'Cream', hex: '#fffdd0' },
  { name: 'Ivory', hex: '#fffff0' },
  { name: 'Beige', hex: '#e8dcc4' },
  { name: 'Sand / Khaki', hex: '#c2b280' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Stone', hex: '#c9c2a8' },
  { name: 'Light Grey', hex: '#d3d3d3' },
  { name: 'Heather Grey', hex: '#b5b5b5' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454f' },
  { name: 'Black', hex: '#111111' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Blue', hex: '#0047ab' },
  { name: 'Sky Blue', hex: '#87ceeb' },
  { name: 'Denim Blue', hex: '#1560bd' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Turquoise', hex: '#40e0d0' },
  { name: 'Mint', hex: '#98ff98' },
  { name: 'Forest Green', hex: '#228b22' },
  { name: 'Green', hex: '#008000' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Lime', hex: '#32cd32' },
  { name: 'Yellow', hex: '#ffeb3b' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Orange', hex: '#ffa500' },
  { name: 'Burnt Orange', hex: '#cc5500' },
  { name: 'Red', hex: '#e10600' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Pink', hex: '#ffc0cb' },
  { name: 'Rose', hex: '#e8306a' },
  { name: 'Fuchsia', hex: '#ff00ff' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Lavender', hex: '#e6e6fa' },
  { name: 'Brown', hex: '#964b00' },
  { name: 'Chocolate', hex: '#7b3f00' },
  { name: 'Coral', hex: '#ff7f50' },
];

/** French label aliases so PDF imports of French tech packs still resolve a swatch. */
const NAME_ALIASES: { pattern: RegExp; hex: string }[] = [
  { pattern: /sable|beige/i, hex: '#e8dcc4' },
  { pattern: /noir/i, hex: '#111111' },
  { pattern: /blanc/i, hex: '#ffffff' },
  { pattern: /rose/i, hex: '#e8306a' },
  { pattern: /rouge/i, hex: '#e10600' },
  { pattern: /bleu marine|marine/i, hex: '#000080' },
  { pattern: /bleu/i, hex: '#0047ab' },
  { pattern: /vert/i, hex: '#008000' },
  { pattern: /jaune/i, hex: '#ffeb3b' },
  { pattern: /gris/i, hex: '#808080' },
  { pattern: /marron/i, hex: '#964b00' },
  { pattern: /violet/i, hex: '#800080' },
];

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** Nearest named color for a hex string, or null if the hex is incomplete/invalid. */
export function nearestColorName(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;

  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const candidate of NAMED_COLORS) {
    const [cr, cg, cb] = parseHex(candidate.hex)!;
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best.name;
}

/** Best-effort reverse lookup: a color name/description -> an approximate swatch hex. */
export function hexForColorName(name: string): string | null {
  const clean = name.trim();
  if (!clean) return null;

  for (const alias of NAME_ALIASES) {
    if (alias.pattern.test(clean)) return alias.hex;
  }

  let best: string | null = null;
  let bestLen = 0;
  for (const candidate of NAMED_COLORS) {
    if (clean.toLowerCase().includes(candidate.name.toLowerCase()) && candidate.name.length > bestLen) {
      best = candidate.hex;
      bestLen = candidate.name.length;
    }
  }
  return best;
}
