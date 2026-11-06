import { BellRing, CircleUserRound, Compass, Home, MessagesSquare, MonitorUp, Palette, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useMessages } from '../i18n';
import { twitchStatus } from '../services/twitch';
import { useChatLog } from '../store';
import { channelTone, StatusDot } from './kit';
import { motion, RollingNumber, SlidingHighlight } from './motion';
import type { TeaCupMood } from './TeaCup';

export type PageId = 'overview' | 'chat' | 'themes' | 'explore' | 'outputs' | 'alerts' | 'accounts' | 'settings';

/** Pages in sidebar order; their names live in `useMessages().shell.pages`. */
export const PAGES: { id: PageId; icon: ReactNode }[] = [
  { id: 'overview', icon: <Home /> },
  { id: 'chat', icon: <MessagesSquare /> },
  { id: 'themes', icon: <Palette /> },
  { id: 'explore', icon: <Compass /> },
  { id: 'outputs', icon: <MonitorUp /> },
  { id: 'alerts', icon: <BellRing /> },
  { id: 'accounts', icon: <CircleUserRound /> },
  { id: 'settings', icon: <Settings /> },
];

const SETTINGS = PAGES.find((item) => item.id === 'settings')!;

function NavItem({
  item,
  active,
  onClick,
  badge,
}: {
  item: (typeof PAGES)[number];
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const label = useMessages().shell.pages[item.id];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      className={`relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
        active ? 'font-medium text-ink' : 'text-ink-soft hover:bg-tile/50 hover:text-ink'
      }`}
    >
      {/* One shared highlight slides between items. */}
      {active ? (
        <SlidingHighlight layoutId="nav-active" className="absolute inset-0 rounded-xl bg-tile shadow-sm" />
      ) : null}
      <motion.span
        variants={{ hover: { rotate: [0, -14, 10, 0], scale: 1.12 } }}
        transition={{ duration: 0.45 }}
        className={`relative [&>svg]:size-[18px] ${active ? 'text-matcha' : 'text-ink-faint'}`}
      >
        {item.icon}
      </motion.span>
      <span className="relative">{label}</span>
      {badge !== undefined ? (
        <span className="relative ml-auto rounded-full bg-matcha-soft/60 px-2 font-mono text-[11px] text-matcha-strong">
          <RollingNumber value={badge} />
        </span>
      ) : null}
    </motion.button>
  );
}

export function moodFor(state: AppState, rate: number): TeaCupMood {
  if (state.channel.state === 'error') return 'worried';
  if (state.channel.state !== 'connected') return 'sleepy';
  return rate >= 30 ? 'busy' : 'happy';
}

/** The account card above Settings: the Chatto account and each platform's connection, opening the accounts page. */
function AccountCard({ state, active, onClick }: { state: AppState; active: boolean; onClick: () => void }) {
  const messages = useMessages();
  const m = messages.accounts.sidebar;
  const { channelState } = messages.connections;
  const session = state.share.session;
  const account = session.status === 'signed-in' ? session.account : null;
  const { connected } = twitchStatus(state);
  const name = account?.displayName ?? (session.status === 'pending' ? m.signingIn : m.signedOut);

  return (
    <button
      type="button"
      data-testid="sidebar-account"
      title={m.open}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`mt-auto flex w-full items-center gap-3 rounded-xl border bg-tile p-2.5 text-left transition-colors hover:bg-tile-muted ${
        active ? 'border-matcha/50' : 'border-line'
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-matcha-soft text-sm font-medium text-matcha-strong">
        {account ? account.displayName.slice(0, 1).toUpperCase() : <CircleUserRound className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${account ? 'font-medium text-ink' : 'text-ink-soft'}`}>{name}</span>
        {/* Name the platform's own state, so its dot does not read as the Chatto account's.
            It wraps rather than cuts: long states ("Connection failed") must stay readable. */}
        <span className="flex min-w-0 items-start gap-1.5 text-xs text-ink-faint">
          <span className="mt-[3px] flex shrink-0">
            <StatusDot tone={channelTone(state.channel.state, connected)} />
          </span>
          {/* Breaks only between the platform and its state, never inside the state. */}
          <span className="flex min-w-0 flex-wrap gap-x-1">
            <span className="whitespace-nowrap">Twitch ·</span>
            <span className="whitespace-nowrap">{channelState[state.channel.state]}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

export function Sidebar({
  state,
  page,
  onNavigate,
}: {
  state: AppState;
  page: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const { stats } = useChatLog();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-line bg-sidebar p-3">
      {PAGES.filter((item) => item.id !== 'settings').map((item) => (
        <NavItem
          key={item.id}
          item={item}
          active={item.id === page}
          onClick={() => onNavigate(item.id)}
          badge={item.id === 'chat' && stats.rate > 0 ? stats.rate : undefined}
        />
      ))}

      <AccountCard state={state} active={page === 'accounts'} onClick={() => onNavigate('accounts')} />

      {/* Settings lives in the bottom-left corner, apart from the main pages. */}
      <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
        <div className="flex-1">
          <NavItem item={SETTINGS} active={page === 'settings'} onClick={() => onNavigate('settings')} />
        </div>
        <span className="pr-2 text-[11px] text-ink-faint">v{state.appInfo.version}</span>
      </div>
    </nav>
  );
}
