import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion, softSpring } from '../motion';

export type ActionNoteTone = 'ok' | 'error';

const TONE = {
  ok: { className: 'bg-matcha-soft/50 text-matcha-strong', Icon: CircleCheck, role: 'status' },
  error: { className: 'bg-danger/10 text-danger', Icon: CircleAlert, role: 'alert' },
} as const;

/**
 * The result of an action, shown next to it (Chatto has no toasts): an icon and a tinted
 * surface that rises in. Give it a new `key` for each result so a repeated result shows again.
 */
export function ActionNote({
  tone,
  children,
  className,
}: {
  tone: ActionNoteTone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon, role } = TONE[tone];
  return (
    <motion.p
      role={role}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className={cn('flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm whitespace-pre-line', toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </motion.p>
  );
}
