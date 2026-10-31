import type { HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';
import { motion, spring } from '../motion';
import { Button as UiButton } from '../ui/button';

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
