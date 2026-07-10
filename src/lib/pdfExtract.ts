import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extracts text from a PDF as an array of reading-order lines. Text items are grouped by
 * y-position (page row) and sorted by x within each row, so table-like layouts ("LABEL value")
 * come out far more usable than a naive item-by-item join would produce.
 */
export async function extractPdfLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows: { y: number; items: { x: number; str: string }[] }[] = [];
    for (const raw of content.items) {
      const item = raw as { str?: string; transform: number[] };
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform[5];
      const x = item.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) <= 2);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str: item.str });
    }

    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const line = row.items
        .map((i) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}
