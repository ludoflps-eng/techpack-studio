import { useRef, useState } from 'react';
import { useStore } from '../store';
import { readTechPackFile } from '../lib/exportImport';
import { extractPdfLines } from '../lib/pdfExtract';
import { parseTechPackFromLines } from '../lib/pdfParse';

export function Home() {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [importingPdf, setImportingPdf] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Tech Pack Studio</h1>
            <p className="text-sm text-neutral-500">Design your t-shirt graphic tech packs.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const pack = await readTechPackFile(file);
                  store.importPack(pack);
                } catch {
                  alert('Could not read this file — is it a tech pack JSON export?');
                }
                e.target.value = '';
              }}
            />
            <button
              onClick={() => pdfRef.current?.click()}
              disabled={importingPdf}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              {importingPdf ? 'Reading PDF…' : 'Import PDF'}
            </button>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportingPdf(true);
                try {
                  const lines = await extractPdfLines(file);
                  const { pack, warnings } = parseTechPackFromLines(lines);
                  store.importPack(pack);
                  if (warnings.length > 0) {
                    alert(
                      `Imported from PDF — some fields need review:\n\n${warnings.map((w) => `• ${w}`).join('\n')}`
                    );
                  }
                } catch (err) {
                  console.error(err);
                  alert('Could not read this PDF. It may be scanned/image-based rather than text, or an unsupported layout.');
                } finally {
                  setImportingPdf(false);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => store.createPack()}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              + New tech pack
            </button>
          </div>
        </div>

        {store.packs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center text-neutral-400">
            No tech packs yet. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...store.packs]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((pack) => (
                <div
                  key={pack.id}
                  className="group rounded-xl border border-neutral-200 bg-white p-4 hover:border-rose-300"
                >
                  <button className="block w-full text-left" onClick={() => store.setActive(pack.id)}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded border border-neutral-200"
                        style={{ background: pack.garment.fabricHex }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-900">
                          {pack.styleName || 'Untitled style'}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {pack.styleCode || '—'} · Size {pack.referenceSize} · {pack.zones.length} print
                          {pack.zones.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">
                      Updated {new Date(pack.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => store.duplicatePack(pack.id)}
                        className="font-semibold text-neutral-500 hover:text-neutral-800"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${pack.styleName}"? This can't be undone.`)) {
                            store.deletePack(pack.id);
                          }
                        }}
                        className="font-semibold text-neutral-500 hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
