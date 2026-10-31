/**
 * Color picker from Kibo UI (https://www.kibo-ui.com/components/color-picker),
 * MIT © shadcnblocks. Adapted for Chatto:
 * - state is HSV so the saturation/value square maps 1:1 to the pointer and
 *   the marker starts at the current colour;
 * - controlled `value` syncs without feedback loops, and `onChange` only fires
 *   for user edits (not on mount or when the value prop changes);
 * - the HEX field is editable.
 */
import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import { Slider } from 'radix-ui';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Hsva {
  h: number;
  s: number;
  v: number;
  /** 0–100 */
  a: number;
}

type ColorPickerContextValue = Hsva & {
  mode: string;
  setColor: (patch: Partial<Hsva>) => void;
  setMode: (mode: string) => void;
};

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);
  if (!context) throw new Error('useColorPicker must be used within a ColorPicker');
  return context;
};

const toHsva = (input: Parameters<typeof Color>[0]): Hsva | null => {
  try {
    const color = Color(input);
    const [h, s, v] = color.hsv().array();
    return { h: h ?? 0, s: s ?? 0, v: v ?? 0, a: color.alpha() * 100 };
  } catch {
    return null;
  }
};

const toColor = ({ h, s, v, a }: Hsva) => Color.hsv(h, s, v).alpha(a / 100);

/** Rounded identity used to tell whether an incoming value is a different colour. */
const colorKey = (color: Hsva) => {
  const rgb = toColor(color).rgb();
  return [...rgb.array().slice(0, 3).map(Math.round), Math.round(rgb.alpha() * 100)].join(',');
};

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  /** Called with `[r, g, b, alpha(0–1)]` for user edits only. */
  onChange?: (value: [number, number, number, number]) => void;
};

export const ColorPicker = ({ value, defaultValue = '#000000', onChange, className, ...props }: ColorPickerProps) => {
  const [color, setState] = useState<Hsva>(() => toHsva(value ?? defaultValue) ?? { h: 0, s: 0, v: 0, a: 100 });
  const [mode, setMode] = useState('hex');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow the controlled value, but keep hue/saturation when the incoming
  // colour is grey or black (where they are undefined) so dragging stays smooth.
  const colorRef = useRef(color);

  useEffect(() => {
    if (value === undefined) return;
    const next = toHsva(value);
    const current = colorRef.current;
    if (!next || colorKey(current) === colorKey(next)) return;
    const synced = {
      h: next.s === 0 || next.v === 0 ? current.h : next.h,
      s: next.v === 0 ? current.s : next.s,
      v: next.v,
      a: next.a,
    };
    colorRef.current = synced;
    setState(synced);
  }, [value]);

  const setColor = useCallback((patch: Partial<Hsva>) => {
    const next = { ...colorRef.current, ...patch };
    colorRef.current = next;
    setState(next);
    const [r, g, b] = toColor(next).rgb().array();
    onChangeRef.current?.([r ?? 0, g ?? 0, b ?? 0, next.a / 100]);
  }, []);

  return (
    <ColorPickerContext.Provider value={{ ...color, mode, setColor, setMode }}>
      <div className={cn('flex size-full flex-col gap-4', className)} {...props} />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(({ className, ...props }: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { h, s, v, setColor } = useColorPicker();

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      setColor({ s: x * 100, v: (1 - y) * 100 });
    },
    [setColor],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove]);

  return (
    <div
      className={cn('relative size-full cursor-crosshair touch-none rounded', className)}
      onPointerDown={(event) => {
        event.preventDefault();
        setIsDragging(true);
        handlePointerMove(event.nativeEvent);
      }}
      ref={containerRef}
      style={{
        background: `linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, transparent), hsl(${h}, 100%, 50%)`,
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{ left: `${s}%`, top: `${100 - v}%`, boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }}
      />
    </div>
  );
});

ColorPickerSelection.displayName = 'ColorPickerSelection';

const thumbClass =
  'block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

