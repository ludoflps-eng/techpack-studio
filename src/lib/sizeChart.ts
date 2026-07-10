export const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type SizeLabel = (typeof SIZE_OPTIONS)[number];

/** Generic unisex crew-tee flat measurements (cm) — a reasonable starting point per size, editable after. */
export const SIZE_CHART: Record<SizeLabel, { chestWidthCm: number; bodyLengthCm: number }> = {
  S: { chestWidthCm: 46, bodyLengthCm: 66 },
  M: { chestWidthCm: 51, bodyLengthCm: 69 },
  L: { chestWidthCm: 56, bodyLengthCm: 72 },
  XL: { chestWidthCm: 61, bodyLengthCm: 75 },
  XXL: { chestWidthCm: 66, bodyLengthCm: 78 },
};

export function isSizeLabel(value: string): value is SizeLabel {
  return (SIZE_OPTIONS as readonly string[]).includes(value);
}
