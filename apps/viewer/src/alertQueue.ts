import { emptyFeed, reduceFeed, type FeedItem } from '@chatto/chat-ui';
import type { AlertCue, ChatEvent, ChatThemeOptions } from '@chatto/core';

/**
 * Alert overlay queue: one card at a time. A card shows for its cue's
 * duration, plays the theme's exit animation, then the next one comes up.
 * Every alert waits its turn; moderation events remove cards at once.
 */

export interface Alert {
  item: FeedItem;
  cue: AlertCue;
}

export interface AlertQueueState {
  current: Alert | null;
  /** `leave` while the current card plays its exit animation. */
  phase: 'show' | 'leave';
  waiting: Alert[];
}

export const emptyQueue: AlertQueueState = { current: null, phase: 'show', waiting: [] };

export type AlertAction =
  /** A new event arrived (alerts carry a cue; moderation events do not). */
  | { type: 'event'; event: ChatEvent; cue?: AlertCue; options: ChatThemeOptions }
  /** The current card's time is up. */
  | { type: 'leave' }
  /** The exit animation finished. */
  | { type: 'next' };

/** Whether a moderation event removes this card (a deleted cheer must not stay on screen). */
function removes(alert: Alert, event: ChatEvent, options: ChatThemeOptions): boolean {
  return reduceFeed({ items: [alert.item] }, event, options).items.length === 0;
}

export function reduceAlerts(state: AlertQueueState, action: AlertAction): AlertQueueState {
  switch (action.type) {
    case 'event': {
      const { event, cue, options } = action;
      if (event.type === 'message' || event.type === 'notice') {
        if (!cue) return state;
        // Display rules still apply, so a hidden bot never pops up.
        const item = reduceFeed(emptyFeed, event, { ...options, maxMessages: 1 }).items[0];
        if (!item) return state;
        const alert = { item, cue };
        return state.current
          ? { ...state, waiting: [...state.waiting, alert] }
          : { current: alert, phase: 'show', waiting: state.waiting };
      }
      const waiting = state.waiting.filter((alert) => !removes(alert, event, options));
      if (state.current && removes(state.current, event, options)) {
        return { current: waiting[0] ?? null, phase: 'show', waiting: waiting.slice(1) };
      }
      return waiting.length === state.waiting.length ? state : { ...state, waiting };
    }
    case 'leave':
      return state.current && state.phase === 'show' ? { ...state, phase: 'leave' } : state;
    case 'next':
      return { current: state.waiting[0] ?? null, phase: 'show', waiting: state.waiting.slice(1) };
  }
}
