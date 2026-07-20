export const COLLECTION_OPTIONS = [
  'Shy boy need kiss',
  'I love you more than your boyfriend',
] as const;

export type CollectionName = (typeof COLLECTION_OPTIONS)[number];

export function isCollectionName(value: string): value is CollectionName {
  return (COLLECTION_OPTIONS as readonly string[]).includes(value);
}
