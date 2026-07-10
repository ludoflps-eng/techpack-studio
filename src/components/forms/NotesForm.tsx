import { Textarea } from '../ui/Field';

export function NotesForm({
  notes,
  onAdd,
  onUpdate,
  onRemove,
}: {
  notes: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      {notes.map((note, i) => (
        <div key={i} className="flex gap-2">
          <Textarea rows={2} value={note} onChange={(e) => onUpdate(i, e.target.value)} className="flex-1" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="h-fit text-neutral-400 hover:text-rose-600 text-xs px-1"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="w-full rounded-md border border-dashed border-neutral-300 py-1.5 text-xs font-medium text-neutral-500 hover:border-rose-400 hover:text-rose-600"
      >
        + Add production note
      </button>
    </div>
  );
}
