import { rewardName } from '@chatto/chat-ui';
import { LogIn, Ticket, X } from 'lucide-react';
import type { AppState } from '../../../shared/ipc';
import { useLocale, useMessages } from '../i18n';
import { redemptionDetails } from '../../../shared/redemptionLog';
import { redemptionAccess, twitch } from '../services/twitch';
import { useRedemptions, type RedemptionEntry } from '../store';
import { formatClock } from '../components/ChatLine';
import { Badge, Button, Hint, Tile } from '../components/kit';
import { motion } from '../components/motion';

/**
 * How the redemption tile shares the chat page's side column with the tile
 * below it. Tall windows show both; below 760 px of height the column holds
 * one: the redemptions when there are any, otherwise the other tile.
 */
export function redemptionColumn(hasEntries: boolean): { tile: string; other: string } {
  return hasEntries
    ? {
        tile: 'max-h-[55%] shrink-0 [@media(max-height:760px)]:max-h-none [@media(max-height:760px)]:flex-1',
        other: '[@media(max-height:760px)]:hidden',
      }
    : { tile: 'max-h-[55%] shrink-0 [@media(max-height:760px)]:hidden', other: '' };
}

/**
 * This session's channel points redemptions on the chat page, newest first,
 * each closable. Hidden when redemptions cannot arrive (signed out, someone
 * else's channel) and none came earlier.
 */
export function RedemptionsTile({ state, className = '' }: { state: AppState; className?: string }) {
  const m = useMessages().redemptions;
  const { entries } = useRedemptions();
  const access = redemptionAccess(state);
  const signingIn = state.auth.status === 'pending';
  if (entries.length === 0 && access !== 'ready' && access !== 'reauth' && !signingIn) return null;

  return (
    <Tile
      title={m.title}
      icon={<Ticket />}
      className={`min-h-0 overflow-hidden ${className}`}
      action={entries.length > 0 ? <Badge tone="matcha">{entries.length}</Badge> : null}
    >
      {access === 'reauth' || signingIn ? <ReauthNote state={state} /> : null}
      {entries.length > 0 ? (
        <ul
          data-testid="redemptions"
          className="-mx-2 -mb-2 flex min-h-0 flex-col gap-1.5 overflow-y-auto px-2 pb-2"
          aria-label={m.title}
        >
          {entries.map((entry) => (
            <RedemptionRow key={entry.key} entry={entry} />
          ))}
        </ul>
      ) : access === 'ready' ? (
        <p className="text-xs text-ink-faint">{m.empty}</p>
      ) : null}
    </Tile>
  );
}

/** A sign-in from before Chatto asked for redemptions: one more approval on Twitch turns them on. */
function ReauthNote({ state }: { state: AppState }) {
  const m = useMessages().redemptions;
  const code = state.auth.deviceCode?.userCode;
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-tile-muted px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{m.reauth}</div>
        <div className="text-xs text-ink-faint">{m.reauthHint}</div>
      </div>
      {state.auth.status === 'pending' ? (
        <span className="shrink-0 font-mono text-sm font-semibold tracking-widest text-matcha-strong">
          {code ?? '······'}
        </span>
      ) : (
        <Button size="sm" variant="primary" className="shrink-0" onClick={() => twitch.signIn()}>
          <LogIn /> {m.signInAgain}
        </Button>
      )}
    </div>
  );
}

function RedemptionRow({ entry }: { entry: RedemptionEntry }) {
  const m = useMessages().redemptions;
  const locale = useLocale();
  const { dismiss } = useRedemptions();
  const { notice } = entry;
  const reward = rewardName(notice.meta, locale) ?? notice.systemText;
  const { cost, input } = redemptionDetails(notice);
  const dismissLabel = m.dismiss(reward);

  return (
    <motion.li
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      data-redemption={entry.key}
      className="flex gap-2 rounded-xl border border-line bg-tile-muted/60 py-2 pr-1.5 pl-3 text-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{reward}</span>
          {cost !== undefined ? (
            <span className="shrink-0 font-mono text-xs text-matcha-strong dark:text-matcha">{m.points(cost)}</span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-2 text-xs text-ink-soft">
          <span className="min-w-0 truncate">{notice.author?.displayName}</span>
          <time className="shrink-0 font-mono text-[11px] text-ink-faint">{formatClock(notice.timestamp)}</time>
        </div>
        {input ? <p className="mt-1 text-ink [overflow-wrap:anywhere]">{input}</p> : null}
      </div>
      <Hint label={dismissLabel} side="left">
        <Button
          size="sm"
          variant="ghost"
          className="size-7 shrink-0 rounded-full px-0"
          aria-label={dismissLabel}
          onClick={() => dismiss(entry.key)}
        >
          <X />
        </Button>
      </Hint>
    </motion.li>
  );
}
