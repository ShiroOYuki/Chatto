import { BellRing, Cable, Home, MessagesSquare, MonitorUp, Palette, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useMessages } from '../i18n';
import { useChatLog } from '../store';
import { motion, RollingNumber, spring } from './motion';
import { TeaCup, type TeaCupMood } from './TeaCup';

export type PageId = 'overview' | 'chat' | 'themes' | 'outputs' | 'alerts' | 'connections' | 'settings';

/** Pages in sidebar order; their names live in `useMessages().shell.pages`. */
export const PAGES: { id: PageId; icon: ReactNode }[] = [
  { id: 'overview', icon: <Home /> },
  { id: 'chat', icon: <MessagesSquare /> },
  { id: 'themes', icon: <Palette /> },
  { id: 'outputs', icon: <MonitorUp /> },
  { id: 'alerts', icon: <BellRing /> },
  { id: 'connections', icon: <Cable /> },
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
        <motion.span
          layoutId="nav-active"
          transition={spring}
          className="absolute inset-0 rounded-xl bg-tile shadow-sm"
        />
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

export function Sidebar({
  state,
  page,
  onNavigate,
}: {
  state: AppState;
  page: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const m = useMessages().shell;
  const { stats } = useChatLog();
  const mood = moodFor(state, stats.rate);

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

      <div className="mt-auto rounded-2xl border border-line bg-tile p-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-tile-muted p-1">
            <TeaCup mood={mood} size={40} />
          </div>
          <p className="text-xs leading-relaxed text-ink-soft">{m.mood[mood]}</p>
        </div>
      </div>

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
