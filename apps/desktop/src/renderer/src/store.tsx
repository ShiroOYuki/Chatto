import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { emptyChatLog, messageHistory, messageRate, reduceChatLog, type LogEntry } from './chatLog';
import { emptyRedemptionLog, reduceRedemptions, type RedemptionEntry } from './redemptionLog';
import { previewSound } from './services/alerts';

export type { LogEntry } from './chatLog';
export type { RedemptionEntry } from './redemptionLog';

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

const AppStateContext = createContext<AppState | null>(null);
const ChatLogContext = createContext<ChatLogValue | null>(null);
const RedemptionsContext = createContext<RedemptionsValue | null>(null);

/**
 * Session-wide stores for the control panel: the app state, the chat log
 * (see `chatLog.ts`) and the redemption list (see `redemptionLog.ts`).
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [log, dispatch] = useReducer(reduceChatLog, emptyChatLog);
  const [redemptionLog, dispatchRedemption] = useReducer(reduceRedemptions, emptyRedemptionLog);
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

  useEffect(
    () =>
      api.onChatEvent((event) => {
        const at = Date.now();
        dispatch({ type: 'event', event, at });
        dispatchRedemption({ type: 'event', event, at });
      }),
    [],
  );

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

  const redemptions: RedemptionsValue = {
    entries: redemptionLog.entries,
    dismiss: (key) => dispatchRedemption({ type: 'dismiss', key }),
  };

  return (
    <AppStateContext.Provider value={state}>
      <ChatLogContext.Provider value={value}>
        <RedemptionsContext.Provider value={redemptions}>{children}</RedemptionsContext.Provider>
      </ChatLogContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState | null {
  return useContext(AppStateContext);
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
