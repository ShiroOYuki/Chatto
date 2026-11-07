import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Pill } from '../kibo-ui/pill';
import { motion, softSpring } from '../motion';

/** Kibo UI pill, compact, in Chatto tones. */
export function Badge({
  children,
  tone = 'neutral',
  solid = false,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'matcha' | 'sakura' | 'danger';
  /** Opaque fill, for badges laid over a picture (theme previews) where a tint would wash out. */
  solid?: boolean;
}) {
  const tones = {
    neutral: 'bg-tile-muted text-ink-soft [.bg-tile-muted_&]:bg-tile',
    matcha: 'bg-matcha-soft/50 text-matcha-strong',
    sakura: 'bg-sakura/40 text-ink',
    danger: 'bg-danger/10 text-danger',
  };
  const solidTones = {
    neutral: 'bg-tile text-ink',
    matcha: 'bg-matcha-bright text-on-matcha-bright',
    sakura: 'bg-sakura text-ink',
    danger: 'bg-danger text-on-danger',
  };
  return (
    <Pill
      className={cn(
        'gap-1 px-2 py-0.5 text-[11px] font-medium [&>svg]:size-3',
        // The tile-colored ring keeps a solid badge apart from a preview of the same hue.
        solid ? ['shadow-sm ring-2 ring-tile', solidTones[tone]] : tones[tone],
      )}
    >
      {children}
    </Pill>
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
