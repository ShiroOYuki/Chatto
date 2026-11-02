import {
  ChatView,
  createSpecimenEvents,
  DEFAULT_THEME_ID,
  getPresetTheme,
  PRESET_THEMES,
  startMockStream,
  useChatFeed,
} from '@chatto/chat-ui';
import type { ChatTheme, Locale, ViewerTarget } from '@chatto/core';
import { useEffect, useState } from 'react';
import { AlertsApp } from './AlertsApp';
import { connectToApp } from './connection';
import { initialLocale } from './locale';

const params = new URLSearchParams(location.search);
const target: ViewerTarget = location.pathname.includes('alerts')
  ? 'alerts'
  : location.pathname.includes('embed')
    ? 'embed'
    : 'overlay';
if (target === 'alerts') document.body.dataset.alerts = '';
const isMock = params.has('mock');
/** `?specimen` renders the fixed specimen set once, for screenshots and visual tests. */
const isSpecimen = params.has('specimen');
const presetFromQuery = params.get('theme');
const fallbackTheme = getPresetTheme(presetFromQuery ?? DEFAULT_THEME_ID) ?? PRESET_THEMES[0]!;

if (params.has('backdrop')) document.body.dataset.backdrop = '';

/**
 * Viewer page. Online it mirrors the desktop app over WebSocket; with
 * `?mock=1` it runs standalone with fake chat, or with `?specimen` it shows a
 * fixed set covering every part (`&theme=<preset id>` picks a theme).
 */
export function App() {
  return target === 'alerts' ? <AlertsApp /> : <ChatApp />;
}

function ChatApp() {
  const [theme, setTheme] = useState<ChatTheme>(fallbackTheme);
  const [locale, setLocale] = useState<Locale>(() => initialLocale(params));
  const feed = useChatFeed(theme.options);
  const { push, reset } = feed;

  useEffect(() => {
    if (isSpecimen) return reset(createSpecimenEvents());
    if (isMock) return startMockStream(push);
    const wsUrl = params.get('ws') ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    return connectToApp(wsUrl, target, {
      onHello: (nextTheme, backlog, nextLocale) => {
        setTheme(nextTheme);
        if (nextLocale) setLocale(nextLocale);
        reset(backlog);
      },
      onEvent: push,
      onTheme: setTheme,
      onLocale: setLocale,
      onStatus: () => undefined,
    });
  }, [push, reset]);

  return <ChatView theme={theme} items={feed.items} locale={locale} />;
}
