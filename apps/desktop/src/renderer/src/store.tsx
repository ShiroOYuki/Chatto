import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { messageHistory, messageRate, type LogEntry } from '../../shared/chatLog';
import { emptyControlLogView, reduceControlLogView } from '../../shared/controlLog';
import type { RedemptionEntry } from '../../shared/redemptionLog';
import { previewSound } from './services/alerts';
import { runAction } from './services/run';
import { keepUnchanged } from './lib/keepUnchanged';

export type { LogEntry } from '../../shared/chatLog';
export type { RedemptionEntry } from '../../shared/redemptionLog';

export interface ChatStats {
  /** Messages in the last 60 seconds. */
  rate: number;
  /** Messages per minute for the last 30 minutes, oldest first. */
  history: number[];
  totalMessages: number;
  uniqueChatters: number;
  deletedCount: number;
  noticeCount: number;
}

interface ChatLogValue {
  entries: LogEntry[];
  stats: ChatStats;
  clear(): void;
}

interface RedemptionsValue {
  /** Newest first. */
  entries: RedemptionEntry[];
  dismiss(key: string): void;
}

/**
 * The few settings that previews and interface text depend on. A context of their own, because
 * everything reading `useAppState()` re-renders on every state update, which memoized theme cards
 * and previews must not.
 */
export interface DisplaySettings {
  locale?: AppState['prefs']['locale'];
  chatLocale?: AppState['prefs']['chatLocale'];
  serverPort?: number;
}

const AppStateContext = createContext<AppState | null>(null);
const DisplayContext = createContext<DisplaySettings>({});
const ChatLogContext = createContext<ChatLogValue | null>(null);
const RedemptionsContext = createContext<RedemptionsValue | null>(null);

/**
 * Session-wide stores for the control panel: the app state, the chat log
 * (see `chatLog.ts`) and the redemption list (see `redemptionLog.ts`). The
 * main process keeps the logs too (`controlLog.ts`), so a window opened again
 * from the tray starts with the whole session.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [view, dispatch] = useReducer(reduceControlLogView, emptyControlLogView);
  const log = view.chatLog;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Theme cards and previews are memoized on the theme objects; keep the ones that did not change.
    const apply = (next: AppState) =>
      setState((previous) => (previous ? { ...next, themes: keepUnchanged(previous.themes, next.themes) } : next));
    void api.getState().then(apply);
    return api.onState(apply);
  }, []);

  // The quiet-spell reminder plays here, so it sounds even when no overlay window is open.
  const port = useRef(4820);
  port.current = state?.server.port ?? port.current;
  useEffect(() => api.onAlertSound((sound) => previewSound(sound, port.current)), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen first, then ask for the snapshot: events in between wait in the reducer.
  useEffect(() => {
    const stop = api.onChatEvent((item) => dispatch({ type: 'event', item }));
    void api.getControlLog().then((snapshot) => dispatch({ type: 'load', snapshot }));
    return stop;
  }, []);

  const stats: ChatStats = {
    rate: messageRate(log.timestamps, now),
    history: messageHistory(log.timestamps, now),
    totalMessages: log.totalMessages,
    uniqueChatters: log.chatters.size,
    deletedCount: log.deletedCount,
    noticeCount: log.noticeCount,
  };

  const value: ChatLogValue = {
    entries: log.entries,
    stats,
    clear: () => {
      dispatch({ type: 'clear-chat' });
      runAction('clearChatLog', api.clearChatLog());
    },
  };

  const redemptions: RedemptionsValue = {
    entries: view.redemptions.entries,
    dismiss: (key) => {
      dispatch({ type: 'dismiss-redemption', key });
      runAction('dismissRedemption', api.dismissRedemption(key));
    },
  };

  const locale = state?.prefs.locale;
  const chatLocale = state?.prefs.chatLocale;
  const serverPort = state?.server.port;
  const display = useMemo(() => ({ locale, chatLocale, serverPort }), [locale, chatLocale, serverPort]);

  return (
    <AppStateContext.Provider value={state}>
      <DisplayContext.Provider value={display}>
        <ChatLogContext.Provider value={value}>
          <RedemptionsContext.Provider value={redemptions}>{children}</RedemptionsContext.Provider>
        </ChatLogContext.Provider>
      </DisplayContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState | null {
  return useContext(AppStateContext);
}

/** Languages and the local server port; changes only when one of them does. */
export function useDisplaySettings(): DisplaySettings {
  return useContext(DisplayContext);
}

/** This session's channel points redemptions, collected even while the chat page is closed. */
export function useRedemptions(): RedemptionsValue {
  const value = useContext(RedemptionsContext);
  if (!value) throw new Error('useRedemptions must be used inside StoreProvider');
  return value;
}

export function useChatLog(): ChatLogValue {
  const value = useContext(ChatLogContext);
  if (!value) throw new Error('useChatLog must be used inside StoreProvider');
  return value;
}
