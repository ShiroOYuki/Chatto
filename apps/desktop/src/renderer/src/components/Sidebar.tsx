import { Cable, Home, MessagesSquare, MonitorUp, Palette, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useChatLog } from '../store';
import { motion, RollingNumber, spring } from './motion';
import { TeaCup, type TeaCupMood } from './TeaCup';

export type PageId = 'overview' | 'chat' | 'themes' | 'outputs' | 'connections' | 'settings';

export const PAGES: { id: PageId; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: '總覽', icon: <Home /> },
  { id: 'chat', label: '聊天室', icon: <MessagesSquare /> },
  { id: 'themes', label: '主題', icon: <Palette /> },
  { id: 'outputs', label: '輸出', icon: <MonitorUp /> },
  { id: 'connections', label: '連線', icon: <Cable /> },
  { id: 'settings', label: '設定', icon: <Settings /> },
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
      <span className="relative">{item.label}</span>
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

const MOOD_LINE: Record<TeaCupMood, string> = {
  sleepy: '還沒連上，先泡杯茶',
  happy: '聊天室很溫暖',
  busy: '大家好熱情，茶要續杯了',
  worried: '連線好像出了點狀況',
};

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
          <p className="text-xs leading-relaxed text-ink-soft">{MOOD_LINE[mood]}</p>
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
