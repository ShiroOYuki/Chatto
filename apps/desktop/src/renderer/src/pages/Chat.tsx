import type { UserRole } from '@chatto/core';
import { ArrowDown, Eraser, Pause, Play, Search, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { ChatLine, NoticeLine, userColor } from '../components/ChatLine';
import { redemptionColumn, RedemptionsTile } from './RedemptionsTile';
import { RollingNumber, Stagger } from '../components/motion';
import { Button, EmptyState, Hint, PageHeader, Segmented, Sparkline, Tile, Toggle } from '../components/kit';
import { useMessages } from '../i18n';
import { useChatLog, useRedemptions } from '../store';

type RoleFilter = 'all' | 'moderator' | 'subscriber' | 'vip';

const ROLE_MATCH: Record<Exclude<RoleFilter, 'all'>, UserRole[]> = {
  moderator: ['moderator', 'broadcaster'],
  subscriber: ['subscriber', 'founder'],
  vip: ['vip'],
};

export function ChatPage({ state }: { state: AppState }) {
  const m = useMessages().chat;
  const { entries, stats, clear } = useChatLog();
  const column = redemptionColumn(useRedemptions().entries.length > 0);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [showDeleted, setShowDeleted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState(entries);
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (!paused) setFrozen(entries);
  }, [entries, paused]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return frozen.filter((entry) => {
      if (entry.kind === 'notice') return role === 'all' && !needle;
      if (!showDeleted && entry.deleted) return false;
      if (role !== 'all' && !entry.message.author.roles.some((item) => ROLE_MATCH[role].includes(item))) return false;
      if (!needle) return true;
      return (
        entry.message.text.toLowerCase().includes(needle) ||
        entry.message.author.displayName.toLowerCase().includes(needle) ||
        entry.message.author.login.includes(needle)
      );
    });
  }, [frozen, query, role, showDeleted]);

  const topChatters = useMemo(() => {
    const counts = new Map<string, { name: string; color?: string; count: number }>();
    for (const entry of entries) {
      if (entry.kind !== 'message') continue;
      const { author } = entry.message;
      const current = counts.get(author.id) ?? { name: author.displayName, color: author.color, count: 0 };
      current.count += 1;
      counts.set(author.id, current);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [entries]);

  useEffect(() => {
    const list = listRef.current;
    if (list && atBottom) list.scrollTop = list.scrollHeight;
  }, [visible, atBottom]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={m.title} description={m.description} />
      <Stagger className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-3">
        <Tile className="min-h-0 p-0!">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="flex h-9 min-w-40 flex-1 items-center gap-2 rounded-xl border border-line bg-canvas px-3 focus-within:border-matcha">
              <Search className="size-4 text-ink-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={m.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {/* Narrow windows: the filters move to a second line, pause and clear stay beside the search as icons. */}
            <div className="max-[1180px]:order-last">
              <Segmented
                size="sm"
                value={role}
                onChange={setRole}
                options={[
                  { value: 'all', label: m.roles.all },
                  { value: 'moderator', label: m.roles.moderator },
                  { value: 'subscriber', label: m.roles.subscriber },
                  { value: 'vip', label: m.roles.vip },
                ]}
              />
            </div>
            <label className="flex items-center gap-2 text-xs whitespace-nowrap text-ink-soft max-[1180px]:order-last">
              <Toggle checked={showDeleted} onChange={setShowDeleted} label={m.showDeleted} />
              {m.deleted}
            </label>
            <Hint label={paused ? m.resume : m.pause}>
              <Button
                size="sm"
                variant={paused ? 'primary' : 'secondary'}
                aria-label={paused ? m.resume : m.pause}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play /> : <Pause />}
                <span className="max-[1180px]:sr-only">{paused ? m.resume : m.pause}</span>
              </Button>
            </Hint>
            <Hint label={m.clearHint}>
              <Button size="sm" variant="ghost" onClick={clear} aria-label={m.clear}>
                <Eraser />
              </Button>
            </Hint>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={listRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
              }}
              className="absolute inset-0 overflow-y-auto p-2"
            >
              {visible.length === 0 ? (
                <EmptyState
                  title={entries.length === 0 ? m.noMessages : m.noMatches}
                  hint={entries.length === 0 ? m.noMessagesHint : m.noMatchesHint}
                />
              ) : (
                visible.map((entry) =>
                  entry.kind === 'message' ? (
                    <ChatLine key={entry.id} message={entry.message} deleted={entry.deleted} />
                  ) : (
                    <NoticeLine key={entry.id} notice={entry.notice} members={entry.members} />
                  ),
                )
              )}
            </div>
            {!atBottom ? (
              <Button
                size="sm"
                variant="primary"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
                onClick={() => setAtBottom(true)}
              >
                <ArrowDown /> {m.jumpToLatest}
              </Button>
            ) : null}
          </div>
        </Tile>

        <div className="flex min-h-0 flex-col gap-3">
          <Tile title={m.rate}>
            <div className="flex items-baseline gap-1.5">
              <RollingNumber value={stats.rate} className="font-mono text-4xl font-semibold" />
              <span className="text-xs text-ink-faint">{m.perMinute}</span>
            </div>
            <Sparkline values={stats.history} className="mt-3 h-12" />
          </Tile>
          <RedemptionsTile state={state} className={column.tile} />
          <Tile title={m.topChatters} icon={<Trophy />} className={`min-h-0 flex-1 overflow-hidden ${column.other}`}>
            {topChatters.length === 0 ? (
              <p className="text-xs text-ink-faint">{m.noData}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {topChatters.map((chatter, index) => (
                  <li key={chatter.name} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-right font-mono text-xs text-ink-faint">{index + 1}</span>
                    <span
                      className={`min-w-0 flex-1 truncate font-medium ${chatter.color ? 'user-color' : ''}`}
                      style={userColor(chatter.color)}
                    >
                      {chatter.name}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">{chatter.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Tile>
        </div>
      </Stagger>
    </div>
  );
}
