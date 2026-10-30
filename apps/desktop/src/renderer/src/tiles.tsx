import { ChatView, startMockStream, useChatFeed } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { useEffect, useState } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { TeaCup, type TeaCupMood } from './components/TeaCup';
import { Button, StatusDot, Tile, Toggle } from './components/ui';

const STATE_LABEL: Record<AppState['channel']['state'], string> = {
  idle: '尚未連線',
  connecting: '連線中…',
  connected: '已連上聊天室',
  reconnecting: '重新連線中…',
  error: '連線出了點問題',
  closed: '已中斷',
};

function moodFor(state: AppState, rate: number): TeaCupMood {
  if (state.channel.state === 'error') return 'worried';
  if (state.channel.state !== 'connected') return 'sleepy';
  return rate >= 30 ? 'busy' : 'happy';
}

export function HeroTile({ state, rate }: { state: AppState; rate: number }) {
  const connected = state.channel.state === 'connected';
  return (
    <Tile className="row-span-2 justify-between bg-matcha-strong! text-on-matcha border-transparent!">
      <div className="flex items-center gap-2 text-lg font-medium">
        Chatto <span className="text-sm opacity-70">チャット</span>
      </div>
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-[#f4f9ee] p-3">
          <TeaCup mood={moodFor(state, rate)} size={104} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm opacity-90">
          <StatusDot tone={connected ? 'ok' : state.channel.state === 'error' ? 'error' : 'idle'} />
          {STATE_LABEL[state.channel.state]}
          {state.channel.login ? <span className="opacity-70">· {state.channel.login}</span> : null}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-5xl font-semibold tabular-nums">{rate}</span>
          <span className="text-sm opacity-80">則／分鐘</span>
        </div>
      </div>
    </Tile>
  );
}

export function AccountTile({ state }: { state: AppState }) {
  const [clientId, setClientId] = useState('');
  const { auth } = state;

  if (!state.clientIdConfigured) {
    return (
      <Tile title="Twitch 帳號">
        <p className="mb-3 text-sm text-ink-soft">先填入你的 Twitch 應用程式 Client ID（類型選 Public）。</p>
        <div className="mt-auto flex gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 text-sm outline-none focus:border-matcha"
            placeholder="Client ID"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
          <Button variant="primary" disabled={!clientId.trim()} onClick={() => void api.setClientId(clientId)}>
            儲存
          </Button>
        </div>
      </Tile>
    );
  }

  if (auth.status === 'pending') {
    return (
      <Tile
        title="Twitch 帳號"
        action={
          <Button variant="ghost" onClick={() => void api.cancelSignIn()}>
            取消
          </Button>
        }
      >
        <p className="text-sm text-ink-soft">在 Twitch 授權頁輸入這組代碼：</p>
        <div className="my-2 rounded-2xl bg-tile-muted py-3 text-center font-mono text-3xl font-semibold tracking-[0.2em] text-matcha-strong">
          {auth.deviceCode?.userCode ?? '······'}
        </div>
        {auth.deviceCode ? (
          <Button className="mt-auto" onClick={() => void api.openExternal(auth.deviceCode!.verificationUri)}>
            重新開啟授權頁
          </Button>
        ) : null}
      </Tile>
    );
  }

  if (auth.status === 'signed-in') {
    return (
      <Tile
        title="Twitch 帳號"
        action={
          <Button variant="ghost" onClick={() => void api.signOut()}>
            登出
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-matcha-soft text-lg font-semibold text-matcha-strong">
            {auth.login?.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{auth.login}</div>
            <div className="text-xs text-ink-faint">已登入</div>
          </div>
        </div>
      </Tile>
    );
  }

  return (
    <Tile title="Twitch 帳號">
      <p className="text-sm text-ink-soft">登入後才能讀取聊天室，Chatto 只會要求讀取聊天的權限。</p>
      {auth.error ? <p className="mt-2 text-xs text-danger">{auth.error}</p> : null}
      <Button variant="primary" className="mt-auto" onClick={() => void api.signIn()}>
        用 Twitch 登入
      </Button>
    </Tile>
  );
}

export function ChannelTile({ state }: { state: AppState }) {
  const [login, setLogin] = useState(state.channel.login ?? '');
  const busy = state.channel.state === 'connecting' || state.channel.state === 'reconnecting';
  const connected = state.channel.state === 'connected';
  const signedIn = state.auth.status === 'signed-in';

  return (
    <Tile title="聊天室頻道" className="col-span-2">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void api.connect(login).catch(() => undefined);
        }}
      >
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-line bg-canvas pl-4 focus-within:border-matcha">
          <span className="text-sm text-ink-faint">twitch.tv/</span>
          <input
            className="h-full min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="shiraine_ciel"
            disabled={!signedIn}
          />
        </div>
        {connected ? (
          <Button className="h-11" onClick={() => void api.disconnect()}>
            中斷
          </Button>
        ) : (
          <Button type="submit" variant="primary" className="h-11" disabled={!signedIn || busy || !login.trim()}>
            {busy ? '連線中…' : '連線'}
          </Button>
        )}
      </form>
      <p className={`mt-3 text-xs ${state.channel.state === 'error' ? 'text-danger' : 'text-ink-faint'}`}>
        {state.channel.state === 'error'
          ? state.channel.detail
          : signedIn
            ? '可以輸入自己或任何頻道的名稱。'
            : '先登入 Twitch，再選擇要讀取的頻道。'}
      </p>
    </Tile>
  );
}

export function OverlayTile({ state }: { state: AppState }) {
  const { enabled, editing } = state.overlay;
  return (
    <Tile
      title="桌面 Overlay"
      action={<Toggle checked={enabled} label="桌面 Overlay" onChange={(v) => void api.setOverlayEnabled(v)} />}
    >
      <p className="text-sm text-ink-soft">透明聊天室浮在所有視窗上方，滑鼠可以直接穿過。</p>
      <Button className="mt-auto" disabled={!enabled} onClick={() => void api.setOverlayEditing(!editing)}>
        {editing ? '完成調整' : '調整位置與大小'}
      </Button>
    </Tile>
  );
}

export function EmbedTile({ state }: { state: AppState }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(state.server.embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Tile title="OBS 瀏覽器來源" className="col-span-2">
      <div className="flex items-center gap-2 rounded-2xl bg-tile-muted p-2 pl-4">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-matcha-strong">{state.server.embedUrl}</code>
        <Button variant="primary" onClick={() => void copy()}>
          {copied ? '複製好了 ✓' : '複製網址'}
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        在 OBS 新增「瀏覽器」來源並貼上網址，建議寬 420、高 600。背景會自動透明。
      </p>
    </Tile>
  );
}

export function ThemeTile({
  state,
  target,
  onTargetChange,
}: {
  state: AppState;
  target: ViewerTarget;
  onTargetChange: (target: ViewerTarget) => void;
}) {
  const selected = state.selectedThemes[target];
  return (
    <Tile
      title="聊天室主題"
      className="col-span-2 row-span-2"
      action={
        <div className="flex rounded-full bg-tile-muted p-1 text-xs">
          {(['overlay', 'embed'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTargetChange(item)}
              className={`rounded-full px-3 py-1 transition ${target === item ? 'bg-tile font-medium text-ink shadow-sm' : 'text-ink-soft'}`}
            >
              {item === 'overlay' ? '桌面 Overlay' : 'OBS'}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {state.themes.map((theme) => (
          <ThemeChip
            key={theme.id}
            theme={theme}
            active={theme.id === selected}
            onSelect={() => void api.selectTheme(target, theme.id)}
          />
        ))}
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <Button className="flex-1" disabled title="下一個里程碑：主題編輯器">
          複製並編輯
        </Button>
        <Button variant="ghost" disabled title="下一個里程碑：匯入 JSON">
          匯入
        </Button>
      </div>
    </Tile>
  );
}

function ThemeChip({ theme, active, onSelect }: { theme: ChatTheme; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-2xl border p-2 text-left text-sm transition ${
        active ? 'border-matcha bg-matcha-soft/40' : 'border-line hover:bg-tile-muted'
      }`}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-xl border border-line"
        style={{ background: theme.palette.surface === 'transparent' ? theme.palette.name : theme.palette.surface }}
      />
      <span className="min-w-0">
        <span className="block truncate font-medium">{theme.name}</span>
        <span className="block text-xs text-ink-faint">{theme.layout}</span>
      </span>
    </button>
  );
}

export function PreviewTile({ state, target }: { state: AppState; target: ViewerTarget }) {
  const theme = state.themes.find((item) => item.id === state.selectedThemes[target]) ?? state.themes[0]!;
  const feed = useChatFeed(theme.options);
  const { push } = feed;
  useEffect(() => startMockStream(push, 1800), [push]);

  return (
    <Tile
      title="即時預覽"
      className="col-span-2 row-span-2"
      action={<span className="text-xs text-ink-faint">{theme.name}</span>}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl p-3"
        style={{
          background:
            'radial-gradient(circle at 20% 25%, #3b6d11 0, transparent 45%), radial-gradient(circle at 85% 75%, #0f6e56 0, transparent 50%), #1b2230',
        }}
      >
        <ChatView theme={theme} items={feed.items} />
      </div>
    </Tile>
  );
}
