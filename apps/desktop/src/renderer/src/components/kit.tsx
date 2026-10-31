import { Check, Copy } from 'lucide-react';
import type { HTMLMotionProps } from 'motion/react';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemTitle,
} from './kibo-ui/choicebox';
import { Pill } from './kibo-ui/pill';
import {
  Snippet,
  SnippetCopyButton,
  SnippetHeader,
  SnippetTabsContent,
  SnippetTabsList,
  SnippetTabsTrigger,
} from './kibo-ui/snippet';
import { Spinner } from './kibo-ui/spinner';
import { Status, StatusIndicator, StatusLabel } from './kibo-ui/status';
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from './kibo-ui/tags';
import { Button as UiButton } from './ui/button';
import { Field as UiField, FieldDescription, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
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

const BUTTON_VARIANT: Record<ButtonVariant, { variant: 'default' | 'secondary' | 'ghost'; className: string }> = {
  primary: { variant: 'default', className: '' },
  secondary: { variant: 'secondary', className: 'hover:bg-matcha-soft/60' },
  ghost: { variant: 'ghost', className: 'text-ink-soft hover:bg-tile-muted' },
  danger: { variant: 'ghost', className: 'text-danger hover:bg-danger/10 hover:text-danger' },
};
const BUTTON_SIZE: Record<ButtonSize, { size: 'sm' | 'default' | 'lg'; className: string }> = {
  sm: { size: 'sm', className: 'text-xs' },
  md: { size: 'default', className: '' },
  lg: { size: 'lg', className: 'h-11' },
};

/** shadcn/ui button with Chatto variants and a small spring on hover/tap. */
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const v = BUTTON_VARIANT[variant];
  const z = BUTTON_SIZE[size];
  return (
    <UiButton
      asChild
      variant={v.variant}
      size={z.size}
      className={cn('gap-1.5 rounded-full', v.className, z.className, className)}
    >
      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94, y: 0 }}
        transition={spring}
        {...props}
      />
    </UiButton>
  );
}

/** shadcn/ui switch, sized and coloured for Chatto. */
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
    <Switch
      size="lg"
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="shadow-none data-[state=checked]:bg-matcha data-[state=unchecked]:bg-line dark:data-[state=unchecked]:bg-line"
      thumbClassName="bg-white shadow-sm duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] dark:data-[state=checked]:bg-white dark:data-[state=unchecked]:bg-white"
    />
  );
}

const STATUS_BY_TONE = { ok: 'online', idle: 'offline', warn: 'degraded', error: 'error' } as const;

/** Kibo UI spinner sized for buttons and inline text. */
export function LoadingSpinner({ size = 14 }: { size?: number }) {
  return <Spinner variant="circle-filled" size={size} />;
}

export type StatusTone = 'ok' | 'idle' | 'warn' | 'error';

/** Maps a provider connection state to a status tone. */
export function channelTone(state: string, connected: boolean): StatusTone {
  if (connected) return 'ok';
  if (state === 'connecting' || state === 'reconnecting') return 'warn';
  return state === 'error' ? 'error' : 'idle';
}

/** Kibo UI status indicator (dot only); a Kibo spinner while connecting. */
export function StatusDot({ tone }: { tone: StatusTone }) {
  if (tone === 'warn') return <Spinner variant="circle-filled" size={12} className="text-amber-500" />;
  return (
    <span className={cn('group inline-flex', STATUS_BY_TONE[tone])}>
      <StatusIndicator />
    </span>
  );
}

/** Kibo UI status pill: dot plus label. */
export function StatusPill({ tone, children }: { tone: StatusTone; children?: ReactNode }) {
  return (
    <Status status={STATUS_BY_TONE[tone]} className="rounded-full bg-tile-muted px-2.5 py-1 font-normal">
      {tone === 'warn' ? <Spinner variant="circle-filled" size={12} className="text-amber-500" /> : <StatusIndicator />}
      <StatusLabel className="text-xs text-ink-soft">{children}</StatusLabel>
    </Status>
  );
}

