import { useState } from 'react';
import type { TechPack } from '../types';
import { useStore } from '../store';
import { DesignView } from './DesignView';
import { SpecSheetView } from './SpecSheetView';
import { InputView } from './InputView';
import { TextInput, Select } from './ui/Field';
import { downloadTechPack } from '../lib/exportImport';
import { SIZE_OPTIONS, isSizeLabel } from '../lib/sizeChart';
import { COLLECTION_OPTIONS, isCollectionName } from '../lib/collections';

type Tab = 'input' | 'design' | 'specsheet';

export function Editor({ pack }: { pack: TechPack }) {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('design');

  return (
    <div className="app-shell flex h-screen flex-col bg-neutral-50">
      <header className="no-print flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <button
          onClick={() => store.setActive(null)}
          className="rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ← Packs
        </button>

        <Select
          value={pack.styleName}
          onChange={(e) => store.updatePack(pack.id, { styleName: e.target.value })}
          className="!w-56 font-semibold"
        >
          {!isCollectionName(pack.styleName) && <option value={pack.styleName}>{pack.styleName || 'Collection'}</option>}
          {COLLECTION_OPTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <TextInput
          value={pack.styleCode}
          onChange={(e) => store.updatePack(pack.id, { styleCode: e.target.value })}
          placeholder="Style code"
          className="!w-28"
        />
        <Select
          value={pack.referenceSize}
          onChange={(e) => {
            const value = e.target.value;
            if (isSizeLabel(value)) store.applySize(pack.id, value);
          }}
          className="!w-24"
        >
          {!isSizeLabel(pack.referenceSize) && <option value={pack.referenceSize}>{pack.referenceSize}</option>}
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <div className="mr-2 flex rounded-md border border-neutral-200 p-0.5">
            <button
              onClick={() => setTab('input')}
              className={`rounded px-3 py-1 text-xs font-semibold ${tab === 'input' ? 'bg-rose-600 text-white' : 'text-neutral-600'}`}
            >
              Input
            </button>
            <button
              onClick={() => setTab('design')}
              className={`rounded px-3 py-1 text-xs font-semibold ${tab === 'design' ? 'bg-rose-600 text-white' : 'text-neutral-600'}`}
            >
              Design
            </button>
            <button
              onClick={() => setTab('specsheet')}
              className={`rounded px-3 py-1 text-xs font-semibold ${tab === 'specsheet' ? 'bg-rose-600 text-white' : 'text-neutral-600'}`}
            >
              Spec sheet
            </button>
          </div>
          {tab === 'specsheet' && (
            <>
              <button
                onClick={() => downloadTechPack(pack)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Export JSON
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Print / Save PDF
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-body min-h-0 flex-1 overflow-hidden">
        {tab === 'input' && <InputView />}
        {tab === 'design' && <DesignView pack={pack} />}
        {tab === 'specsheet' && <SpecSheetView pack={pack} />}
      </div>
    </div>
  );
}
