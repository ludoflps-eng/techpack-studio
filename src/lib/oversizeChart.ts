export const OVERSIZE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export interface OversizeRow {
  point: string;
  values: string[];
  toleranceCm: string;
}

/** "Tee shirt oversize" measurement point chart (point letters A-Q), values in cm. */
export const OVERSIZE_CHART: OversizeRow[] = [
  { point: 'A', values: ['74', '76', '78', '80', '82', '84'], toleranceCm: '1' },
  { point: 'B', values: ['50', '51', '52', '54', '56', '58'], toleranceCm: '0,5' },
  { point: 'C', values: ['51', '52', '53', '55', '57', '59'], toleranceCm: '0,5' },
  { point: 'D', values: ['52', '54', '56', '59', '62', '65'], toleranceCm: '1' },
  { point: 'E', values: ['52', '54', '56', '59', '62', '65'], toleranceCm: '1' },
  { point: 'F', values: ['52', '54', '56', '59', '62', '65'], toleranceCm: '1' },
  { point: 'G', values: ['19,5', '20', '20,5', '21', '21,5', '22'], toleranceCm: '0,2' },
  { point: 'H', values: ['7', '7,5', '8', '8,5', '9', '9,5'], toleranceCm: '0,2' },
  { point: 'I', values: ['2', '2', '2', '2', '2', '2'], toleranceCm: '0,2' },
  { point: 'J', values: ['2,5', '2,5', '2,5', '2,5', '2,5', '2,5'], toleranceCm: '0,2' },
  { point: 'K', values: ['18,5', '19', '19,5', '20', '20,5', '21'], toleranceCm: '0,2' },
  { point: 'L', values: ['4', '4', '4', '4', '4', '4'], toleranceCm: '0' },
  { point: 'M', values: ['23', '24', '25', '26', '27', '28'], toleranceCm: '0,5' },
  { point: 'N', values: ['23', '24', '25', '26', '27', '28'], toleranceCm: '0,5' },
  { point: 'O', values: ['20', '20,5', '21', '21,5', '22', '22,5'], toleranceCm: '0,2' },
  { point: 'P', values: ['2', '2', '2', '2', '2', '2'], toleranceCm: '0' },
  { point: 'Q', values: ['0,7', '0,7', '0,7', '0,7', '0,7', '0,7'], toleranceCm: '0' },
];
