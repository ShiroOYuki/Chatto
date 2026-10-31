import { Copy, Minus, PanelsTopLeft, Square, X, LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { appPrefs, appWindow } from '../services/app';
import { SwapIcon } from './motion';
import { Hint, channelTone, StatusDot } from './kit';

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

/**
 * Custom title bar for the frameless main window: brand, live status,
 * layout switch and integrated minimize / maximize / close buttons.
 */
export function TitleBar({ state, title }: { state: AppState; title?: string }) {
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
        {connected ? (state.channel.login ?? '已連線') : '未連線'}
      </div>

      <div className="ml-auto flex h-full items-center">
        <button
          type="button"
          onClick={() => appPrefs.set({ uiMode: compact ? 'full' : 'compact' })}
          className="app-no-drag mr-2 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs text-ink-soft transition hover:bg-tile-muted hover:text-ink [&>svg]:size-3.5"
          title={compact ? '切換到完整模式' : '切換到精簡模式'}
        >
          <SwapIcon swapped={compact} from={<LayoutDashboard />} to={<PanelsTopLeft />} />
          {compact ? '完整模式' : '精簡模式'}
        </button>
        <WindowButton label="最小化" onClick={() => appWindow.minimize()}>
          <Minus />
        </WindowButton>
        <WindowButton label={state.window.maximized ? '還原' : '最大化'} onClick={() => appWindow.toggleMaximize()}>
          {state.window.maximized ? <Copy className="-scale-x-100" /> : <Square className="size-3.5!" />}
        </WindowButton>
        <WindowButton
          label={state.prefs.closeToTray ? '關閉（縮到系統匣）' : '關閉'}
          onClick={() => appWindow.close()}
          danger
        >
          <X />
        </WindowButton>
      </div>
    </div>
  );
}
