import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { emptyChatLog, messageHistory, messageRate, reduceChatLog, type LogEntry } from './chatLog';
import { previewSound } from './services/alerts';

export type { LogEntry } from './chatLog';

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

const AppStateContext = createContext<AppState | null>(null);
const ChatLogContext = createContext<ChatLogValue | null>(null);

/** Session-wide stores for the control panel: the app state and the chat log (see `chatLog.ts`). */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [log, dispatch] = useReducer(reduceChatLog, emptyChatLog);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void api.getState().then(setState);
    return api.onState(setState);
  }, []);

  // The quiet-spell reminder plays here, so it sounds even when no overlay window is open.
  const port = useRef(4820);
  port.current = state?.server.port ?? port.current;
  useEffect(() => api.onAlertSound((sound) => previewSound(sound, port.current)), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => api.onChatEvent((event) => dispatch({ type: 'event', event, at: Date.now() })), []);

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
    clear: () => dispatch({ type: 'clear' }),
  };

  return (
    <AppStateContext.Provider value={state}>
      <ChatLogContext.Provider value={value}>{children}</ChatLogContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState | null {
  return useContext(AppStateContext);
}

export function useChatLog(): ChatLogValue {
  const value = useContext(ChatLogContext);
  if (!value) throw new Error('useChatLog must be used inside StoreProvider');
  return value;
}
