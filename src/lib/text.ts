import type { TextCase } from '../types';

export function applyCase(text: string, textCase: TextCase): string {
  if (textCase === 'uppercase') return text.toUpperCase();
  if (textCase === 'lowercase') return text.toLowerCase();
  return text;
}

export function splitLines(content: string, textCase: TextCase): string[] {
  return content.split('\n').map((l) => applyCase(l, textCase));
}
