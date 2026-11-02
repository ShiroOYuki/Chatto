import { Coffee, Copy, Minus, PanelsTopLeft, Square, X, LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { SUPPORT_LINKS } from '../../../shared/support';
import { useLocale, useMessages } from '../i18n';
import { appPrefs, appWindow, openExternal } from '../services/app';
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
            className="app-no-drag mr-1 grid size-7 place-items-center rounded-full text-ink-faint transition hover:bg-tile-muted hover:text-matcha-strong [&>svg]:size-3.5"
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

/**
 * Custom title bar for the frameless main window: brand, live status,
 * layout switch and integrated minimize / maximize / close buttons.
 */
export function TitleBar({ state, title }: { state: AppState; title?: string }) {
  const m = useMessages().shell.titleBar;
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

      <div className="ml-4 flex items-center gap-2 text-xs text-ink-soft">
        <StatusDot tone={channelTone(state.channel.state, connected)} />
        {connected ? (state.channel.login ?? m.connected) : m.notConnected}
      </div>

      <div className="ml-auto flex h-full items-center">
        <SupportMenu />
        <button
          type="button"
          onClick={() => appPrefs.set({ uiMode: compact ? 'full' : 'compact' })}
          className="app-no-drag mr-2 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs text-ink-soft transition hover:bg-tile-muted hover:text-ink [&>svg]:size-3.5"
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
