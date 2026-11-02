import { groupNotice, type NoticeGroupAccess } from '@chatto/chat-ui';
import { noticeGroup, type ChatEvent, type ChatMessage, type ChatNotice } from '@chatto/core';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { previewSound } from './services/alerts';

export type LogEntry =
  | { kind: 'message'; id: string; at: number; message: ChatMessage; deleted: boolean }
  /** `members`: notices of the same batch merged into this one (e.g. each gifted sub of a community gift). */
  | { kind: 'notice'; id: string; at: number; notice: ChatNotice; members: ChatNotice[] };

const LOG_GROUPS: NoticeGroupAccess<LogEntry> = {
  notice: (entry) => (entry.kind === 'notice' ? entry.notice : undefined),
  members: (entry) => (entry.kind === 'notice' ? entry.members : []),
  withMembers: (entry, members) => (entry.kind === 'notice' ? { ...entry, members } : entry),
};

/** Adds a notice to the log, merging a batch (a community gift and its gifted subs) into one entry. */
export function logNotice(entries: LogEntry[], notice: ChatNotice, at: number): LogEntry[] {
  const grouped = groupNotice(entries, notice, LOG_GROUPS);
  if (grouped.merged) return grouped.entries;
  return [...grouped.entries, { kind: 'notice' as const, id: notice.id, at, notice, members: grouped.members }];
}

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

const LOG_LIMIT = 500;
const HISTORY_MINUTES = 30;

const AppStateContext = createContext<AppState | null>(null);
const ChatLogContext = createContext<ChatLogValue | null>(null);

/**
 * Session-wide stores for the control panel. The chat log keeps deleted
 * messages (marked) so moderators can see what was removed, while the
 * overlay and OBS views drop them immediately.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [chatters] = useState(() => new Set<string>());
  const [counters, setCounters] = useState({ total: 0, deleted: 0, notices: 0 });
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
      api.onChatEvent((event: ChatEvent) => {
        const at = Date.now();
        switch (event.type) {
          case 'message':
            chatters.add(`${event.message.platform}:${event.message.author.id}`);
            setTimestamps((prev) => [...prev.filter((t) => at - t < HISTORY_MINUTES * 60_000), at]);
            setCounters((prev) => ({ ...prev, total: prev.total + 1 }));
            setEntries((prev) =>
              [
                ...prev,
                { kind: 'message' as const, id: event.message.id, at, message: event.message, deleted: false },
              ].slice(-LOG_LIMIT),
            );
            break;
          case 'notice': {
            // A batch counts once: its lead, not each gifted sub.
            const member = noticeGroup(event.notice)?.lead === false;
            if (!member) setCounters((prev) => ({ ...prev, notices: prev.notices + 1 }));
            setEntries((prev) => logNotice(prev, event.notice, at).slice(-LOG_LIMIT));
            break;
          }
          case 'message-deleted':
            setCounters((prev) => ({ ...prev, deleted: prev.deleted + 1 }));
            setEntries((prev) =>
              prev.map((entry) =>
                entry.kind === 'message' && entry.id === event.messageId ? { ...entry, deleted: true } : entry,
              ),
            );
            break;
          case 'user-cleared':
            setEntries((prev) =>
              prev.map((entry) =>
                entry.kind === 'message' && entry.message.author.id === event.userId
                  ? { ...entry, deleted: true }
                  : entry,
              ),
            );
            break;
          case 'chat-cleared':
            setEntries((prev) => prev.map((entry) => (entry.kind === 'message' ? { ...entry, deleted: true } : entry)));
            break;
          case 'connection':
            break;
        }
      }),
    [chatters],
  );

  const history = Array.from({ length: HISTORY_MINUTES }, (_, index) => {
    const end = now - (HISTORY_MINUTES - 1 - index) * 60_000;
    return timestamps.filter((t) => t > end - 60_000 && t <= end).length;
  });

  const stats: ChatStats = {
    rate: timestamps.filter((t) => Date.now() - t < 60_000).length,
    history,
    totalMessages: counters.total,
    uniqueChatters: chatters.size,
    deletedCount: counters.deleted,
    noticeCount: counters.notices,
  };

  const value: ChatLogValue = {
    entries,
    stats,
    clear: () => setEntries([]),
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
