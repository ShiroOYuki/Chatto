import { ChatView, startMockStream, useChatFeed } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { useEffect } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, Tile } from '../../components/kit';
import { useChatLocale, useMessages, useOutputTheme, useThemeName } from '../../i18n';
import { themes, useThemeAssetUrl } from '../../services/themes';
import { useMoreBelow } from '../../components/useMoreBelow';
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
  const m = useMessages().compact;
  const selected = state.selectedThemes[target];
  const list = useMoreBelow<HTMLDivElement>([state.themes]);
  return (
    <Tile
      title={m.chatTheme}
      className="col-span-2 row-span-2 min-h-0"
      action={
        <div className="flex rounded-xl bg-tile-muted p-1 text-xs">
          {(['overlay', 'embed'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTargetChange(item)}
              className={`rounded-lg px-3 py-1 transition-colors ${target === item ? 'bg-tile font-medium text-ink shadow-sm' : 'text-ink-soft'}`}
            >
              {item === 'overlay' ? m.desktopOverlay : 'OBS'}
            </button>
          ))}
        </div>
      }
    >
      <div
        ref={list.ref}
        onScroll={list.onScroll}
        data-testid="compact-theme-list"
        className={`-m-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-1 xl:grid-cols-3 ${
          list.moreBelow ? 'mask-b-from-[calc(100%-2rem)]' : ''
        }`}
      >
        {state.themes.map((theme) => (
          <ThemeChip
            key={theme.id}
            theme={theme}
            active={theme.id === selected}
            onSelect={() => themes.select(target, theme.id)}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-4 max-[1180px]:pt-3">
        <Button className="flex-1" onClick={onOpenThemes}>
          {m.manageThemes}
        </Button>
      </div>
    </Tile>
  );
}

function ThemeChip({ theme, active, onSelect }: { theme: ChatTheme; active: boolean; onSelect: () => void }) {
  const assetUrl = useThemeAssetUrl();
  const labels = useMessages().themes.labels;
  const themeName = useThemeName();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition-colors max-[1180px]:py-1.5 ${
        active ? 'border-matcha bg-matcha-soft/40' : 'border-line hover:bg-tile-muted'
      }`}
    >
      <span
        className="size-8 shrink-0 rounded-xl border border-line max-[1180px]:size-6 max-[1180px]:rounded-lg"
        style={{ background: themeSwatch(theme, assetUrl) }}
      />
      <span className="min-w-0">
        <span className="block truncate font-medium">{themeName(theme)}</span>
        {/* Narrow windows fit more themes on one screen by keeping each to a single line. */}
        <span className="block text-xs text-ink-faint max-[1180px]:hidden">{describeTheme(theme, labels)}</span>
      </span>
    </button>
  );
}

export function PreviewTile({ state, target }: { state: AppState; target: ViewerTarget }) {
  const theme = state.themes.find((item) => item.id === state.selectedThemes[target]) ?? state.themes[0]!;
  const feed = useChatFeed(theme.options);
  const { push } = feed;
  useEffect(() => startMockStream(push, 1800), [push]);
  const assetUrl = useThemeAssetUrl();
  const m = useMessages().compact;
  const themeName = useThemeName();
  const outputTheme = useOutputTheme();
  const chatLocale = useChatLocale();

  return (
    <Tile
      title={m.livePreview}
      className="col-span-2 row-span-2 min-h-0"
      action={<span className="text-xs text-ink-faint">{themeName(theme)}</span>}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl p-3"
        style={{
          background:
            'radial-gradient(circle at 20% 25%, #3b6d11 0, transparent 45%), radial-gradient(circle at 85% 75%, #0f6e56 0, transparent 50%), #1b2230',
        }}
      >
        <ChatView theme={outputTheme(theme)} items={feed.items} assetUrl={assetUrl} locale={chatLocale} />
      </div>
    </Tile>
  );
}
