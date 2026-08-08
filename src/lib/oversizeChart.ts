export const OVERSIZE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export interface OversizeRow {
  point: string;
  /** English translation of the source grading table's French point description. */
  description: string;
  values: string[];
  toleranceCm: string;
}

/** "TBD" placeholder for a point the source grading table hasn't measured yet ("à compléter" in
 *  the original French — literally "to be completed"). */
const TBD = ['TBD', 'TBD', 'TBD', 'TBD', 'TBD', 'TBD'];

/** "Tee shirt oversize" measurement point chart (point letters A-Q), values in cm.
 *
 *  Values and descriptions sourced from the "TABLEAU DE GRADATION" reference (Uniqlo AIRism
 *  Cotton Oversized Crew Neck, flat measurements) — size M is the only size measured directly on
 *  the physical garment; every other size is calculated by standard grading from that M reference
 *  (see the legend rendered below the table). Tolerances are kept as previously set in this app
 *  (the source table itself specifies no per-point tolerance — see the legend's last line). */
export const OVERSIZE_CHART: OversizeRow[] = [
  { point: 'A', description: 'Total length', values: ['64', '66', '68', '70', '72', '74'], toleranceCm: '1' },
  { point: 'B', description: 'Chest width', values: ['43', '45,5', '48', '50,5', '53', '55,5'], toleranceCm: '0,5' },
  { point: 'C', description: 'Back width', values: TBD, toleranceCm: '0,5' },
  { point: 'D', description: 'Width below armhole', values: ['47', '49,5', '52', '54,5', '57', '59,5'], toleranceCm: '1' },
  { point: 'E', description: 'Mid-body width', values: ['47', '49,5', '52', '54,5', '57', '59,5'], toleranceCm: '1' },
  { point: 'F', description: 'Bottom hem width', values: ['47', '49,5', '52', '54,5', '57', '59,5'], toleranceCm: '1' },
  { point: 'G', description: 'Collar width', values: ['19', '19,5', '20', '20,5', '21', '21,5'], toleranceCm: '0,2' },
  { point: 'H', description: 'Front neck drop', values: ['6,9', '7,2', '7,5', '7,8', '8,1', '8,4'], toleranceCm: '0,2' },
  { point: 'I', description: 'Back neck drop', values: TBD, toleranceCm: '0,2' },
  { point: 'J', description: 'Collar band height', values: ['2', '2', '2', '2', '2', '2'], toleranceCm: '0,2' },
  { point: 'K', description: 'Shoulder length', values: ['15,4', '16,2', '17', '17,8', '18,6', '19,4'], toleranceCm: '0,2' },
  { point: 'L', description: 'Sleeve hem width', values: TBD, toleranceCm: '0' },
  { point: 'M', description: 'Sleeve length', values: ['21', '22', '23', '24', '25', '26'], toleranceCm: '0,5' },
  { point: 'N', description: 'Sleeve length (collar to cuff)', values: ['23', '24', '25', '26', '27', '28'], toleranceCm: '0,5' },
  { point: 'O', description: 'Armhole height', values: ['15,9', '16,7', '17,5', '18,3', '19,1', '19,9'], toleranceCm: '0,2' },
  { point: 'P', description: 'Hem band width', values: ['2', '2', '2', '2', '2', '2'], toleranceCm: '0' },
  { point: 'Q', description: 'Side seam length', values: TBD, toleranceCm: '0' },
];

/** English translation of the source grading table's legend (originally in French). */
export const OVERSIZE_CHART_LEGEND: string[] = [
  'Column M (highlighted): measurements provided by the user, taken from the physical garment. All other sizes are calculated by standard grading from this reference.',
  'Columns C, I, L, Q: measurements not provided — to be completed before sending to the factory.',
  'J and P (bands/finishings): kept constant across sizes, in line with standard practice for this type of detail.',
  'No tolerance: the measurements shown must be followed strictly, with no margin of error.',
];
