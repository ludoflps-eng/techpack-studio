import type { TextCase } from '../types';

export function applyCase(text: string, textCase: TextCase): string {
  if (textCase === 'uppercase') return text.toUpperCase();
  if (textCase === 'lowercase') return text.toLowerCase();
  return text;
}

export function splitLines(content: string, textCase: TextCase): string[] {
  return content.split('\n').map((l) => applyCase(l, textCase));
}

/** Zone label auto-derived from its print content — the first non-empty line, trimmed. */
export function deriveZoneLabel(content: string): string {
  return content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? '';
}

export function countLines(content: string): number {
  return content.split('\n').length;
}

/** The print zone's box height: exclusively derived from the requested per-line text height
 *  times how many lines the content has. */
export function deriveZoneHeight(content: string, textHeightCm: number): number {
  return countLines(content) * textHeightCm;
}
