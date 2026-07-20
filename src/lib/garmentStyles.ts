export const GARMENT_STYLE_OPTIONS = ['Tee shirt oversize'] as const;

export type GarmentStyle = (typeof GARMENT_STYLE_OPTIONS)[number];

export function isGarmentStyle(value: string): value is GarmentStyle {
  return (GARMENT_STYLE_OPTIONS as readonly string[]).includes(value);
}
