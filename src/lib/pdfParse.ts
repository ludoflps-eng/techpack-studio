import type { Face, HAlign, PrintTechnique, TechPack, VAnchor } from '../types';
import { FONT_OPTIONS } from '../types';
import { createTechPack, createZone } from '../factories';
import { hexForColorName } from './colorNames';

export interface PdfParseResult {
  pack: TechPack;
  warnings: string[];
}

// ---- fuzzy matching helpers ------------------------------------------------------------------
// Stylized headings in real tech packs are often letter-spaced ("R É C A P I T U L A T I F"),
// and accents/case vary between documents. These helpers fold both away so a plain phrase like
// "recapitulatif" still matches, whether the source text is tight, spaced, or accented.

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function normalizePunctuation(s: string): string {
  return s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ');
}

function escapeRe(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fuzzyPhraseRegex(phrase: string, anchorStart = false): RegExp {
  const body = normalize(phrase)
    .split('')
    .map((c) => (c === ' ' ? '\\s+' : `${escapeRe(c)}\\s*`))
    .join('');
  return new RegExp((anchorStart ? '^\\s*' : '') + body);
}

function fuzzyIncludes(line: string, phrase: string): boolean {
  return fuzzyPhraseRegex(phrase).test(normalize(line));
}

function findFuzzyLineIndex(lines: string[], phrases: string[], from = 0): number {
  for (let i = from; i < lines.length; i++) {
    if (phrases.some((p) => fuzzyIncludes(lines[i], p))) return i;
  }
  return -1;
}

// ---- generic "label: value" extraction over a text blob ------------------------------------

/** Every label variant that can appear in a per-zone spec block, used as stop-boundaries. */
const ALL_ZONE_LABELS = [
  'content',
  'contenu',
  'ligne 1',
  'font',
  'police',
  'case',
  'casse',
  'line spacing',
  'espace entre les lignes',
  'stretch to fit',
  'ink color',
  "couleur d'encre",
  'print width',
  'largeur du print',
  'largeur',
  'print height',
  'hauteur du print',
  'hauteur totale',
  'position',
  'alignment',
  'alignement',
  'symbol note',
  'symbole',
  'technique',
  'notes',
  'number of inks',
  "nombre d'encres",
  'fabric composition',
  'type de tissu',
];

function extractAfterLabel(blob: string, labels: string[]): string | null {
  const lower = blob.toLowerCase();
  for (const label of labels) {
    const idx = lower.indexOf(label);
    if (idx === -1) continue;
    const rest = blob.slice(idx + label.length);
    let stopIdx = rest.length;
    const restLower = rest.toLowerCase();
    for (const stop of ALL_ZONE_LABELS) {
      if (stop === label) continue;
      const si = restLower.indexOf(stop);
      if (si !== -1 && si < stopIdx) stopIdx = si;
    }
    let value = rest.slice(0, stopIdx).trim();
    value = value.replace(/^[:\-–—"'\s]+/, '').replace(/["'\s\-–—]+$/, '');
    if (value) return value;
  }
  return null;
}

// ---- color field ("Rose — Pantone 812 C (#e8306a)" in either field order) ------------------

function parseColorField(raw: string): { colorName: string; pantone: string; hex: string | null } {
  let text = raw;
  const hexMatch = text.match(/#([0-9a-fA-F]{6})/);
  const hex = hexMatch ? `#${hexMatch[1].toLowerCase()}` : null;
  text = text.replace(/\(?#[0-9a-fA-F]{6}\)?/, '');

  const pantoneMatch = text.match(/pantone\s*([0-9a-zA-Z .]+)/i);
  const pantone = pantoneMatch ? pantoneMatch[1].trim().replace(/[—\-]\s*$/, '').trim() : '';
  if (pantoneMatch) text = text.replace(pantoneMatch[0], '');

  const colorName = text
    .split(',')[0]
    .replace(/[—\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { colorName, pantone, hex };
}

// ---- font / case / technique / line-spacing keyword matching -------------------------------

function matchFont(value: string | null): string {
  if (!value) return 'big-shoulders';
  const lower = value.toLowerCase();
  const found = FONT_OPTIONS.find((f) => lower.includes(f.label.split(' —')[0].toLowerCase()));
  return found?.value ?? 'big-shoulders';
}

function matchCase(value: string | null): 'none' | 'uppercase' | 'lowercase' {
  if (!value) return 'none';
  if (/majuscule|uppercase/i.test(value)) return 'uppercase';
  if (/minuscule|lowercase/i.test(value)) return 'lowercase';
  return 'none';
}

function matchLineSpacing(value: string | null): 'normal' | 'tight' {
  if (value && /resserr|tight|serr/i.test(value)) return 'tight';
  return 'normal';
}

function matchTechnique(value: string | null): { technique: PrintTechnique; techniqueOther: string } {
  if (!value) return { technique: 'serigraphy-both', techniqueOther: '' };
  if (/front\s*(?:&|and)\s*back|recto\s*(?:&|et)\s*verso/i.test(value)) {
    return { technique: 'serigraphy-both', techniqueOther: '' };
  }
  if (/s[ée]rigraph(?:ie|y)|screen.?print/i.test(value)) return { technique: 'screen-print', techniqueOther: '' };
  if (/\bdtg\b|direct.to.garment/i.test(value)) return { technique: 'dtg', techniqueOther: '' };
  if (/broderie|embroidery/i.test(value)) return { technique: 'embroidery', techniqueOther: '' };
  if (/vinyle?|flex|vinyl/i.test(value)) return { technique: 'vinyl', techniqueOther: '' };
  if (/sublimation/i.test(value)) return { technique: 'sublimation', techniqueOther: '' };
  if (/puff/i.test(value)) return { technique: 'puff', techniqueOther: '' };
  return { technique: 'other', techniqueOther: value };
}

// ---- header (style name / code / size) ------------------------------------------------------

function parseHeader(lines: string[]): { styleName: string; styleCode: string; referenceSize: string } {
  const styleName = lines.find((l) => l.trim().length > 1) ?? 'Imported style';

  // Stylized subtitles are often letter-spaced ("S B - 0 0 3") — collapse all whitespace in the
  // header block before hunting for a code pattern, since that never merges unrelated words in
  // a way that could spuriously match "LETTERS-DIGITS".
  const despacedHeader = lines
    .slice(0, 10)
    .map((l) => l.replace(/\s+/g, ''))
    .join('|');
  const codeMatch = despacedHeader.match(/([A-Z]{1,5}-\d{2,5})/);
  const styleCode = codeMatch ? codeMatch[1] : '';

  const blob = lines.slice(0, 10).join(' ');
  const sizeMatch =
    blob.match(/(?:reference size|taille de r[ée]f[ée]rence)\s*:?\s*(XXL|XL|[SML])\b/i) ??
    despacedHeader.match(/(?:referencesize|tailillederéférence|tailillederéf[ée]rence)\s*:?\s*(XXL|XL|[SML])\b/i);
  const referenceSize = sizeMatch ? sizeMatch[1].toUpperCase() : 'M';

  return { styleName: styleName.trim(), styleCode, referenceSize };
}

// ---- recap table (one row per zone: face, label, position, width, height, alignment) -------

interface ZoneSkeleton {
  face: Face;
  label: string;
  anchorV: VAnchor;
  distanceVCm: number;
  widthCm: number;
  heightCm: number;
  align: HAlign;
  edgeMarginCm: number;
  centerOffsetCm: number;
}

const ROW_RE =
  /^(front|back|recto|verso)\s+(.+?)\s+([\d.]+)\s*cm[^0-9]*?\b(collar|col|hem|bas|top of shirt)\b\s+([\d.]+)\s*cm\s+([\d.]+)\s*cm\s+(.+)$/i;

function parseRecapRows(lines: string[]): ZoneSkeleton[] {
  const skeletons: ZoneSkeleton[] = [];
  for (const line of lines) {
    const m = line.match(ROW_RE);
    if (!m) continue;
    const [, faceWord, label, distance, anchorWord, width, height, alignPhrase] = m;

    const face: Face = /back|verso/i.test(faceWord) ? 'back' : 'front';
    const anchorV: VAnchor = /hem|bas/i.test(anchorWord) ? 'hem' : 'collar';

    let align: HAlign = 'center';
    let edgeMarginCm = 3;
    let centerOffsetCm = 0;
    if (/gauche|left/i.test(alignPhrase)) {
      align = 'left';
      const marginMatch = alignPhrase.match(/([\d.]+)\s*cm/);
      if (marginMatch) edgeMarginCm = Number(marginMatch[1]);
    } else if (/droite|right/i.test(alignPhrase)) {
      align = 'right';
      const marginMatch = alignPhrase.match(/([\d.]+)\s*cm/);
      if (marginMatch) edgeMarginCm = Number(marginMatch[1]);
    } else {
      const offsetMatch = alignPhrase.match(/([\d.]+)\s*cm/);
      if (offsetMatch) centerOffsetCm = Number(offsetMatch[1]);
    }

    skeletons.push({
      face,
      label: label.trim(),
      anchorV,
      distanceVCm: Number(distance),
      widthCm: Number(width),
      heightCm: Number(height),
      align,
      edgeMarginCm,
      centerOffsetCm,
    });
  }
  return skeletons;
}

// ---- per-zone detail blocks ("02" section, split on each content-label occurrence) ---------

function splitZoneBlocks(text: string): string[] {
  const re = /\b(content|contenu|ligne\s*1)\b/gi;
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) indices.push(m.index);
  if (indices.length === 0) return [];
  return indices.map((start, i) => text.slice(start, i + 1 < indices.length ? indices[i + 1] : text.length));
}

function parseZoneContent(block: string): string {
  const disposition = extractAfterLabel(block, ['disposition']);
  if (disposition) {
    const afterColon = disposition.replace(/^\d+\s*lignes?\s*:?/i, '').trim();
    if (afterColon.includes('/')) {
      return afterColon
        .split('/')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
    }
  }
  const content = extractAfterLabel(block, ['content', 'contenu', 'ligne 1']) ?? '';
  if (content.includes(' / ')) {
    return content
      .split('/')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n');
  }
  return content;
}

// ---- sectioning -------------------------------------------------------------------------------

/** Splits spec-section lines into front/back groups, dropping the face-marker lines themselves
 *  (which — in stylized layouts — often carry the zone title too, e.g. "RECTO — SHY BOY™"). */
function splitByFace(lines: string[]): { front: string[]; back: string[] } {
  const front: string[] = [];
  const back: string[] = [];
  let current: Face = 'front';
  const frontRe = fuzzyPhraseRegex('front', true);
  const rectoRe = fuzzyPhraseRegex('recto', true);
  const backRe = fuzzyPhraseRegex('back', true);
  const versoRe = fuzzyPhraseRegex('verso', true);

  for (const line of lines) {
    const n = normalize(line);
    if (frontRe.test(n) || rectoRe.test(n)) {
      current = 'front';
      continue;
    }
    if (backRe.test(n) || versoRe.test(n)) {
      current = 'back';
      continue;
    }
    (current === 'front' ? front : back).push(line);
  }
  return { front, back };
}

// ---- main entry point --------------------------------------------------------------------------

export function parseTechPackFromLines(rawLines: string[]): PdfParseResult {
  const warnings: string[] = [];
  const cleanLines = rawLines.map((l) => normalizePunctuation(l.trim())).filter(Boolean);
  const fullBlob = cleanLines.join(' ');

  const { styleName, styleCode, referenceSize } = parseHeader(cleanLines);
  if (!styleCode) warnings.push('Could not detect a style code — check the field manually.');

  const pack = createTechPack(styleName);
  pack.styleCode = styleCode;
  pack.referenceSize = referenceSize;

  // Locate every major section marker up front (fuzzy — tolerates letter-spaced headings).
  const specIdx = findFuzzyLineIndex(cleanLines, ['technical specifications', 'specifications techniques']);
  const fabricIdx = findFuzzyLineIndex(cleanLines, [
    'colors, fabric & technique',
    'colors & fabric',
    'couleurs & tissu',
  ]);
  const notesIdx = findFuzzyLineIndex(cleanLines, ['production notes', 'notes de production']);
  const recapIdx = findFuzzyLineIndex(cleanLines, ['recapitulatif', 'recap']);

  /** Nearest of the other section markers that comes strictly after `from`, or the doc end. */
  function nextBoundaryAfter(from: number): number {
    const candidates = [specIdx, fabricIdx, notesIdx, recapIdx, cleanLines.length].filter(
      (i) => i === cleanLines.length || i > from
    );
    return Math.min(...candidates);
  }

  const specEndIdx = specIdx >= 0 ? nextBoundaryAfter(specIdx) : -1;

  // Fabric / colors section
  const fabricEndIdx = fabricIdx >= 0 ? nextBoundaryAfter(fabricIdx) : -1;
  const fabricBlob = fabricIdx >= 0 ? cleanLines.slice(fabricIdx, fabricEndIdx).join(' ') : fullBlob;
  const fabricColorRaw = extractAfterLabel(fabricBlob, ['fabric color', 'couleur du tissu']);
  if (fabricColorRaw) {
    const { colorName, pantone } = parseColorField(fabricColorRaw);
    pack.garment.fabricColorName = colorName || pack.garment.fabricColorName;
    pack.garment.fabricPantone = pantone;
    const guessedHex = hexForColorName(colorName);
    if (guessedHex) {
      pack.garment.fabricHex = guessedHex;
    } else {
      warnings.push('Could not guess a swatch for the fabric color — set it manually.');
    }
  } else {
    warnings.push('Could not detect fabric color — check the Garment & fabric tab.');
  }
  const compositionRaw = extractAfterLabel(fabricBlob, ['fabric composition', 'type de tissu']);
  if (compositionRaw) pack.garment.fabricComposition = compositionRaw;
  // Not extractAfterLabel: its generic stop-word list includes "technique" itself, which would
  // truncate a value like "Serigraphy technique to be used for both front & back..." right after
  // the first word. The fabric section is already bounded to end before the next section marker,
  // so it's safe to just take everything after the label to the end of this blob.
  const techniqueLabelIdx = fabricBlob.toLowerCase().indexOf('print technique');
  if (techniqueLabelIdx !== -1) {
    const garmentTechniqueRaw = fabricBlob
      .slice(techniqueLabelIdx + 'print technique'.length)
      .trim()
      .replace(/^[:\-–—"'\s]+/, '');
    if (garmentTechniqueRaw) {
      const { technique, techniqueOther } = matchTechnique(garmentTechniqueRaw);
      pack.garment.technique = technique;
      pack.garment.techniqueOther = techniqueOther;
    }
  }

  // Production notes section
  if (notesIdx >= 0) {
    const notesEnd = recapIdx >= 0 && recapIdx > notesIdx ? recapIdx : notesIdx + 8;
    pack.productionNotes = cleanLines
      .slice(notesIdx + 1, notesEnd)
      .filter((l) => l.length > 3 && !/single ink|une seule encre/i.test(l));
  }

  // Recap table -> zone skeletons (position/size/alignment)
  const skeletons = recapIdx >= 0 ? parseRecapRows(cleanLines.slice(recapIdx)) : [];
  if (skeletons.length === 0) {
    warnings.push('Could not find a recap table — print positions/sizes could not be detected automatically.');
  }

  // "02" section -> per-zone detail blocks (content, font, ink, technique...)
  const specLines = specIdx >= 0 && specEndIdx > specIdx ? cleanLines.slice(specIdx + 1, specEndIdx) : [];
  const { front: frontLines, back: backLines } = splitByFace(specLines);
  const frontBlocks = splitZoneBlocks(frontLines.join(' '));
  const backBlocks = splitZoneBlocks(backLines.join(' '));

  const frontSkeletons = skeletons.filter((s) => s.face === 'front');
  const backSkeletons = skeletons.filter((s) => s.face === 'back');

  function buildZones(faceSkeletons: ZoneSkeleton[], blocks: string[], face: Face) {
    const count = Math.max(faceSkeletons.length, blocks.length);
    for (let i = 0; i < count; i++) {
      const skeleton = faceSkeletons[i];
      const block = blocks[i] ?? '';
      const zone = createZone(face, pack.zones.filter((z) => z.face === face).length);

      if (skeleton) {
        zone.label = skeleton.label || zone.label;
        zone.anchorV = skeleton.anchorV;
        zone.distanceVCm = skeleton.distanceVCm;
        zone.widthCm = skeleton.widthCm;
        zone.heightCm = skeleton.heightCm;
        zone.align = skeleton.align;
        zone.edgeMarginCm = skeleton.edgeMarginCm;
        zone.centerOffsetCm = skeleton.centerOffsetCm;
      } else {
        warnings.push(`Could not detect placement for "${zone.label}" — using a default position, please adjust.`);
      }

      if (block) {
        const content = parseZoneContent(block);
        if (content) {
          zone.content = content;
          if (!skeleton) zone.label = content.split('\n')[0].slice(0, 30);
        } else {
          warnings.push(`Could not detect the print text for "${zone.label}".`);
        }

        zone.font = matchFont(extractAfterLabel(block, ['font', 'police']));
        zone.textCase = matchCase(extractAfterLabel(block, ['case', 'casse']));
        zone.lineSpacing = matchLineSpacing(extractAfterLabel(block, ['line spacing', 'espace entre les lignes']));
        const stretchRaw = extractAfterLabel(block, ['stretch to fit']);
        zone.stretchToFit = stretchRaw ? /yes|true/i.test(stretchRaw) : /[ée]tirer/i.test(block);

        const inkRaw = extractAfterLabel(block, ['ink color', "couleur d'encre"]);
        if (inkRaw) {
          const { colorName, pantone, hex } = parseColorField(inkRaw);
          zone.colorName = colorName || zone.colorName;
          zone.pantone = pantone;
          zone.hex = hex ?? hexForColorName(colorName) ?? zone.hex;
        } else {
          warnings.push(`Could not detect ink color for "${zone.label}".`);
        }

        const techniqueRaw = extractAfterLabel(block, ['technique']);
        if (techniqueRaw) {
          const { technique, techniqueOther } = matchTechnique(techniqueRaw);
          pack.garment.technique = technique;
          pack.garment.techniqueOther = techniqueOther;
        }

        zone.symbolNote = extractAfterLabel(block, ['symbol note', 'symbole']) ?? '';
        zone.notes = extractAfterLabel(block, ['notes']) ?? '';
      } else {
        warnings.push(`Could not detect print details for "${zone.label}" — content/font/ink left blank.`);
      }

      pack.zones.push(zone);
    }
  }

  buildZones(frontSkeletons, frontBlocks, 'front');
  buildZones(backSkeletons, backBlocks, 'back');

  if (pack.zones.length === 0) {
    warnings.push('No print zones could be detected in this PDF — add them manually.');
  }

  return { pack, warnings };
}
