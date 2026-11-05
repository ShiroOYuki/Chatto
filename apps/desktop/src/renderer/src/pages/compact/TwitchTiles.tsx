import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { UserRound } from 'lucide-react';
import { Button, Hint, LoadingSpinner, Tile } from '../../components/kit';
import { useMessages } from '../../i18n';
import { twitch, twitchStatus } from '../../services/twitch';

export function AccountTile({ state }: { state: AppState }) {
  const messages = useMessages();
  const m = messages.compact;
  const [clientId, setClientId] = useState('');
  const { auth } = state;

  if (state.clientId.source === 'none') {
    return (
      <Tile title={m.twitchAccount}>
        <p className="mb-3 text-sm text-ink-soft">{m.clientIdIntro}</p>
        <div className="mt-auto flex gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 text-sm outline-none focus:border-matcha"
            placeholder="Client ID"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
          <Button variant="primary" disabled={!clientId.trim()} onClick={() => twitch.setClientId(clientId)}>
            {messages.common.save}
          </Button>
        </div>
      </Tile>
    );
  }

  if (auth.status === 'pending') {
    return (
      <Tile
        title={m.twitchAccount}
        action={
          <Button variant="ghost" onClick={() => twitch.cancelSignIn()}>
            {messages.common.cancel}
          </Button>
        }
      >
        <p className="text-sm text-ink-soft">{m.enterCode}</p>
        <div className="my-2 rounded-xl bg-tile-muted py-3 text-center font-mono text-3xl font-semibold tracking-[0.2em] text-matcha-strong">
          {auth.deviceCode?.userCode ?? '······'}
        </div>
        {auth.deviceCode ? (
          <Button className="mt-auto" onClick={() => twitch.openVerificationPage(state)}>
            {m.reopenAuth}
          </Button>
        ) : null}
      </Tile>
    );
  }

  if (auth.status === 'signed-in') {
    return (
      <Tile
        title={m.twitchAccount}
        action={
          <Button variant="ghost" onClick={() => twitch.signOut()}>
            {m.signOut}
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-matcha-soft text-lg font-semibold text-matcha-strong">
            {auth.login?.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{auth.login}</div>
            <div className="text-xs text-ink-faint">{m.signedIn}</div>
          </div>
        </div>
      </Tile>
    );
  }

  return (
    <Tile title={m.twitchAccount}>
      <p className="text-sm text-ink-soft">{m.signInIntro}</p>
      {auth.error ? <p className="mt-2 text-xs text-danger">{auth.error}</p> : null}
      <Button variant="primary" className="mt-auto" onClick={() => twitch.signIn()}>
        {m.signIn}
      </Button>
    </Tile>
  );
}

export function ChannelTile({ state }: { state: AppState }) {
  const messages = useMessages();
  const m = messages.compact;
  const [login, setLogin] = useState(state.channel.login ?? '');
  const { signedIn, connected, busy } = twitchStatus(state);

  return (
    <Tile title={m.channel} className="col-span-2">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          twitch.connect(login);
        }}
      >
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-line bg-canvas pl-4 focus-within:border-matcha">
          <span className="text-sm text-ink-faint">twitch.tv/</span>
          <input
            className="h-full min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="shiraine_ciel"
            disabled={!signedIn}
          />
          {signedIn && state.auth.login ? (
            <Hint label={messages.connections.useMyChannel}>
              <button
                type="button"
                aria-label={messages.connections.useMyChannel}
                className="mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-tile-muted hover:text-matcha"
                onClick={() => setLogin(state.auth.login!)}
              >
                <UserRound className="size-4" />
              </button>
            </Hint>
          ) : null}
        </div>
        {connected ? (
          <Button className="h-11" onClick={() => twitch.disconnect()}>
            {m.disconnect}
          </Button>
        ) : (
          <Button type="submit" variant="primary" className="h-11" disabled={!signedIn || busy || !login.trim()}>
            {busy ? (
              <>
                <LoadingSpinner /> {m.connecting}
              </>
            ) : (
              m.connect
            )}
          </Button>
        )}
      </form>
      <p className={`mt-3 text-xs ${state.channel.state === 'error' ? 'text-danger' : 'text-ink-faint'}`}>
        {state.channel.state === 'error' ? state.channel.detail : signedIn ? m.channelHint : m.signInFirst}
      </p>
    </Tile>
  );
}
