import { ChevronRight, ExternalLink, KeyRound, LogOut, Plug, PlugZap } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useMessages } from '../i18n';
import { twitch, twitchStatus } from '../services/twitch';
import { Stagger } from '../components/motion';
import { ClientIdForm } from './ClientIdForm';
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

/** Platform glyphs from Simple Icons (CC0 1.0), drawn on a 24×24 grid. */
const PLATFORMS = {
  twitch: {
    color: '#9146FF',
    ink: '#ffffff',
    path: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
  },
  youtube: {
    color: '#FF0000',
    ink: '#ffffff',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  kick: {
    color: '#53FC19',
    ink: '#0b0e0f',
    path: 'M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z',
  },
} as const;

function PlatformMark({ platform }: { platform: keyof typeof PLATFORMS }) {
  const { color, ink, path } = PLATFORMS[platform];
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: color }}>
      <svg viewBox="0 0 24 24" className="size-5" fill={ink} aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}

/** Step 1 of a build without a built-in Client ID: the user has to bring their own. */
function ClientIdStep({ configured }: { configured: boolean }) {
  const messages = useMessages();
  const m = messages.connections;
  const [clientId, setClientId] = useState('');
  const [editing, setEditing] = useState(!configured);

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-tile-muted p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="size-4 text-matcha" /> 1. {m.stepApp}
      </h3>
      {editing ? (
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
                setEditing(false);
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
          <Button className="mt-auto self-start" size="sm" variant="raised" onClick={() => setEditing(true)}>
            {m.change}
          </Button>
        </>
      )}
    </section>
  );
}

/** Builds with a built-in Client ID keep it out of the way, under "Advanced settings". */
function AdvancedSettings({ clientId }: { clientId: AppState['clientId'] }) {
  const m = useMessages().connections;
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 text-ink-faint transition-transform group-open:rotate-90" />
        {m.advanced}
        <span className="ml-auto text-xs font-normal text-ink-faint">{m.clientIdSource[clientId.source]}</span>
      </summary>
      <div className="border-t border-line p-4">
        <ClientIdForm clientId={clientId} />
      </div>
    </details>
  );
}

function TwitchCard({ state }: { state: AppState }) {
  const messages = useMessages();
  const m = messages.connections;
  const [login, setLogin] = useState(state.channel.login ?? '');
  const { auth, channel, clientId } = state;
  const { signedIn, connected, busy } = twitchStatus(state);
  // Without a built-in Client ID, entering one is the first step.
  const accountStep = clientId.hasBuiltIn ? 1 : 2;

  return (
    <Tile className="col-span-2 gap-5">
      <header className="flex items-center gap-3">
        <PlatformMark platform="twitch" />
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

      <div className={clientId.hasBuiltIn ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-3 gap-4'}>
        {clientId.hasBuiltIn ? null : <ClientIdStep configured={clientId.source !== 'none'} />}

        {/* Account */}
        <section className="flex flex-col gap-3 rounded-xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Plug className="size-4 text-matcha" /> {accountStep}. {m.stepAccount}
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
                disabled={clientId.source === 'none'}
                onClick={() => twitch.signIn()}
              >
                {m.signIn}
              </Button>
            </>
          )}
        </section>

        {/* Channel */}
        <section className="flex flex-col gap-3 rounded-xl bg-tile-muted p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <PlugZap className="size-4 text-matcha" /> {accountStep + 1}. {m.stepChannel}
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
      {clientId.hasBuiltIn ? <AdvancedSettings clientId={clientId} /> : null}
    </Tile>
  );
}

function ComingSoon({ name, platform }: { name: string; platform: keyof typeof PLATFORMS }) {
  const m = useMessages().connections;
  return (
    <Tile className="flex-row! items-center gap-3 opacity-70">
      <PlatformMark platform={platform} />
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
        <ComingSoon name="YouTube" platform="youtube" />
        <ComingSoon name="Kick" platform="kick" />
      </Stagger>
    </div>
  );
}
