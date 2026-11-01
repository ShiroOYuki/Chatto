import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ColorField } from '../../../components/ColorField';
import { Select, Toggle } from '../../../components/kit';
import { Input } from '../../../components/ui/input';

export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[136px_minmax(0,1fr)] items-center gap-3 py-1.5">
      <div className="text-xs font-medium text-ink-soft">
        {label}
        {hint ? <div className="mt-0.5 font-normal text-ink-faint">{hint}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldRow label={label}>
      <ColorField label={label} value={value} onChange={onChange} />
    </FieldRow>
  );
}

/** A colour that can be switched off (used for optional overrides). */
export function OptionalColorRow({
  label,
  value,
  onChange,
  fallback = '#97C459',
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  fallback?: string;
}) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <Toggle checked={value !== undefined} label={label} onChange={(on) => onChange(on ? fallback : undefined)} />
        {/* The colour field stays mounted while off so toggling never changes the row height. */}
        <div className="relative min-w-0 flex-1">
          <div
            inert={value === undefined}
            aria-hidden={value === undefined}
            className={`transition-opacity duration-150 ${value === undefined ? 'opacity-30 grayscale' : ''}`}
          >
            <ColorField label={label} value={value ?? fallback} onChange={onChange} />
          </div>
          {value === undefined ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-tile px-2.5 py-0.5 text-xs text-ink-soft shadow-sm">沿用主題</span>
            </span>
          ) : null}
        </div>
      </div>
    </FieldRow>
  );
}

export function TextRow({
  label,
  hint,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-8 rounded-lg border-line bg-canvas px-2 text-sm shadow-none focus-visible:border-matcha focus-visible:ring-matcha/20 md:text-sm',
          mono && 'font-mono text-xs md:text-xs',
        )}
      />
    </FieldRow>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <Toggle checked={value} label={label} onChange={onChange} />
    </FieldRow>
  );
}

export function SelectRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <FieldRow label={label} hint={hint}>
      <Select value={value} options={options} onChange={onChange} />
    </FieldRow>
  );
}
