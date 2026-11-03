import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemTitle,
} from '../kibo-ui/choicebox';
import { motion, spring } from '../motion';
import { Select as SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider as SliderRoot } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

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
      <TabsList className={cn('h-auto rounded-xl bg-tile-muted p-1', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(
                'relative h-auto flex-none rounded-lg border-0 font-normal text-ink-soft hover:text-ink [&_svg]:size-3.5',
                'data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-ink data-[state=active]:shadow-none',
                'dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-ink',
                size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              )}
            >
              {active ? (
                <motion.span
                  layoutId={`segmented-${group}`}
                  transition={spring}
                  className="absolute inset-0 rounded-lg bg-tile shadow-sm"
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

/** Radix-based select (shadcn/ui), styled for Chatto. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  'aria-label': ariaLabel,
}: {
  /** An empty string shows the placeholder. */
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
}) {
  return (
    <SelectRoot value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={ariaLabel} className={`h-9 w-full rounded-xl bg-canvas shadow-none ${className}`}>
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
