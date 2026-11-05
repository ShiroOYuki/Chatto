import { isRedemption } from '@chatto/chat-ui';
import type { ChatEvent, ChatNotice } from '@chatto/core';

/**
 * The control panel's redemption list: channel points redemptions of this
 * session, newest first. Closing one only takes it off this list; Chatto never
 * changes the redemption on the platform, and outputs that showed it keep it.
 * It lives in the store, so it keeps collecting while the chat page is not
 * open. Nothing is saved: a restart starts empty.
 */

export interface RedemptionEntry {
  /** `${platform}:${redemption id}`. */
  key: string;
  /** When the control panel received it. */
  at: number;
  notice: ChatNotice;
}

export const REDEMPTION_LIMIT = 200;

export interface RedemptionLogState {
  entries: RedemptionEntry[];
}

export const emptyRedemptionLog: RedemptionLogState = { entries: [] };

export type RedemptionLogAction =
  | { type: 'event'; event: ChatEvent; at: number }
  /** Takes one redemption off the list. */
  | { type: 'dismiss'; key: string };

export const redemptionKey = (notice: ChatNotice) => `${notice.platform}:${notice.id}`;

export function reduceRedemptions(state: RedemptionLogState, action: RedemptionLogAction): RedemptionLogState {
  switch (action.type) {
    case 'event': {
      const { event } = action;
      if (event.type !== 'notice' || !isRedemption(event.notice)) return state;
      const key = redemptionKey(event.notice);
      // A redelivered redemption keeps its place.
      if (state.entries.some((entry) => entry.key === key)) return state;
      const entry: RedemptionEntry = { key, at: action.at, notice: event.notice };
      return { entries: [entry, ...state.entries].slice(0, REDEMPTION_LIMIT) };
    }
    case 'dismiss': {
      const entries = state.entries.filter((entry) => entry.key !== action.key);
      return entries.length === state.entries.length ? state : { entries };
    }
  }
}

/** What a redemption list row shows, read from the notice's normalized `meta`. */
export function redemptionDetails(notice: ChatNotice): { cost?: number; input?: string } {
  const { cost, input } = notice.meta;
  return {
    cost: typeof cost === 'number' ? cost : undefined,
    input: typeof input === 'string' && input ? input : undefined,
  };
}
