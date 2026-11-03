import { emptyFeed, reduceFeed, type FeedItem } from '@chatto/chat-ui';
import { noticeGroup, type AlertCue, type ChatEvent, type ChatThemeOptions } from '@chatto/core';

/**
 * Alert overlay queue: one card at a time. A card shows for its cue's
 * duration, plays the theme's exit animation, then the next one comes up.
 * Every alert waits its turn; moderation events remove cards at once.
 *
 * A batch member (one gifted sub of "gifted 5 subs") that arrives before its
 * batch's lead is held for `GROUP_WAIT_MS`: if the lead comes in time, the
 * lead's single card replaces them; otherwise they queue as usual.
 */

/** How long a batch member waits for its lead notice. */
export const GROUP_WAIT_MS = 1500;

export interface Alert {
  item: FeedItem;
  cue: AlertCue;
}

interface HeldAlert {
  /** `noticeGroup` id of the batch. */
  group: string;
  alert: Alert;
}

export interface AlertQueueState {
  current: Alert | null;
  /** `leave` while the current card plays its exit animation. */
  phase: 'show' | 'leave';
  waiting: Alert[];
  /** Batch members waiting for their lead, oldest first. */
  held: HeldAlert[];
}

export const emptyQueue: AlertQueueState = { current: null, phase: 'show', waiting: [], held: [] };

export type AlertAction =
  /** A new event arrived (alerts carry a cue; moderation events do not). */
  | { type: 'event'; event: ChatEvent; cue?: AlertCue; options: ChatThemeOptions }
  /** A batch's lead did not arrive in time; its held members queue as usual. */
  | { type: 'release'; group: string }
  /** The current card's time is up. */
  | { type: 'leave' }
  /** The exit animation finished. */
  | { type: 'next' };

/** Whether a moderation event removes this card (a deleted cheer must not stay on screen). */
function removes(alert: Alert, event: ChatEvent, options: ChatThemeOptions): boolean {
  return reduceFeed({ items: [alert.item] }, event, options).items.length === 0;
}

function enqueue(state: AlertQueueState, alerts: Alert[]): AlertQueueState {
  if (alerts.length === 0) return state;
  if (state.current) return { ...state, waiting: [...state.waiting, ...alerts] };
  return { ...state, current: alerts[0]!, phase: 'show', waiting: [...state.waiting, ...alerts.slice(1)] };
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
        const group = event.type === 'notice' ? noticeGroup(event.notice) : null;
        if (group && !group.lead) return { ...state, held: [...state.held, { group: group.id, alert }] };
        if (group?.lead) {
          // The lead's card stands for the whole batch.
          return enqueue({ ...state, held: state.held.filter((entry) => entry.group !== group.id) }, [alert]);
        }
        return enqueue(state, [alert]);
      }
      const held = state.held.filter((entry) => !removes(entry.alert, event, options));
      const waiting = state.waiting.filter((alert) => !removes(alert, event, options));
      if (state.current && removes(state.current, event, options)) {
        return { current: waiting[0] ?? null, phase: 'show', waiting: waiting.slice(1), held };
      }
      return waiting.length === state.waiting.length && held.length === state.held.length
        ? state
        : { ...state, waiting, held };
    }
    case 'release': {
      const released = state.held.filter((entry) => entry.group === action.group);
      if (released.length === 0) return state;
      const held = state.held.filter((entry) => entry.group !== action.group);
      return enqueue(
        { ...state, held },
        released.map((entry) => entry.alert),
      );
    }
    case 'leave':
      return state.current && state.phase === 'show' ? { ...state, phase: 'leave' } : state;
    case 'next':
      return { ...state, current: state.waiting[0] ?? null, phase: 'show', waiting: state.waiting.slice(1) };
  }
}
