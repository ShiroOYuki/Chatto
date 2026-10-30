import { ExternalLink, KeyRound, LogOut, Plug, PlugZap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { Stagger } from '../components/motion';
import { Badge, Button, Field, PageHeader, StatusDot, TextInput, Tile } from '../components/ui';

function PlatformMark({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="grid size-10 place-items-center rounded-2xl text-sm font-bold text-white"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

const STATE_TEXT: Record<AppState['channel']['state'], string> = {
  idle: '尚未連線',
  connecting: '連線中…',
  connected: '已連線',
  reconnecting: '重新連線中…',
  error: '連線失敗',
  closed: '已中斷',
};

function TwitchCard({ state }: { state: AppState }) {
  const [clientId, setClientId] = useState('');
  const [editingClientId, setEditingClientId] = useState(!state.clientIdConfigured);
  const [login, setLogin] = useState(state.channel.login ?? '');
  const { auth, channel } = state;
  const signedIn = auth.status === 'signed-in';
  const connected = channel.state === 'connected';
  const busy = channel.state === 'connecting' || channel.state === 'reconnecting';

  return (
    <Tile className="col-span-2 gap-5">
      <header className="flex items-center gap-3">
        <PlatformMark color="#9146FF">Tw</PlatformMark>
        <div className="flex-1">
          <h2 className="font-semibold">Twitch</h2>
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <StatusDot tone={connected ? 'ok' : channel.state === 'error' ? 'error' : 'idle'} />
            {STATE_TEXT[channel.state]}
            {connected && channel.login ? ` · ${channel.login}` : ''}
          </p>
        </div>
        <Badge tone="matcha">EventSub</Badge>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {/* Step 1: client id */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-matcha" /> 1. 應用程式
          </h3>
          {editingClientId ? (
            <>
              <Field label="Client ID" hint="在 Twitch Developer Console 建立，類型選 Public。">
                <TextInput
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="貼上 Client ID"
                />
              </Field>
              <div className="mt-auto flex gap-2">
                <Button
                  variant="primary"
                  disabled={!clientId.trim()}
                  onClick={() => {
                    void api.setClientId(clientId);
                    setEditingClientId(false);
                  }}
                >
                  儲存
                </Button>
                <Button variant="ghost" onClick={() => void api.openExternal('https://dev.twitch.tv/console/apps')}>
                  <ExternalLink /> 開啟 Console
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Client ID 已設定。</p>
              <Button className="mt-auto self-start" size="sm" onClick={() => setEditingClientId(true)}>
                更換
              </Button>
            </>
          )}
        </section>

        {/* Step 2: account */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Plug className="size-4 text-matcha" /> 2. 帳號
          </h3>
          {auth.status === 'pending' ? (
            <>
              <p className="text-sm text-ink-soft">在 Twitch 授權頁輸入：</p>
              <div className="rounded-xl bg-tile py-2 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-matcha-strong">
                {auth.deviceCode?.userCode ?? '······'}
              </div>
              <div className="mt-auto flex gap-2">
                {auth.deviceCode ? (
                  <Button size="sm" onClick={() => void api.openExternal(auth.deviceCode!.verificationUri)}>
                    重新開啟授權頁
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => void api.cancelSignIn()}>
                  取消
                </Button>
              </div>
            </>
          ) : signedIn ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-matcha-soft text-matcha-strong">
                  {auth.login?.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="font-medium">{auth.login}</div>
                  <div className="text-xs text-ink-faint">權限：讀取聊天室</div>
                </div>
              </div>
              <Button className="mt-auto self-start" size="sm" variant="ghost" onClick={() => void api.signOut()}>
                <LogOut /> 登出
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Chatto 只會要求讀取聊天室的權限。</p>
              {auth.error ? <p className="text-xs text-danger">{auth.error}</p> : null}
              <Button
                className="mt-auto self-start"
                variant="primary"
                disabled={!state.clientIdConfigured}
                onClick={() => void api.signIn()}
              >
                用 Twitch 登入
              </Button>
            </>
          )}
        </section>

        {/* Step 3: channel */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <PlugZap className="size-4 text-matcha" /> 3. 頻道
          </h3>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void api.connect(login).catch(() => undefined);
            }}
          >
            <Field label="頻道名稱" hint="可以是自己或任何頻道。">
              <TextInput
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="shiraine_ciel"
                disabled={!signedIn}
              />
            </Field>
            {connected ? (
              <Button className="self-start" onClick={() => void api.disconnect()}>
                中斷連線
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                className="self-start"
                disabled={!signedIn || busy || !login.trim()}
              >
                {busy ? '連線中…' : '連線'}
              </Button>
            )}
            {channel.state === 'error' ? <p className="text-xs text-danger">{channel.detail}</p> : null}
          </form>
        </section>
      </div>
    </Tile>
  );
}

function ComingSoon({ name, color, mark }: { name: string; color: string; mark: string }) {
  return (
    <Tile className="flex-row! items-center gap-3 opacity-70">
      <PlatformMark color={color}>{mark}</PlatformMark>
      <div className="flex-1">
        <h2 className="font-semibold">{name}</h2>
        <p className="text-xs text-ink-faint">標準化格式已預留，之後加入。</p>
      </div>
      <Badge>規劃中</Badge>
    </Tile>
  );
}

export function ConnectionsPage({ state }: { state: AppState }) {
  return (
    <div>
      <PageHeader title="連線" description="管理直播平台的帳號與聊天室來源。" />
      <Stagger className="grid grid-cols-2 gap-3">
        <TwitchCard state={state} />
        <ComingSoon name="YouTube" color="#E62117" mark="YT" />
        <ComingSoon name="Kick" color="#2D9D3A" mark="K" />
      </Stagger>
    </div>
  );
}
