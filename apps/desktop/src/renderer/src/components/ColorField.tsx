import { useEffect, useState } from 'react';
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from './kibo-ui/color-picker';
import { useMessages } from '../i18n';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

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

/**
 * Swatch + opacity slider + free text, so any CSS colour stays editable.
 * With `alpha={false}` it only picks opaque `#RRGGBB` colours (opacity is set elsewhere).
 */
export function ColorField({
  label,
  value,
  onChange,
  alpha = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  alpha?: boolean;
}) {
  const m = useMessages().editorFields.color;
  const parsed = parseColor(value);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={m.openPicker(label)}
            className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line transition-colors hover:border-ink-faint focus-visible:ring-2 focus-visible:ring-matcha focus-visible:outline-none"
            style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' }}
          >
            <span className="absolute inset-0" style={{ background: value }} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="left" className="w-64 rounded-xl border-line bg-tile p-3">
          <ColorPicker
            className="gap-3"
            value={parsed ? value : '#000000'}
            onChange={([r, g, b, a]) =>
              onChange(
                formatColor({
                  hex: `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`,
                  alpha: alpha ? a : 1,
                }),
              )
            }
          >
            <ColorPickerSelection className="h-36 rounded-lg" />
            <div className="flex items-center gap-3">
              <ColorPickerEyeDropper />
              <div className="grid w-full gap-2">
                <ColorPickerHue />
                {alpha ? <ColorPickerAlpha /> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ColorPickerOutput />
              <ColorPickerFormat />
            </div>
          </ColorPicker>
        </PopoverContent>
      </Popover>
      <div className="min-w-0 flex-1">
        {/* The row beside it already names the field, so the value gets the whole line. */}
        <input
          value={text}
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            const next = parseColor(text);
            if (!next) setText(value);
            else onChange(alpha ? text.trim() : next.hex.toUpperCase());
          }}
          className="w-full min-w-0 bg-transparent font-mono text-xs text-ink-soft outline-none focus:text-ink"
        />
        {alpha ? (
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((parsed?.alpha ?? 1) * 100)}
            onChange={(event) =>
              onChange(formatColor({ hex: parsed?.hex ?? '#000000', alpha: Number(event.target.value) / 100 }))
            }
            className="mt-1 h-1 w-full cursor-pointer accent-[var(--c-matcha)]"
            aria-label={m.opacity(label)}
          />
        ) : null}
      </div>
    </div>
  );
}
