import {
  ChatView,
  createMockMessage,
  createMockNotice,
  emptyFeed,
  reduceFeed,
  startMockStream,
  useChatFeed,
} from '@chatto/chat-ui';
import type { ChatEvent, ChatTheme } from '@chatto/core';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useChatLocale, useOutputTheme } from '../i18n';
import { useThemeAssetUrl } from '../services/themes';
import { backdropColor, type OverlayLook } from '../../../shared/overlayLook';
import { useInView } from './useInView';

export type Backdrop = 'game' | 'dark' | 'light' | 'checker';

export const BACKDROPS: Record<Backdrop, string> = {
  game: 'radial-gradient(circle at 20% 25%, #3b6d11 0, transparent 45%), radial-gradient(circle at 85% 75%, #0f6e56 0, transparent 50%), #1b2230',
  dark: '#111412',
  light: '#f2f2ee',
  checker: 'repeating-conic-gradient(#d9d9d4 0% 25%, #f4f4f0 0% 50%) 0 0 / 20px 20px',
};

// A fixed sample so theme cards look stable instead of streaming.
const SAMPLE_EVENTS: ChatEvent[] = [
  createMockMessage(),
  createMockMessage(),
  createMockNotice(),
  createMockMessage(),
  createMockMessage(),
];

/** Static preview used on theme cards; the chat is drawn once the card scrolls near the viewport. */
export const StaticThemePreview = memo(function StaticThemePreview({
  theme,
  backdrop = 'game',
}: {
  theme: ChatTheme;
  backdrop?: Backdrop;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const items = useMemo(() => {
    const options = { ...theme.options, hiddenPrefixes: [], hiddenUsers: [], maxMessages: 5 };
    return SAMPLE_EVENTS.reduce((state, event) => reduceFeed(state, event, options, 0), emptyFeed).items;
  }, [theme]);
  const outputTheme = useOutputTheme();
  const quiet = useMemo(
    () => ({ ...outputTheme(theme), animation: { ...theme.animation, enter: 'none' as const } }),
    [theme, outputTheme],
  );
  const assetUrl = useThemeAssetUrl();
  const locale = useChatLocale();
  return (
    <div
      ref={ref}
      className="pointer-events-none h-full overflow-hidden p-3"
      style={{ background: BACKDROPS[backdrop] }}
    >
      {visible ? <ChatView theme={quiet} items={items} assetUrl={assetUrl} locale={locale} /> : null}
    </div>
  );
});

/**
 * Streaming preview used by the theme editor and outputs page. `look` shows a desktop
 * window's backdrop and chat opacity on top of the backdrop picture.
 */
export function LiveThemePreview({
  theme,
  backdrop = 'game',
  look,
}: {
  theme: ChatTheme;
  backdrop?: Backdrop;
  look?: OverlayLook;
}) {
  const feed = useChatFeed(theme.options);
  const { push } = feed;
  useEffect(() => startMockStream(push, 1500), [push]);
  const assetUrl = useThemeAssetUrl();
  const outputTheme = useOutputTheme();
  const locale = useChatLocale();
  const tint = look ? backdropColor(look) : 'transparent';
  return (
    <div
      data-testid="live-theme-preview"
      className="h-full overflow-hidden transition-[background]"
      style={{ background: BACKDROPS[backdrop] }}
    >
      {/* Like the window: the backdrop fills it, and only the chat fades. */}
      <div className="h-full p-3" style={{ background: tint }}>
        <div className="h-full" style={{ opacity: look?.chatOpacity ?? 1 }}>
          <ChatView theme={outputTheme(theme)} items={feed.items} assetUrl={assetUrl} locale={locale} />
        </div>
      </div>
    </div>
  );
}
