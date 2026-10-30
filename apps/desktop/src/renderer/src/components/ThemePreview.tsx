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
import { useEffect, useMemo } from 'react';

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

/** Static preview used on theme cards. */
export function StaticThemePreview({ theme, backdrop = 'game' }: { theme: ChatTheme; backdrop?: Backdrop }) {
  const items = useMemo(() => {
    const options = { ...theme.options, hiddenPrefixes: [], hiddenUsers: [], maxMessages: 5 };
    return SAMPLE_EVENTS.reduce((state, event) => reduceFeed(state, event, options, 0), emptyFeed).items;
  }, [theme]);
  const quiet = useMemo(() => ({ ...theme, options: { ...theme.options, enterAnimation: 'none' as const } }), [theme]);
  return (
    <div className="pointer-events-none h-full overflow-hidden p-3" style={{ background: BACKDROPS[backdrop] }}>
      <ChatView theme={quiet} items={items} />
    </div>
  );
}

/** Streaming preview used by the theme editor and outputs page. */
export function LiveThemePreview({ theme, backdrop = 'game' }: { theme: ChatTheme; backdrop?: Backdrop }) {
  const feed = useChatFeed(theme.options);
  const { push } = feed;
  useEffect(() => startMockStream(push, 1500), [push]);
  return (
    <div className="h-full overflow-hidden p-3 transition-[background]" style={{ background: BACKDROPS[backdrop] }}>
      <ChatView theme={theme} items={feed.items} />
    </div>
  );
}
