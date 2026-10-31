import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '../kibo-ui/spinner';
import { Status, StatusIndicator, StatusLabel } from '../kibo-ui/status';

export type StatusTone = 'ok' | 'idle' | 'warn' | 'error';

/** Maps a provider connection state to a status tone. */
export function channelTone(state: string, connected: boolean): StatusTone {
  if (connected) return 'ok';
  if (state === 'connecting' || state === 'reconnecting') return 'warn';
  return state === 'error' ? 'error' : 'idle';
}

const STATUS_BY_TONE = { ok: 'online', idle: 'offline', warn: 'degraded', error: 'error' } as const;

/** Kibo UI spinner sized for buttons and inline text. */
export function LoadingSpinner({ size = 14 }: { size?: number }) {
  return <Spinner variant="circle-filled" size={size} />;
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
