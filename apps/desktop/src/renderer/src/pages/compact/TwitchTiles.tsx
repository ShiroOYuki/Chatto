import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, LoadingSpinner, Tile } from '../../components/kit';
import { twitch, twitchStatus } from '../../services/twitch';

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
          <Button variant="primary" disabled={!clientId.trim()} onClick={() => twitch.setClientId(clientId)}>
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
          <Button variant="ghost" onClick={() => twitch.cancelSignIn()}>
            取消
          </Button>
        }
      >
        <p className="text-sm text-ink-soft">在 Twitch 授權頁輸入這組代碼：</p>
        <div className="my-2 rounded-2xl bg-tile-muted py-3 text-center font-mono text-3xl font-semibold tracking-[0.2em] text-matcha-strong">
          {auth.deviceCode?.userCode ?? '······'}
        </div>
        {auth.deviceCode ? (
          <Button className="mt-auto" onClick={() => twitch.openVerificationPage(state)}>
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
          <Button variant="ghost" onClick={() => twitch.signOut()}>
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
      <Button variant="primary" className="mt-auto" onClick={() => twitch.signIn()}>
        用 Twitch 登入
      </Button>
    </Tile>
  );
}

export function ChannelTile({ state }: { state: AppState }) {
  const [login, setLogin] = useState(state.channel.login ?? '');
  const { signedIn, connected, busy } = twitchStatus(state);

  return (
    <Tile title="聊天室頻道" className="col-span-2">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          twitch.connect(login);
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
          <Button className="h-11" onClick={() => twitch.disconnect()}>
            中斷
          </Button>
        ) : (
          <Button type="submit" variant="primary" className="h-11" disabled={!signedIn || busy || !login.trim()}>
            {busy ? (
              <>
                <LoadingSpinner /> 連線中…
              </>
            ) : (
              '連線'
            )}
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
