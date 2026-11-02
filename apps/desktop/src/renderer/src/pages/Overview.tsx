import { ArrowRight, Eraser, MessageCircle, MonitorUp, Palette, Sparkles, Users } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { overlay } from '../services/overlay';
import { ChatLine, NoticeLine } from '../components/ChatLine';
import type { PageId } from '../components/Sidebar';
import { moodFor } from '../components/Sidebar';
import { RollingNumber, Stagger } from '../components/motion';
import { TeaCup } from '../components/TeaCup';
import { BorderBeam } from '../components/ui/border-beam';
import { Button, CopyField, EmptyState, Sparkline, channelTone, StatusDot, Tile, Toggle } from '../components/kit';
import { useMessages, useThemeName } from '../i18n';
import { useChatLog, type LogEntry } from '../store';

/** Enough to fill a 4K-tall tile; the rest is clipped. */
const RECENT_MESSAGES = 60;
/** The activity list scrolls, so it keeps a longer history. */
const RECENT_NOTICES = 100;

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Tile className="justify-between gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-tile-muted text-matcha [&>svg]:size-[18px]">
        {icon}
      </span>
      <div>
        <RollingNumber value={value} className="font-mono text-3xl font-semibold" />
        <div className="text-xs text-ink-faint">{label}</div>
      </div>
    </Tile>
  );
}

/**
 * Newest activity first, scrolling inside its tile. The bottom fades while
 * there is more below, so a cut-off row reads as "scroll for more".
 */
function RecentNotices({ entries }: { entries: LogEntry[] }) {
  const [moreBelow, setMoreBelow] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const measure = useCallback(() => {
    const el = list.current;
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useLayoutEffect(measure, [measure, entries]);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={list}
      data-testid="recent-notices"
      onScroll={measure}
      className={`-mx-2 -mb-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2 ${
        moreBelow ? 'mask-b-from-[calc(100%-2rem)]' : ''
      }`}
    >
      {entries.map((entry) =>
        entry.kind === 'notice' ? <NoticeLine key={entry.id} notice={entry.notice} members={entry.members} /> : null,
      )}
    </div>
  );
}

export function OverviewPage({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const m = useMessages().overview;
  const nameOf = useThemeName();
  const { entries, stats } = useChatLog();
  const connected = state.channel.state === 'connected';
  // Render more than fits; the chat tile clips what does not fit, so bigger windows show more.
  const recentMessages = entries.filter((entry) => entry.kind === 'message').slice(-RECENT_MESSAGES);
  const recentNotices = entries
    .filter((entry) => entry.kind === 'notice')
    .slice(-RECENT_NOTICES)
    .reverse();
  const themeName = (target: 'overlay' | 'embed') => {
    const theme = state.themes.find((item) => item.id === state.selectedThemes[target]);
    return theme ? nameOf(theme) : '—';
  };

  return (
    // Fills the viewport: the stats rows keep their content height and the chat row takes the rest.
    // Below the minimum height the page scrolls instead of squeezing the tiles.
    <Stagger className="grid h-full min-h-[520px] grid-cols-6 grid-rows-[minmax(132px,auto)_auto_minmax(160px,1fr)] gap-3">
      {/* Hero */}
      <Tile className="relative col-span-2 row-span-2 justify-between overflow-hidden border-transparent! bg-matcha-strong! text-on-matcha">
        {connected ? (
          <BorderBeam size={140} duration={7} borderWidth={2} colorFrom="#f4f9ee" colorTo="#c0dd97" />
        ) : null}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <StatusDot tone={channelTone(state.channel.state, connected)} />
              {m.channelState[state.channel.state]}
            </div>
            <div className="mt-1 text-xl font-semibold">{state.channel.login ?? m.noChannel}</div>
          </div>
          <div className="rounded-full bg-[#f4f9ee] p-2">
            <TeaCup mood={moodFor(state, stats.rate)} size={64} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <RollingNumber value={stats.rate} className="font-mono text-6xl font-semibold" />
            <span className="text-sm opacity-80">{m.perMinute}</span>
          </div>
          <Sparkline
            values={stats.history}
            className="mt-3 h-14 [&>span]:bg-on-matcha/30! [&>span:last-child]:bg-on-matcha!"
          />
          <div className="mt-1 flex justify-between text-[11px] opacity-60">
            <span>{m.thirtyMinutesAgo}</span>
            <span>{m.now}</span>
          </div>
        </div>
      </Tile>

      <Stat icon={<MessageCircle />} label={m.totalMessages} value={stats.totalMessages} />
      <Stat icon={<Users />} label={m.chatters} value={stats.uniqueChatters} />
      <Stat icon={<Sparkles />} label={m.notices} value={stats.noticeCount} />
      <Stat icon={<Eraser />} label={m.deleted} value={stats.deletedCount} />

      {/* Outputs quick controls */}
      <Tile
        title={m.outputs}
        icon={<MonitorUp />}
        className="col-span-2"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('outputs')}>
            {m.outputSettings} <ArrowRight />
          </Button>
        }
      >
        <div className="flex items-center justify-between rounded-2xl bg-tile-muted px-4 py-2.5">
          <div>
            <div className="text-sm font-medium">{m.desktopOverlay}</div>
            <div className="text-xs text-ink-faint">{state.overlay.enabled ? m.overlayShown : m.overlayHidden}</div>
          </div>
          <Toggle checked={state.overlay.enabled} label={m.desktopOverlay} onChange={(v) => overlay.setEnabled(v)} />
        </div>
        <div className="mt-2">
          <CopyField label={m.obsSource} value={state.server.embedUrl} />
        </div>
      </Tile>

      <Tile
        title={m.themesInUse}
        icon={<Palette />}
        className="col-span-2"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('themes')}>
            {m.changeTheme} <ArrowRight />
          </Button>
        }
      >
        <dl className="grid grid-cols-2 gap-2">
          {(['overlay', 'embed'] as const).map((target) => (
            <div key={target} className="rounded-2xl bg-tile-muted px-4 py-3">
              <dt className="text-xs text-ink-faint">{target === 'overlay' ? m.desktopOverlay : 'OBS'}</dt>
              <dd className="mt-0.5 truncate font-medium">{themeName(target)}</dd>
            </div>
          ))}
        </dl>
      </Tile>

      {/* Live chat */}
      <Tile
        title={m.latestMessages}
        icon={<MessageCircle />}
        className="col-span-4 min-h-0 overflow-hidden"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('chat')}>
            {m.openChat} <ArrowRight />
          </Button>
        }
      >
        {recentMessages.length === 0 ? (
          <EmptyState title={m.noMessages} hint={m.noMessagesHint} />
        ) : (
          <div
            data-testid="recent-messages"
            className="-mx-3 flex min-h-0 flex-1 flex-col justify-end overflow-hidden mask-t-from-[calc(100%-2rem)]"
          >
            {recentMessages.map((entry) =>
              entry.kind === 'message' ? (
                <ChatLine key={entry.id} message={entry.message} deleted={entry.deleted} />
              ) : null,
            )}
          </div>
        )}
      </Tile>

      <Tile title={m.recentActivity} icon={<Sparkles />} className="col-span-2 min-h-0 overflow-hidden">
        {recentNotices.length === 0 ? (
          <EmptyState mood="happy" title={m.noActivity} hint={m.noActivityHint} />
        ) : (
          <RecentNotices entries={recentNotices} />
        )}
      </Tile>
    </Stagger>
  );
}
