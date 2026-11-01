import type { ChatEvent, ChatMessage, ChatNotice, ChatThemeOptions } from '@chatto/core';

export type FeedItem =
  | { kind: 'message'; key: string; receivedAt: number; message: ChatMessage }
  | { kind: 'notice'; key: string; receivedAt: number; notice: ChatNotice };

export interface FeedState {
  items: FeedItem[];
}

export const emptyFeed: FeedState = { items: [] };

/** Whether a theme's display rules hide this message (bots, command prefixes). */
export function isHidden(message: ChatMessage, options: ChatThemeOptions): boolean {
  if (options.hiddenUsers.some((login) => login.toLowerCase() === message.author.login)) return true;
  return options.hiddenPrefixes.some((prefix) => prefix && message.text.startsWith(prefix));
}

/**
 * Pure reducer applying one ChatEvent to the visible feed. Moderation events
 * remove messages immediately so deleted content never lingers on stream.
 */
export function reduceFeed(state: FeedState, event: ChatEvent, options: ChatThemeOptions, now = Date.now()): FeedState {
  switch (event.type) {
    case 'message': {
      if (isHidden(event.message, options)) return state;
      const item: FeedItem = {
        kind: 'message',
        key: `${event.message.platform}:${event.message.id}`,
        receivedAt: now,
        message: event.message,
      };
      return { items: [...state.items, item].slice(-options.maxMessages) };
    }
    case 'notice': {
      const item: FeedItem = {
        kind: 'notice',
        key: `${event.notice.platform}:${event.notice.id}`,
        receivedAt: now,
        notice: event.notice,
      };
      return { items: [...state.items, item].slice(-options.maxMessages) };
    }
    case 'message-deleted':
      return {
        items: state.items.filter(
          (item) =>
            !(
              item.kind === 'message' &&
              item.message.platform === event.platform &&
              item.message.id === event.messageId
            ),
        ),
      };
    case 'user-cleared':
      return {
        items: state.items.filter(
          (item) =>
            !(
              item.kind === 'message' &&
              item.message.platform === event.platform &&
              item.message.author.id === event.userId
            ),
        ),
      };
    case 'chat-cleared':
      return {
        items: state.items.filter((item) =>
          item.kind === 'message' ? item.message.platform !== event.platform : item.notice.platform !== event.platform,
        ),
      };
    case 'connection':
      return state;
  }
}

/** Drops items older than the theme's message lifetime. */
export function expireFeed(state: FeedState, options: ChatThemeOptions, now = Date.now()): FeedState {
  if (options.messageLifetime <= 0) return state;
  const cutoff = now - options.messageLifetime * 1000;
  const items = state.items.filter((item) => item.receivedAt >= cutoff);
  return items.length === state.items.length ? state : { items };
}
