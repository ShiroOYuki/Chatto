import { useEffect, useState } from 'react';
import { TextInput } from '../../components/kit';

/** Whole-number input that commits on blur or Enter, clamped to its range. */
export function NumberInput({
  value,
  min,
  max,
  unit,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const parsed = Number.parseInt(text, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setText(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <span className="flex items-center gap-2">
      <TextInput
        aria-label={label}
        className="w-20 text-right tabular-nums"
        inputMode="numeric"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
      />
      <span className="text-xs text-ink-faint">{unit}</span>
    </span>
  );
}
