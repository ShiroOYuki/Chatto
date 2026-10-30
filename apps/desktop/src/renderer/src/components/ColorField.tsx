import { useEffect, useState } from 'react';

interface Rgba {
  hex: string;
  alpha: number;
}

/** Parses #rgb, #rrggbb, rgb(), rgba() and `transparent`. */
export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { hex: '#000000', alpha: 0 };
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  if (short) return { hex: `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`, alpha: 1 };
  if (/^#[0-9a-f]{6}$/.test(text)) return { hex: text, alpha: 1 };
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text);
  if (rgb) {
    const hex = `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
    return { hex, alpha: rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4])) };
  }
  return null;
}

export function formatColor({ hex, alpha }: Rgba): string {
  if (alpha >= 1) return hex.toUpperCase();
  if (alpha <= 0) return 'transparent';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/** Swatch + opacity slider + free text, so any CSS colour stays editable. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseColor(value);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-2">
      <label
        className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line"
        style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' }}
        title={label}
      >
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={parsed?.hex ?? '#000000'}
          onChange={(event) => onChange(formatColor({ hex: event.target.value, alpha: parsed?.alpha || 1 }))}
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-ink-soft">{label}</span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => (parseColor(text) ? onChange(text.trim()) : setText(value))}
            className="w-24 min-w-0 shrink bg-transparent text-right font-mono text-[11px] text-ink-faint outline-none focus:text-ink"
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((parsed?.alpha ?? 1) * 100)}
          onChange={(event) =>
            onChange(formatColor({ hex: parsed?.hex ?? '#000000', alpha: Number(event.target.value) / 100 }))
          }
          className="mt-1 h-1 w-full cursor-pointer accent-[var(--c-matcha)]"
          aria-label={`${label} 不透明度`}
        />
      </div>
    </div>
  );
}