/** shadcn/ui tabs used as a segmented control, with a sliding highlight. */
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
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className="inline-flex">
      <TabsList className={cn('h-auto rounded-full bg-tile-muted p-1', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(
                'relative h-auto flex-none rounded-full border-0 font-normal text-ink-soft hover:text-ink [&_svg]:size-3.5',
                'data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-ink data-[state=active]:shadow-none',
                'dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-ink',
                size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              )}
            >
              {active ? (
                <motion.span
                  layoutId={`segmented-${group}`}
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-tile shadow-sm"
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1.5">{option.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

/** Kibo UI choicebox: radio cards with a title and description. */
export function ChoiceCards<T extends string>({
  value,
  options,
  onChange,
  columns = 2,
}: {
  value: T;
  options: { value: T; title: string; description?: string }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  const group = useId();
  return (
    <Choicebox
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <ChoiceboxItem
          key={option.value}
          value={option.value}
          id={`${group}-${option.value}`}
          className={cn(
            'cursor-pointer rounded-xl border border-line bg-canvas p-3 transition-colors hover:border-matcha/60',
            value === option.value && 'border-matcha bg-matcha-soft/20',
          )}
        >
          <ChoiceboxItemHeader>
            <ChoiceboxItemTitle className="text-sm">{option.title}</ChoiceboxItemTitle>
            {option.description ? (
              <ChoiceboxItemDescription className="text-xs text-ink-faint">
                {option.description}
              </ChoiceboxItemDescription>
            ) : null}
          </ChoiceboxItemHeader>
          <ChoiceboxIndicator
            id={`${group}-${option.value}`}
            className="border-line text-matcha data-[state=checked]:border-matcha [&_svg]:fill-matcha"
          />
        </ChoiceboxItem>
      ))}
    </Choicebox>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <UiField className="gap-1.5">
      <FieldLabel className="text-xs font-medium text-ink-soft">{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription className="text-xs text-ink-faint">{hint}</FieldDescription> : null}
    </UiField>
  );
}

/** shadcn/ui input, styled for Chatto. */
export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      className={cn(
        'h-9 rounded-xl border-line bg-canvas shadow-none focus-visible:border-matcha focus-visible:ring-matcha/20 disabled:opacity-60',
        className,
      )}
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

/** Kibo UI pill, compact, in Chatto tones. */
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
  return <Pill className={cn('gap-1 px-2 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</Pill>;
}

/** Kibo UI snippet: a read-only value with a copy button. */
export function CopyField({ value, label = '網址' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Snippet value="value" className="rounded-2xl border-line bg-tile-muted">
      <SnippetHeader className="border-line bg-transparent py-1 pr-1 pl-3">
        <SnippetTabsList className="h-auto bg-transparent p-0">
          <SnippetTabsTrigger
            value="value"
            className="h-7 rounded-full border-0 px-0 text-xs text-ink-faint shadow-none data-[state=active]:bg-transparent data-[state=active]:text-ink-faint data-[state=active]:shadow-none dark:data-[state=active]:border-0 dark:data-[state=active]:bg-transparent"
          >
            {label}
          </SnippetTabsTrigger>
        </SnippetTabsList>
        <SnippetCopyButton
          value={value}
          onCopy={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          asChild
        >
          <Button variant="primary" size="sm">
            <SwapIcon swapped={copied} from={<Copy />} to={<Check />} />
            {copied ? '複製好了' : '複製'}
          </Button>
        </SnippetCopyButton>
      </SnippetHeader>
      <SnippetTabsContent value="value" className="bg-transparent px-4 py-3 font-mono text-sm text-matcha-strong">
        {value}
      </SnippetTabsContent>
    </Snippet>
  );
}

/** Kibo UI tags: a list of strings with removable chips, free entry and suggestions. */
export function TagsField({
  value,
  onChange,
  suggestions = [],
  placeholder = '新增…',
  normalize = (text: string) => text.trim(),
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  normalize?: (text: string) => string;
}) {
  const [query, setQuery] = useState('');
  const typed = normalize(query);
  const add = (item: string) => {
    if (item && !value.includes(item)) onChange([...value, item]);
    setQuery('');
  };
  const remove = (item: string) => onChange(value.filter((entry) => entry !== item));
  const options = suggestions.filter((item) => !value.includes(item));
  return (
    <Tags className="w-full">
      <TagsTrigger
        placeholder={value.length ? '' : placeholder}
        className="min-h-9 rounded-xl border-line bg-canvas px-2 py-1.5 shadow-none hover:bg-canvas"
      >
        {value.map((item) => (
          <TagsValue
            key={item}
            onRemove={() => remove(item)}
            className="gap-1 rounded-full bg-tile-muted px-2 py-0.5 font-mono text-[11px] font-normal text-ink"
          >
            {item}
          </TagsValue>
        ))}
      </TagsTrigger>
      <TagsContent className="rounded-xl" align="start">
        <TagsInput value={query} onValueChange={setQuery} placeholder="輸入後按 Enter 新增" />
        <TagsList>
          <TagsEmpty>{typed ? null : '沒有建議'}</TagsEmpty>
          {typed && !value.includes(typed) && !options.includes(typed) ? (
            <TagsGroup>
              <TagsItem value={`add:${typed}`} onSelect={() => add(typed)}>
                新增「{typed}」
              </TagsItem>
            </TagsGroup>
          ) : null}
          {options.length ? (
            <TagsGroup heading="建議">
              {options.map((item) => (
                <TagsItem key={item} value={item} onSelect={() => add(item)}>
                  <span className="font-mono">{item}</span>
                </TagsItem>
              ))}
            </TagsGroup>
          ) : null}
        </TagsList>
      </TagsContent>
    </Tags>
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
