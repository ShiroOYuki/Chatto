import type { Corners, Sides } from '@chatto/core';
import { Link2, Link2Off } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Hint, Slider } from '../../../components/kit';
import { Input } from '../../../components/ui/input';
import { useMessages } from '../../../i18n';
import { FieldRow } from './rows';

function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  className = '',
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed)) onChange(parsed);
    else setText(String(value));
  };
  return (
    <Input
      type="number"
      aria-label={label}
      value={text}
      step={step}
      min={min}
      max={max}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = Number(event.target.value);
        if (event.target.value !== '' && Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={commit}
      className={cn(
        'h-8 w-16 rounded-lg border-line bg-canvas px-2 text-right font-mono text-xs tabular-nums shadow-none focus-visible:border-matcha focus-visible:ring-matcha/20 md:text-xs',
        className,
      )}
    />
  );
}

/** Slider for quick changes plus a typed input for exact values (beyond the slider range too). */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <div className="flex-1 [&_span.font-mono]:hidden">
          <Slider value={Math.min(max, Math.max(min, value))} min={min} max={max} step={step} onChange={onChange} />
        </div>
        <NumberInput value={value} onChange={onChange} step={step} label={label} />
        {unit ? <span className="w-6 text-xs text-ink-faint">{unit}</span> : null}
      </div>
    </FieldRow>
  );
}

function LinkedQuad<T extends [number, number, number, number]>({
  label,
  value,
  onChange,
  max,
  names,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  max: number;
  names: [string, string, string, string];
}) {
  const m = useMessages().editorFields;
  const allSame = value.every((item) => item === value[0]);
  const [linked, setLinked] = useState(allSame);
  // Sides changed elsewhere (e.g. dragging a slice line) can no longer be shown as one value.
  useEffect(() => {
    if (!allSame) setLinked(false);
  }, [allSame]);
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <Hint label={linked ? m.unlinkSides : m.linkSides}>
          <button
            type="button"
            aria-label={linked ? m.unlinkSides : m.linkSides}
            onClick={() => setLinked(!linked)}
            className={`grid size-8 shrink-0 place-items-center rounded-lg border transition-colors [&_svg]:size-4 ${
              linked ? 'border-matcha bg-matcha-soft/40 text-matcha-strong' : 'border-line text-ink-soft'
            }`}
          >
            {linked ? <Link2 /> : <Link2Off />}
          </button>
        </Hint>
        {linked ? (
          <>
            <div className="flex-1 [&_span.font-mono]:hidden">
              <Slider
                value={Math.min(max, value[0])}
                min={0}
                max={max}
                onChange={(next) => onChange([next, next, next, next] as T)}
              />
            </div>
            <NumberInput value={value[0]} onChange={(next) => onChange([next, next, next, next] as T)} label={label} />
          </>
        ) : (
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            {names.map((name, index) => (
              <label key={name} className="flex flex-col items-center gap-0.5 text-[10px] text-ink-faint">
                <NumberInput
                  className="w-full"
                  value={value[index] ?? 0}
                  label={`${label} ${name}`}
                  onChange={(next) => {
                    const copy = [...value] as T;
                    copy[index] = next;
                    onChange(copy);
                  }}
                />
                {name}
              </label>
            ))}
          </div>
        )}
      </div>
    </FieldRow>
  );
}

export function SidesField(props: { label: string; value: Sides; onChange: (value: Sides) => void; max?: number }) {
  const m = useMessages().editorFields;
  return <LinkedQuad {...props} max={props.max ?? 40} names={m.sides} />;
}

export function CornersField(props: {
  label: string;
  value: Corners;
  onChange: (value: Corners) => void;
  max?: number;
}) {
  const m = useMessages().editorFields;
  return <LinkedQuad {...props} max={props.max ?? 40} names={m.corners} />;
}
