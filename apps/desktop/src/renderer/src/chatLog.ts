import { groupNotice, type NoticeGroupAccess } from '@chatto/chat-ui';
import { noticeGroup, type ChatEvent, type ChatMessage, type ChatNotice } from '@chatto/core';

/**
 * The control panel's chat log: every message and notice of this session,
 * plus the counters behind the overview stats. Deleted messages stay in the
 * log (marked) so moderators can see what was removed; the overlay and OBS
 * views drop them immediately.
 */

export type LogEntry =
  | { kind: 'message'; id: string; at: number; message: ChatMessage; deleted: boolean }
  /** `members`: notices of the same batch merged into this one (e.g. each gifted sub of a community gift). */
  | { kind: 'notice'; id: string; at: number; notice: ChatNotice; members: ChatNotice[] };

export const LOG_LIMIT = 500;
export const HISTORY_MINUTES = 30;

export interface ChatLogState {
  entries: LogEntry[];
  /** Arrival times of the messages in the last `HISTORY_MINUTES`. */
  timestamps: number[];
  /** `${platform}:${user id}` of everyone who spoke this session. */
  chatters: ReadonlySet<string>;
  totalMessages: number;
  deletedCount: number;
  noticeCount: number;
}

export const emptyChatLog: ChatLogState = {
  entries: [],
  timestamps: [],
  chatters: new Set(),
  totalMessages: 0,
  deletedCount: 0,
  noticeCount: 0,
};

export type ChatLogAction =
  /** `at`: when the control panel received the event. */
  | { type: 'event'; event: ChatEvent; at: number }
  /** Empties the log; the session stats stay. */
  | { type: 'clear' };

const LOG_GROUPS: NoticeGroupAccess<LogEntry> = {
  notice: (entry) => (entry.kind === 'notice' ? entry.notice : undefined),
  members: (entry) => (entry.kind === 'notice' ? entry.members : []),
  withMembers: (entry, members) => (entry.kind === 'notice' ? { ...entry, members } : entry),
};

/** Adds a notice to the log, merging a batch (a community gift and its gifted subs) into one entry. */
export function logNotice(entries: LogEntry[], notice: ChatNotice, at: number): LogEntry[] {
  const grouped = groupNotice(entries, notice, LOG_GROUPS);
  if (grouped.merged) return grouped.entries;
  const entry: LogEntry = { kind: 'notice', id: notice.id, at, notice, members: grouped.members };
  return [...grouped.entries, entry];
}

function markDeleted(state: ChatLogState, matches: (message: ChatMessage) => boolean): ChatLogState {
  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.kind === 'message' && matches(entry.message) ? { ...entry, deleted: true } : entry,
    ),
  };
}

function receive(state: ChatLogState, event: ChatEvent, at: number): ChatLogState {
  switch (event.type) {
    case 'message': {
      const { message } = event;
      const chatter = `${message.platform}:${message.author.id}`;
      const entry: LogEntry = { kind: 'message', id: message.id, at, message, deleted: false };
      return {
        ...state,
        entries: [...state.entries, entry].slice(-LOG_LIMIT),
        timestamps: [...state.timestamps.filter((t) => at - t < HISTORY_MINUTES * 60_000), at],
        // A new Set only when someone speaks for the first time.
        chatters: state.chatters.has(chatter) ? state.chatters : new Set(state.chatters).add(chatter),
        totalMessages: state.totalMessages + 1,
      };
    }
    case 'notice': {
      // A batch counts once: its lead, not each gifted sub.
      const member = noticeGroup(event.notice)?.lead === false;
      return {
        ...state,
        entries: logNotice(state.entries, event.notice, at).slice(-LOG_LIMIT),
        noticeCount: member ? state.noticeCount : state.noticeCount + 1,
      };
    }
    case 'message-deleted':
      return {
        ...markDeleted(state, (message) => message.id === event.messageId),
        deletedCount: state.deletedCount + 1,
      };
    case 'user-cleared':
      return markDeleted(state, (message) => message.author.id === event.userId);
    case 'chat-cleared':
      return markDeleted(state, () => true);
    case 'connection':
      return state;
    default: {
      // A new event type must be handled above; this fails to compile until it is.
      const unhandled: never = event;
      return unhandled;
    }
  }
}

export function reduceChatLog(state: ChatLogState, action: ChatLogAction): ChatLogState {
  switch (action.type) {
    case 'event':
      return receive(state, action.event, action.at);
    case 'clear':
      return { ...state, entries: [] };
  }
}

/** Messages per minute for the last `HISTORY_MINUTES` minutes up to `now`, oldest first. */
export function messageHistory(timestamps: number[], now: number): number[] {
  return Array.from({ length: HISTORY_MINUTES }, (_, index) => {
    const end = now - (HISTORY_MINUTES - 1 - index) * 60_000;
    return timestamps.filter((t) => t > end - 60_000 && t <= end).length;
  });
}

/** Messages in the minute before `now`. */
export function messageRate(timestamps: number[], now: number): number {
  return timestamps.filter((t) => now - t < 60_000).length;
}
