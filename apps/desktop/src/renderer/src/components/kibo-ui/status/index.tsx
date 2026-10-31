/**
 * Status from Kibo UI (https://www.kibo-ui.com/components/status), MIT © shadcnblocks.
 * Adapted for Chatto: matcha colour tokens, an `error` state, the ping only
 * while online, and Traditional Chinese default labels.
 */
import type { ComponentProps, HTMLAttributes } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusKind = 'online' | 'offline' | 'maintenance' | 'degraded' | 'error';

export type StatusProps = ComponentProps<typeof Badge> & {
  status: StatusKind;
};

export const Status = ({ className, status, ...props }: StatusProps) => (
  <Badge className={cn('flex items-center gap-2', 'group', status, className)} variant="secondary" {...props} />
);

const tone = cn(
  'group-[.online]:bg-matcha',
  'group-[.offline]:bg-ink-faint',
  'group-[.maintenance]:bg-sky-500',
  'group-[.degraded]:bg-amber-400',
  'group-[.error]:bg-danger',
);

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({ className, ...props }: StatusIndicatorProps) => (
  <span className={cn('relative flex h-2.5 w-2.5 shrink-0', className)} {...props}>
    <span
      className={cn(
        'absolute hidden h-full w-full animate-ping rounded-full opacity-60 group-[.online]:inline-flex',
        tone,
      )}
    />
    <span className={cn('relative inline-flex h-full w-full rounded-full', tone)} />
  </span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({ className, children, ...props }: StatusLabelProps) => (
  <span className={cn('text-muted-foreground', className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">已連線</span>
        <span className="hidden group-[.offline]:block">未連線</span>
        <span className="hidden group-[.maintenance]:block">維護中</span>
        <span className="hidden group-[.degraded]:block">連線中</span>
        <span className="hidden group-[.error]:block">發生錯誤</span>
      </>
    )}
  </span>
);
