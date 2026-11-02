import { localizeTheme } from '@chatto/chat-ui';
import { chatLocaleOf, DEFAULT_LOCALE, type ChatTheme, type Locale } from '@chatto/core';
import { useCallback } from 'react';
import { useAppState } from '../store';
import alerts from './messages/alerts';
import chat from './messages/chat';
import chatLog from './messages/chatLog';
import common from './messages/common';
import compact from './messages/compact';
import connections from './messages/connections';
import editor from './messages/editor';
import editorFields from './messages/editorFields';
import editorPanels from './messages/editorPanels';
import outputs from './messages/outputs';
import overview from './messages/overview';
import settings from './messages/settings';
import shell from './messages/shell';
import themes from './messages/themes';

/**
 * Interface text of the control panel. Each namespace lives in
 * `messages/<name>.ts` with every language side by side (see `define.ts`).
 * Components read text with `const m = useMessages()`, e.g. `m.common.save`.
 */
const NAMESPACES = {
  alerts,
  chat,
  chatLog,
  common,
  compact,
  connections,
  editor,
  editorFields,
  editorPanels,
  outputs,
  overview,
  settings,
  shell,
  themes,
};

export type Messages = { [K in keyof typeof NAMESPACES]: (typeof NAMESPACES)[K][Locale] };

const cache = new Map<Locale, Messages>();

/** All interface text in one language. */
export function messagesFor(locale: Locale): Messages {
  let messages = cache.get(locale);
  if (!messages) {
    messages = Object.fromEntries(
      Object.entries(NAMESPACES).map(([name, namespace]) => [name, namespace[locale]]),
    ) as Messages;
    cache.set(locale, messages);
  }
  return messages;
}

/** The interface language (`prefs.locale`). */
export function useLocale(): Locale {
  return useAppState()?.prefs.locale ?? DEFAULT_LOCALE;
}

/** The chat language: event texts in previews follow what the overlays and OBS show. */
export function useChatLocale(): Locale {
  const prefs = useAppState()?.prefs;
  return prefs ? chatLocaleOf(prefs.chatLocale, prefs.locale) : DEFAULT_LOCALE;
}

/** Interface text in the current language. */
export function useMessages(): Messages {
  return messagesFor(useLocale());
}

/** A theme's name as shown in the interface: built-in themes are named in the interface language. */
export function useThemeName(): (theme: ChatTheme) => string {
  const locale = useLocale();
  return useCallback((theme: ChatTheme) => localizeTheme(theme, locale).name, [locale]);
}

/**
 * A theme as the outputs show it: built-in themes use the chat language for
 * their texts (the quiet-spell label). Use it for chat previews.
 */
export function useOutputTheme(): (theme: ChatTheme) => ChatTheme {
  const locale = useChatLocale();
  return useCallback((theme: ChatTheme) => localizeTheme(theme, locale), [locale]);
}
