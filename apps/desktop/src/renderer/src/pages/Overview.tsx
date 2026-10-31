import { ArrowRight, Eraser, MessageCircle, MonitorUp, Palette, Sparkles, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { ChatLine, NoticeLine } from '../components/ChatLine';
import type { PageId } from '../components/Sidebar';
import { moodFor } from '../components/Sidebar';
import { RollingNumber, Stagger } from '../components/motion';
import { TeaCup } from '../components/TeaCup';
import { BorderBeam } from '../components/ui/border-beam';
import { Button, CopyField, EmptyState, Sparkline, channelTone, StatusDot, Tile, Toggle } from '../components/kit';
import { useChatLog } from '../store';

const STATE_LABEL: Record<AppState['channel']['state'], string> = {
  idle: '尚未連線',
  connecting: '連線中…',
  connected: '直播聊天室已連線',
  reconnecting: '重新連線中…',
  error: '連線出了點問題',
  closed: '已中斷',
};

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

export function OverviewPage({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const { entries, stats } = useChatLog();
  const connected = state.channel.state === 'connected';
  const recentMessages = entries.filter((entry) => entry.kind === 'message').slice(-9);
  const recentNotices = entries
    .filter((entry) => entry.kind === 'notice')
    .slice(-4)
    .reverse();
  const themeName = (target: 'overlay' | 'embed') =>
    state.themes.find((theme) => theme.id === state.selectedThemes[target])?.name ?? '—';

  return (
    <Stagger className="grid auto-rows-[minmax(132px,auto)] grid-cols-6 gap-3">
      {/* Hero */}
      <Tile className="relative col-span-2 row-span-2 justify-between overflow-hidden border-transparent! bg-matcha-strong! text-on-matcha">
        {connected ? (
          <BorderBeam size={140} duration={7} borderWidth={2} colorFrom="#f4f9ee" colorTo="#c0dd97" />
        ) : null}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <StatusDot tone={channelTone(state.channel.state, connected)} />
              {STATE_LABEL[state.channel.state]}
            </div>
            <div className="mt-1 text-xl font-semibold">{state.channel.login ?? '還沒選擇頻道'}</div>
          </div>
          <div className="rounded-full bg-[#f4f9ee] p-2">
            <TeaCup mood={moodFor(state, stats.rate)} size={64} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <RollingNumber value={stats.rate} className="font-mono text-6xl font-semibold" />
            <span className="text-sm opacity-80">則／分鐘</span>
          </div>
          <Sparkline
            values={stats.history}
            className="mt-3 h-14 [&>span]:bg-on-matcha/30! [&>span:last-child]:bg-on-matcha!"
          />
          <div className="mt-1 flex justify-between text-[11px] opacity-60">
            <span>30 分鐘前</span>
            <span>現在</span>
          </div>
        </div>
      </Tile>

      <Stat icon={<MessageCircle />} label="本次訊息" value={stats.totalMessages} />
      <Stat icon={<Users />} label="參與的聊天者" value={stats.uniqueChatters} />
      <Stat icon={<Sparkles />} label="訂閱與活動" value={stats.noticeCount} />
      <Stat icon={<Eraser />} label="已刪除訊息" value={stats.deletedCount} />

      {/* Outputs quick controls */}
      <Tile
        title="輸出"
        icon={<MonitorUp />}
        className="col-span-2"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('outputs')}>
            詳細設定 <ArrowRight />
          </Button>
        }
      >
        <div className="flex items-center justify-between rounded-2xl bg-tile-muted px-4 py-2.5">
          <div>
            <div className="text-sm font-medium">桌面 Overlay</div>
            <div className="text-xs text-ink-faint">{state.overlay.enabled ? '顯示中' : '已關閉'}</div>
          </div>
          <Toggle
            checked={state.overlay.enabled}
            label="桌面 Overlay"
            onChange={(v) => void api.setOverlayEnabled(v)}
          />
        </div>
        <div className="mt-2">
          <CopyField label="OBS 瀏覽器來源" value={state.server.embedUrl} />
        </div>
      </Tile>

      <Tile
        title="使用中的主題"
        icon={<Palette />}
        className="col-span-2"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('themes')}>
            更換 <ArrowRight />
          </Button>
        }
      >
        <dl className="grid grid-cols-2 gap-2">
          {(['overlay', 'embed'] as const).map((target) => (
            <div key={target} className="rounded-2xl bg-tile-muted px-4 py-3">
              <dt className="text-xs text-ink-faint">{target === 'overlay' ? '桌面 Overlay' : 'OBS'}</dt>
              <dd className="mt-0.5 truncate font-medium">{themeName(target)}</dd>
            </div>
          ))}
        </dl>
      </Tile>

      {/* Live chat */}
      <Tile
        title="最新留言"
        icon={<MessageCircle />}
        className="col-span-4 row-span-2"
        action={
          <Button size="sm" variant="ghost" onClick={() => onNavigate('chat')}>
            開啟聊天室 <ArrowRight />
          </Button>
        }
      >
        {recentMessages.length === 0 ? (
          <EmptyState title="還沒有人說話" hint="連上頻道後，新的留言會出現在這裡。" />
        ) : (
          <div className="-mx-3 flex flex-1 flex-col justify-end">
            {recentMessages.map((entry) =>
              entry.kind === 'message' ? (
                <ChatLine key={entry.id} message={entry.message} deleted={entry.deleted} />
              ) : null,
            )}
          </div>
        )}
      </Tile>

      <Tile title="最近活動" icon={<Sparkles />} className="col-span-2 row-span-2">
        {recentNotices.length === 0 ? (
          <EmptyState mood="happy" title="還沒有新活動" hint="訂閱、揪團和公告會顯示在這裡。" />
        ) : (
          <div className="flex flex-col">
            {recentNotices.map((entry) =>
              entry.kind === 'notice' ? <NoticeLine key={entry.id} notice={entry.notice} /> : null,
            )}
          </div>
        )}
      </Tile>
    </Stagger>
  );
}
