import { ChatView, startMockStream, useChatFeed } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { useEffect } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, Tile } from '../../components/kit';
import { themes } from '../../services/themes';
import { describeTheme, themeSwatch } from '../themeLabels';

export function ThemeTile({
  state,
  target,
  onTargetChange,
  onOpenThemes,
}: {
  state: AppState;
  target: ViewerTarget;
  onTargetChange: (target: ViewerTarget) => void;
  onOpenThemes: () => void;
}) {
  const selected = state.selectedThemes[target];
  return (
    <Tile
      title="聊天室主題"
      className="col-span-2 row-span-2 min-h-0"
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
      <div className="-m-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-1 xl:grid-cols-3">
        {state.themes.map((theme) => (
          <ThemeChip
            key={theme.id}
            theme={theme}
            active={theme.id === selected}
            onSelect={() => themes.select(target, theme.id)}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-4">
        <Button className="flex-1" onClick={onOpenThemes}>
          編輯與管理主題
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
      <span className="h-8 w-8 shrink-0 rounded-xl border border-line" style={{ background: themeSwatch(theme) }} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{theme.name}</span>
        <span className="block text-xs text-ink-faint">{describeTheme(theme)}</span>
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
      className="col-span-2 row-span-2 min-h-0"
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
