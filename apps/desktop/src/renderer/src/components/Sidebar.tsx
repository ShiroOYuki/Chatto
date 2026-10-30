import { Cable, Home, MessagesSquare, MonitorUp, Palette, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useChatLog } from '../store';
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
      {PAGES.map((item) => {
        const active = item.id === page;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition [&>svg]:size-[18px] ${
              active ? 'bg-tile font-medium text-ink shadow-sm' : 'text-ink-soft hover:bg-tile/60 hover:text-ink'
            }`}
          >
            <span className={active ? 'text-matcha' : 'text-ink-faint group-hover:text-ink-soft'}>{item.icon}</span>
            {item.label}
            {item.id === 'chat' && stats.rate > 0 ? (
              <span className="ml-auto rounded-full bg-matcha-soft/60 px-2 font-mono text-[11px] text-matcha-strong">
                {stats.rate}
              </span>
            ) : null}
          </button>
        );
      })}

      <div className="mt-auto rounded-2xl border border-line bg-tile p-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-tile-muted p-1">
            <TeaCup mood={mood} size={40} />
          </div>
          <p className="text-xs leading-relaxed text-ink-soft">{MOOD_LINE[mood]}</p>
        </div>
      </div>
      <p className="px-2 pt-2 text-[11px] text-ink-faint">Chatto v{state.appInfo.version}</p>
    </nav>
  );
}
