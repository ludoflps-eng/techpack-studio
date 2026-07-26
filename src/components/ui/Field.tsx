import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const baseInput =
  'w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ''}`} />;
}

/** A number input that lets the field go visually empty while the user is clearing/retyping a
 *  value, instead of snapping to "0" the instant the last digit is deleted. It keeps its own
 *  display text locally and only fires the caller's onChange (with the original event, so
 *  existing `Number(e.target.value)` handlers keep working unchanged) once that text parses to a
 *  real finite number — an empty or in-progress value (e.g. "-", ".", "") never gets committed.
 *  On blur, an incomplete value reverts to display the last real committed value. */
export function NumberInput({ value, onChange, onFocus, onBlur, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const toText = (v: typeof value) => (v === undefined || v === null ? '' : String(v));
  const [text, setText] = useState(toText(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="number"
      step="0.1"
      {...rest}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(toText(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(parsed)) {
          onChange?.(e);
        }
      }}
      className={`${baseInput} ${rest.className ?? ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} resize-y ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ''}`} />;
}
