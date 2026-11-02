import { ExternalLink, KeyRound, LogOut, Plug, PlugZap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useMessages } from '../i18n';
import { twitch, twitchStatus } from '../services/twitch';
import { Stagger } from '../components/motion';
import {
  Badge,
  Button,
  LoadingSpinner,
  Field,
  PageHeader,
  channelTone,
  StatusDot,
  TextInput,
  Tile,
} from '../components/kit';

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

function TwitchCard({ state }: { state: AppState }) {
  const messages = useMessages();
  const m = messages.connections;
  const [clientId, setClientId] = useState('');
  const [editingClientId, setEditingClientId] = useState(!state.clientIdConfigured);
  const [login, setLogin] = useState(state.channel.login ?? '');
  const { auth, channel } = state;
  const { signedIn, connected, busy } = twitchStatus(state);

  return (
    <Tile className="col-span-2 gap-5">
      <header className="flex items-center gap-3">
        <PlatformMark color="#9146FF">Tw</PlatformMark>
        <div className="flex-1">
          <h2 className="font-semibold">Twitch</h2>
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <StatusDot tone={channelTone(channel.state, connected)} />
            {m.channelState[channel.state]}
            {connected && channel.login ? ` · ${channel.login}` : ''}
          </p>
        </div>
        <Badge tone="matcha">EventSub</Badge>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {/* Step 1: client id */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-matcha" /> {m.stepApp}
          </h3>
          {editingClientId ? (
            <>
              <Field label="Client ID" hint={m.clientIdHint}>
                <TextInput
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder={m.clientIdPlaceholder}
                />
              </Field>
              <div className="mt-auto flex gap-2">
                <Button
                  variant="primary"
                  disabled={!clientId.trim()}
                  onClick={() => {
                    twitch.setClientId(clientId);
                    setEditingClientId(false);
                  }}
                >
                  {messages.common.save}
                </Button>
                <Button variant="ghost" onClick={() => twitch.openDevConsole()}>
                  <ExternalLink /> {m.openConsole}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">{m.clientIdSet}</p>
              <Button
                className="mt-auto self-start"
                size="sm"
                variant="raised"
                onClick={() => setEditingClientId(true)}
              >
                {m.change}
              </Button>
            </>
          )}
        </section>

        {/* Step 2: account */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Plug className="size-4 text-matcha" /> {m.stepAccount}
          </h3>
          {auth.status === 'pending' ? (
            <>
              <p className="text-sm text-ink-soft">{m.enterCode}</p>
              <div className="rounded-xl bg-tile py-2 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-matcha-strong">
                {auth.deviceCode?.userCode ?? '······'}
              </div>
              <div className="mt-auto flex gap-2">
                {auth.deviceCode ? (
                  <Button size="sm" variant="raised" onClick={() => twitch.openVerificationPage(state)}>
                    {m.reopenAuth}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => twitch.cancelSignIn()}>
                  {messages.common.cancel}
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
                  <div className="text-xs text-ink-faint">{m.scope}</div>
                </div>
              </div>
              <Button className="mt-auto self-start" size="sm" variant="raised" onClick={() => twitch.signOut()}>
                <LogOut /> {m.signOut}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">{m.scopeNote}</p>
              {auth.error ? <p className="text-xs text-danger">{auth.error}</p> : null}
              <Button
                className="mt-auto self-start"
                variant="primary"
                disabled={!state.clientIdConfigured}
                onClick={() => twitch.signIn()}
              >
                {m.signIn}
              </Button>
            </>
          )}
        </section>

        {/* Step 3: channel */}
        <section className="flex flex-col gap-3 rounded-2xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <PlugZap className="size-4 text-matcha" /> {m.stepChannel}
          </h3>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              twitch.connect(login);
            }}
          >
            <Field label={m.channelName} hint={m.channelHint}>
              <TextInput
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="shiraine_ciel"
                disabled={!signedIn}
              />
            </Field>
            {connected ? (
              <Button className="self-start" variant="raised" onClick={() => twitch.disconnect()}>
                {m.disconnect}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                className="self-start"
                disabled={!signedIn || busy || !login.trim()}
              >
                {busy ? (
                  <>
                    <LoadingSpinner /> {m.connecting}
                  </>
                ) : (
                  m.connect
                )}
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
  const m = useMessages().connections;
  return (
    <Tile className="flex-row! items-center gap-3 opacity-70">
      <PlatformMark color={color}>{mark}</PlatformMark>
      <div className="flex-1">
        <h2 className="font-semibold">{name}</h2>
        <p className="text-xs text-ink-faint">{m.comingSoon}</p>
      </div>
      <Badge>{m.planned}</Badge>
    </Tile>
  );
}

export function ConnectionsPage({ state }: { state: AppState }) {
  const m = useMessages().connections;
  return (
    <div>
      <PageHeader title={m.title} description={m.description} />
      <Stagger className="grid grid-cols-2 gap-3">
        <TwitchCard state={state} />
        <ComingSoon name="YouTube" color="#E62117" mark="YT" />
        <ComingSoon name="Kick" color="#2D9D3A" mark="K" />
      </Stagger>
    </div>
  );
}
