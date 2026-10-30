import {
  ChatView,
  DEFAULT_THEME_ID,
  getPresetTheme,
  PRESET_THEMES,
  startMockStream,
  useChatFeed,
} from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { useEffect, useState } from 'react';
import { connectToApp } from './connection';

const params = new URLSearchParams(location.search);
const target: ViewerTarget = location.pathname.includes('embed') ? 'embed' : 'overlay';
const isMock = params.has('mock');
const presetFromQuery = params.get('theme');
const fallbackTheme = getPresetTheme(presetFromQuery ?? DEFAULT_THEME_ID) ?? PRESET_THEMES[0]!;

if (params.has('backdrop')) document.body.dataset.backdrop = '';

/**
 * Viewer page. Online it mirrors the desktop app over WebSocket; with
 * `?mock=1` it runs standalone with fake chat (`&theme=<preset id>` picks a theme).
 */
export function App() {
  const [theme, setTheme] = useState<ChatTheme>(fallbackTheme);
  const feed = useChatFeed(theme.options);
  const { push, reset } = feed;

  useEffect(() => {
    if (isMock) return startMockStream(push);
    const wsUrl = params.get('ws') ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    return connectToApp(wsUrl, target, {
      onHello: (nextTheme, backlog) => {
        setTheme(nextTheme);
        reset(backlog);
      },
      onEvent: push,
      onTheme: setTheme,
      onStatus: () => undefined,
    });
  }, [push, reset]);

  return <ChatView theme={theme} items={feed.items} />;
}