export type ColorPickerHueProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
  const { h, setColor } = useColorPicker();
  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={360}
      onValueChange={([hue]) => setColor({ h: hue ?? 0 })}
      step={1}
      value={[h]}
      {...props}
    >
      <Slider.Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Slider.Range className="absolute h-full" />
      </Slider.Track>
      <Slider.Thumb className={thumbClass} aria-label="色相" />
    </Slider.Root>
  );
};

export type ColorPickerAlphaProps = ComponentProps<typeof Slider.Root>;

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
  const { h, s, v, a, setColor } = useColorPicker();
  const solid = toColor({ h, s, v, a: 100 }).rgb().string();
  return (
    <Slider.Root
      className={cn('relative flex h-4 w-full touch-none', className)}
      max={100}
      onValueChange={([alpha]) => setColor({ a: alpha ?? 100 })}
      step={1}
      value={[a]}
      {...props}
    >
      <Slider.Track
        className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-full"
        style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px' }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent, ${solid})` }} />
        <Slider.Range className="absolute h-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className={thumbClass} aria-label="不透明度" />
    </Slider.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

interface EyeDropperApi {
  open: () => Promise<{ sRGBHex: string }>;
}

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
  const { setColor } = useColorPicker();
  const supported = typeof window !== 'undefined' && 'EyeDropper' in window;
  if (!supported) return null;

  const handleEyeDropper = async () => {
    try {
      const EyeDropper = (window as unknown as { EyeDropper: new () => EyeDropperApi }).EyeDropper;
      const result = await new EyeDropper().open();
      const next = toHsva(result.sRGBHex);
      if (next) setColor({ ...next, a: 100 });
    } catch {
      // Cancelled by the user.
    }
  };

  return (
    <Button
      className={cn('shrink-0 text-muted-foreground', className)}
      onClick={() => void handleEyeDropper()}
      size="icon-sm"
      type="button"
      variant="outline"
      aria-label="從螢幕取色"
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ['hex', 'rgb', 'css', 'hsl'];

export const ColorPickerOutput = ({ className, ...props }: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();
  return (
    <Select onValueChange={setMode} value={mode}>
      <SelectTrigger className={cn('h-8 w-20 shrink-0 text-xs', className)} size="sm" {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const fieldClass = 'h-8 rounded-r-none bg-secondary px-2 font-mono text-xs shadow-none';

const PercentageInput = ({ className, ...props }: ComponentProps<typeof Input>) => (
  <div className="relative">
    <Input
      readOnly
      type="text"
      {...props}
      className={cn('h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none', className)}
    />
    <span className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
  </div>
);

/** Editable HEX field: commits on Enter or blur, reverts on invalid input. */
const HexInput = ({ hex }: { hex: string }) => {
  const { setColor } = useColorPicker();
  const [text, setText] = useState(hex);
  useEffect(() => setText(hex), [hex]);
  const commit = () => {
    const next = toHsva(text.startsWith('#') ? text : `#${text}`);
    if (next) setColor({ h: next.h, s: next.s, v: next.v });
    else setText(hex);
  };
  return (
    <Input
      className={fieldClass}
      type="text"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
      aria-label="HEX"
    />
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({ className, ...props }: ColorPickerFormatProps) => {
  const { h, s, v, a, mode } = useColorPicker();
  const color = toColor({ h, s, v, a });
  const alpha = Math.round(a);
  const group = cn('relative flex w-full items-center -space-x-px rounded-md shadow-sm', className);

  if (mode === 'hex') {
    return (
      <div className={group} {...props}>
        <HexInput hex={color.hex()} />
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === 'css') {
    const rgb = color
      .rgb()
      .array()
      .slice(0, 3)
      .map((value) => Math.round(value));
    return (
      <div className={cn('w-full rounded-md shadow-sm', className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 font-mono text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${rgb.join(', ')}, ${alpha / 100})`}
        />
      </div>
    );
  }

  const values = (mode === 'rgb' ? color.rgb() : color.hsl())
    .array()
    .slice(0, 3)
    .map((value) => Math.round(value));
  return (
    <div className={group} {...props}>
      {values.map((value, index) => (
        <Input className={cn(fieldClass, index && 'rounded-l-none')} key={index} readOnly type="text" value={value} />
      ))}
      <PercentageInput value={alpha} />
    </div>
  );
};
