import { OversizeSpecDiagram } from './OversizeSpecDiagram';

export function InputView() {
  return (
    <div className="h-full overflow-y-auto bg-neutral-100 p-6">
      <div className="mx-auto max-w-3xl bg-white p-8 shadow-sm">
        <OversizeSpecDiagram />
      </div>
    </div>
  );
}
