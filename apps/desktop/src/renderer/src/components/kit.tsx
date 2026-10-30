import { Check, Copy } from 'lucide-react';
import type { HTMLMotionProps } from 'motion/react';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion, riseIn, softSpring, spring, SwapIcon } from './motion';
import { Select as SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider as SliderRoot } from './ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { TeaCup, type TeaCupMood } from './TeaCup';

export function Tile({
  className = '',
  title,
  icon,
  action,
  children,
}: {
  className?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      variants={riseIn}
      className={`flex min-w-0 flex-col rounded-tile border border-line bg-tile p-5 ${className}`}
    >
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            {icon ? <span className="text-matcha [&>svg]:size-4">{icon}</span> : null}
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </motion.section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-matcha-strong text-on-matcha hover:opacity-90',
    secondary: 'bg-tile-muted text-ink hover:bg-matcha-soft/60',
    ghost: 'text-ink-soft hover:bg-tile-muted',
    danger: 'text-danger hover:bg-danger/10',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94, y: 0 }}
      transition={spring}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
        checked ? 'justify-end bg-matcha' : 'justify-start bg-line'
      }`}
    >
      {/* The thumb glides with a spring and stretches while pressed. */}
      <motion.span
        layout
        transition={spring}
        whileTap={{ width: 24 }}
        className="h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

export function StatusDot({ tone }: { tone: 'ok' | 'idle' | 'warn' | 'error' }) {
  const color = { ok: 'bg-matcha', idle: 'bg-ink-faint', warn: 'bg-amber-400', error: 'bg-danger' }[tone];
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      {tone === 'ok' ? <span className={`absolute inset-0 animate-ping rounded-full ${color} opacity-60`} /> : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  const group = useId();
  return (
    <div
      className={`inline-flex rounded-full bg-tile-muted p-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      role="radiogroup"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative inline-flex items-center gap-1.5 rounded-full transition-colors [&_svg]:size-3.5 ${size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5'} ${
              active ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-${group}`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-tile shadow-sm"
              />
            ) : null}
            <span className="relative inline-flex items-center gap-1.5">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 min-w-0 rounded-xl border border-line bg-canvas px-3 text-sm outline-none transition focus:border-matcha disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

/** Radix-based select (shadcn/ui), styled for Chatto. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  className = '',
  placeholder,
}: {
  /** An empty string shows the placeholder. */
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <SelectRoot value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger className={`h-9 w-full rounded-xl bg-canvas shadow-none ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="rounded-xl">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="rounded-lg">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

/** Radix-based slider (shadcn/ui) with a value readout. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <SliderRoot
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next ?? value)}
        className="flex-1 [&_[data-slot=slider-range]]:bg-matcha [&_[data-slot=slider-thumb]]:border-matcha"
      />
      <span className="w-14 text-right font-mono text-xs tabular-nums text-ink-soft">
        {value}
        {unit}
      </span>
    </div>
  );
}

/** Tooltip for icon-only controls. */
export function Hint({
  label,
  side = 'bottom',
  children,
}: {
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'matcha' | 'sakura' | 'danger';
}) {
  const tones = {
    neutral: 'bg-tile-muted text-ink-soft',
    matcha: 'bg-matcha-soft/50 text-matcha-strong',
    sakura: 'bg-sakura/40 text-ink',
    danger: 'bg-danger/10 text-danger',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-tile-muted p-1.5 pl-4">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-matcha-strong">{value}</code>
      <Button
        variant="primary"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        <SwapIcon swapped={copied} from={<Copy />} to={<Check />} />
        {copied ? '複製好了' : '複製'}
      </Button>
    </div>
  );
}

/** Minimal bar sparkline for message rate history. */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {values.map((value, index) => (
        <motion.span
          key={index}
          className={`flex-1 rounded-t-sm ${index === values.length - 1 ? 'bg-matcha' : 'bg-matcha/35'}`}
          initial={{ height: '4%' }}
          animate={{ height: `${Math.max(4, (value / max) * 100)}%` }}
          transition={{ ...softSpring, delay: index * 0.01 }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ mood = 'sleepy', title, hint }: { mood?: TeaCupMood; title: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
        <TeaCup mood={mood} size={64} />
      </motion.div>
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
