/**
 * Precise editors for theme parameters: numbers with typed input, per-side
 * spacing, per-corner radius, borders, shadows and whole boxes.
 */
import type { BorderSpec, BorderStyle, BoxStyle, Corners, ShadowSpec, Sides } from '@chatto/core';
import { Link2, Link2Off } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ColorField } from './ColorField';
import { Hint, Select, Slider, Toggle } from './kit';

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
    <input
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
      className={`h-8 w-16 rounded-lg border border-line bg-canvas px-2 text-right font-mono text-xs tabular-nums outline-none focus:border-matcha ${className}`}
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
  const allSame = value.every((item) => item === value[0]);
  const [linked, setLinked] = useState(allSame);
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <Hint label={linked ? '分開調整四邊' : '四邊一起調整'}>
          <button
            type="button"
            aria-label={linked ? '分開調整四邊' : '四邊一起調整'}
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
  return <LinkedQuad {...props} max={props.max ?? 40} names={['上', '右', '下', '左']} />;
}

export function CornersField(props: {
  label: string;
  value: Corners;
  onChange: (value: Corners) => void;
  max?: number;
}) {
  return <LinkedQuad {...props} max={props.max ?? 40} names={['左上', '右上', '右下', '左下']} />;
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
        {value !== undefined ? (
          <div className="min-w-0 flex-1">
            <ColorField label={label} value={value} onChange={onChange} />
          </div>
        ) : (
          <span className="text-xs text-ink-faint">沿用主題</span>
        )}
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
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 w-full rounded-lg border border-line bg-canvas px-2 text-sm outline-none focus:border-matcha ${mono ? 'font-mono text-xs' : ''}`}
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
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <FieldRow label={label}>
      <Select value={value} options={options} onChange={onChange} />
    </FieldRow>
  );
}

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'solid', label: '實線' },
  { value: 'dashed', label: '虛線' },
  { value: 'dotted', label: '點線' },
  { value: 'double', label: '雙線' },
];

export function BorderEditor({ value, onChange }: { value: BorderSpec; onChange: (value: BorderSpec) => void }) {
  return (
    <>
      <SelectRow
        label="框線樣式"
        value={value.style}
        options={BORDER_STYLES}
        onChange={(style) => onChange({ ...value, style })}
      />
      {value.style !== 'none' ? (
        <>
          <NumberField
            label="框線粗細"
            value={value.width}
            min={0}
            max={8}
            step={0.5}
            unit="px"
            onChange={(width) => onChange({ ...value, width })}
          />
          <ColorRow label="框線顏色" value={value.color} onChange={(color) => onChange({ ...value, color })} />
        </>
      ) : null}
    </>
  );
}

const DEFAULT_SHADOW: ShadowSpec = { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0, 0, 0, 0.35)' };

export function ShadowEditor({
  label,
  value,
  onChange,
  text = false,
}: {
  label: string;
  value: ShadowSpec | null;
  onChange: (value: ShadowSpec | null) => void;
  /** Text shadows have no spread or inset. */
  text?: boolean;
}) {
  const set = (patch: Partial<ShadowSpec>) => value && onChange({ ...value, ...patch });
  return (
    <>
      <ToggleRow label={label} value={value !== null} onChange={(on) => onChange(on ? DEFAULT_SHADOW : null)} />
      {value ? (
        <div className="ml-4 border-l border-line pl-3">
          <NumberField label="水平位移" value={value.x} min={-20} max={20} unit="px" onChange={(x) => set({ x })} />
          <NumberField label="垂直位移" value={value.y} min={-20} max={20} unit="px" onChange={(y) => set({ y })} />
          <NumberField label="模糊" value={value.blur} min={0} max={40} unit="px" onChange={(blur) => set({ blur })} />
          {!text ? (
            <NumberField
              label="擴散"
              value={value.spread}
              min={-10}
              max={20}
              unit="px"
              onChange={(spread) => set({ spread })}
            />
          ) : null}
          <ColorRow label="陰影顏色" value={value.color} onChange={(color) => set({ color })} />
          {!text ? (
            <ToggleRow label="內陰影" value={Boolean(value.inset)} onChange={(inset) => set({ inset })} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Every property of a box: fill, border, radius, padding, shadow and backdrop blur. */
export function BoxEditor({ value, onChange }: { value: BoxStyle; onChange: (value: BoxStyle) => void }) {
  const set = (patch: Partial<BoxStyle>) => onChange({ ...value, ...patch });
  return (
    <>
      <ColorRow label="背景" value={value.background} onChange={(background) => set({ background })} />
      <BorderEditor value={value.border} onChange={(border) => set({ border })} />
      <CornersField label="圓角" value={value.radius} onChange={(radius) => set({ radius })} />
      <SidesField label="內距" value={value.padding} onChange={(padding) => set({ padding })} />
      <ShadowEditor label="陰影" value={value.shadow} onChange={(shadow) => set({ shadow })} />
      <NumberField
        label="背景模糊"
        hint="霧面玻璃效果"
        value={value.backdropBlur}
        min={0}
        max={30}
        unit="px"
        onChange={(backdropBlur) => set({ backdropBlur })}
      />
    </>
  );
}
