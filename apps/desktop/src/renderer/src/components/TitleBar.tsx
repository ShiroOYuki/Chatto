import {
  Coffee,
  Copy,
  Download,
  LayoutDashboard,
  Minus,
  PanelsTopLeft,
  Pause,
  Puzzle,
  RotateCw,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { SUPPORT_LINKS } from '../../../shared/support';
import { useLocale, useMessages } from '../i18n';
import { appPrefs, appWindow, openExternal } from '../services/app';
import { obsPlugin, useObsPluginStatus } from '../services/obsPlugin';
import { overlay } from '../services/overlay';
import { updater } from '../services/updater';
import { SwapIcon } from './motion';
import { Hint, channelTone, StatusDot } from './kit';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function WindowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`app-no-drag grid h-full w-12 place-items-center text-ink-soft transition [&>svg]:size-4 ${
          danger ? 'hover:bg-[#c42b1c] hover:text-white' : 'hover:bg-tile-muted hover:text-ink'
        }`}
      >
        {children}
      </button>
    </Hint>
  );
}

/** A quiet tea cup that opens the support links. */
function SupportMenu() {
  const m = useMessages().shell.titleBar;
  const locale = useLocale();
  return (
    <DropdownMenu>
      <Hint label={m.support}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={m.support}
            className="app-no-drag mr-1 grid size-7 place-items-center rounded-full text-ink-faint transition-colors hover:bg-tile-muted hover:text-matcha-strong [&>svg]:size-3.5"
          >
            <Coffee />
          </button>
        </DropdownMenuTrigger>
      </Hint>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuLabel className="text-xs font-normal text-ink-faint">{m.supportTitle}</DropdownMenuLabel>
        {SUPPORT_LINKS.map((link) => (
          <DropdownMenuItem key={link.id} onSelect={() => openExternal(link.url)}>
            {link.label[locale]}
            <span className="ml-auto text-xs text-ink-faint">{link.hint[locale]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shape of the title bar's prompts (app update, OBS plugin); each adds its colors. */
const PILL = 'app-no-drag inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium [&>svg]:size-3.5';

/** Appears only while there is an update to act on: download it, watch it, or restart into it. */
function UpdateBadge({ update }: { update: AppState['update'] }) {
  const m = useMessages().shell.titleBar;
  const pill = `${PILL} mr-2 bg-matcha-soft text-matcha-strong`;
  if (update.status === 'downloading') {
    return (
      <span className={pill} role="status">
        <Download /> {m.updateDownloading(update.percent ?? 0)}
      </span>
    );
  }
  const ready = update.status === 'downloaded';
  if (!ready && update.status !== 'available') return null;
  return (
    <Hint label={ready ? m.updateReadyHint : m.updateAvailableHint}>
      <button
        type="button"
        onClick={() => (ready ? updater.install() : updater.download())}
        className={`${pill} transition-colors hover:bg-matcha-strong hover:text-on-matcha`}
      >
        {ready ? <RotateCw /> : <Download />}
        {ready ? m.updateReady : m.updateAvailable(update.version ?? '')}
      </button>
    </Hint>
  );
}

/** While new messages are held back from the overlays and OBS (#53), so it is never forgotten mid-stream. */
function PausedBadge({ paused }: { paused: boolean }) {
  const m = useMessages().shell.titleBar;
  if (!paused) return null;
  return (
    <Hint label={m.chatPausedHint}>
      <button
        type="button"
        onClick={() => overlay.setChatPaused(false)}
        className={`${PILL} mr-2 bg-sakura/40 text-ink transition-colors hover:bg-matcha-strong hover:text-on-matcha`}
      >
        <Pause /> {m.chatPaused}
      </button>
    </Hint>
  );
}

const OBS_NOTICE_MS = 5000;

/**
 * Offers the OBS plugin when this Chatto ships a newer one than OBS has, or when OBS is
 * here without it (until the user dismisses that). The outputs page has the full controls.
 */
function ObsPluginBadge({ dismissed }: { dismissed: boolean }) {
  const m = useMessages().shell.titleBar;
  const status = useObsPluginStatus();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'obs-running' | 'failed' | null>(null);

  useEffect(() => {
    if (!failure) return;
    const timer = setTimeout(() => setFailure(null), OBS_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [failure]);

  if (failure) {
    return (
      <span role="alert" className={`${PILL} mr-2 bg-danger/10 text-danger`}>
        <Puzzle /> {failure === 'obs-running' ? m.closeObsFirst : m.obsPluginFailed}
      </span>
    );
  }
  const outdated = status?.state === 'outdated';
  const missing = status?.state === 'not-installed' && status.obsFound && !dismissed;
  if (!outdated && !missing) return null;

  const install = async () => {
    setBusy(true);
    try {
      const result = await obsPlugin.install();
      if (!result.ok) setFailure(result.reason);
    } catch {
      setFailure('failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="mr-2 inline-flex items-center">
      <Hint label={outdated ? m.updateObsPluginHint : m.installObsPluginHint}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void install()}
          className={`${PILL} bg-matcha-soft text-matcha-strong transition-colors hover:bg-matcha-strong hover:text-on-matcha disabled:opacity-60`}
        >
          <Puzzle /> {outdated ? m.updateObsPlugin : m.installObsPlugin}
        </button>
      </Hint>
      {missing ? (
        <Hint label={m.dismissObsPlugin}>
          <button
            type="button"
            aria-label={m.dismissObsPlugin}
            onClick={() => appPrefs.set({ obsPluginPromptDismissed: true })}
            className="app-no-drag ml-0.5 grid size-6 place-items-center rounded-full text-ink-faint transition-colors hover:bg-tile-muted hover:text-ink [&>svg]:size-3"
          >
            <X />
          </button>
        </Hint>
      ) : null}
    </span>
  );
}

/**
 * Custom title bar for the frameless main window: brand, live status,
 * layout switch and integrated minimize / maximize / close buttons.
 */
export function TitleBar({ state, title }: { state: AppState; title?: string }) {
  const messages = useMessages();
  const m = messages.shell.titleBar;
  const { channelState } = messages.connections;
  const compact = state.prefs.uiMode === 'compact';
  const connected = state.channel.state === 'connected';

  return (
    <div className="app-drag flex h-11 shrink-0 items-center border-b border-line bg-sidebar pl-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <img src="./icon.png" alt="" className="size-5 rounded-md" />
        <span className="text-sm font-semibold">Chatto</span>
        {title ? (
          <>
            <span className="text-ink-faint">/</span>
            <span className="truncate text-sm text-ink-soft">{title}</span>
          </>
        ) : null}
      </div>

      <div data-channel-status className="ml-4 flex items-center gap-2 text-xs text-ink-soft">
        <StatusDot tone={channelTone(state.channel.state, connected)} />
        {/* Says what is happening while it is not connected (connecting, reconnecting, failed), not just "not connected". */}
        {connected
          ? (state.channel.login ?? m.connected)
          : state.channel.state === 'idle'
            ? m.notConnected
            : channelState[state.channel.state]}
      </div>

      <div className="ml-auto flex h-full items-center">
        <PausedBadge paused={state.chatPaused} />
        <UpdateBadge update={state.update} />
        <ObsPluginBadge dismissed={state.prefs.obsPluginPromptDismissed} />
        <SupportMenu />
        <button
          type="button"
          onClick={() => appPrefs.set({ uiMode: compact ? 'full' : 'compact' })}
          className="app-no-drag mr-2 inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs text-ink-soft transition-colors hover:bg-tile-muted hover:text-ink [&>svg]:size-3.5"
          title={compact ? m.switchToFull : m.switchToCompact}
        >
          <SwapIcon swapped={compact} from={<LayoutDashboard />} to={<PanelsTopLeft />} />
          {compact ? m.fullMode : m.compactMode}
        </button>
        <WindowButton label={m.minimize} onClick={() => appWindow.minimize()}>
          <Minus />
        </WindowButton>
        <WindowButton
          label={state.window.maximized ? m.restore : m.maximize}
          onClick={() => appWindow.toggleMaximize()}
        >
          {state.window.maximized ? <Copy className="-scale-x-100" /> : <Square className="size-3.5!" />}
        </WindowButton>
        <WindowButton
          label={state.prefs.closeToTray ? m.closeToTray : m.close}
          onClick={() => appWindow.close()}
          danger
        >
          <X />
        </WindowButton>
      </div>
    </div>
  );
}
