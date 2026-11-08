import type { ChatEvent } from '@chatto/core';
import { emptyChatLog, reduceChatLog, type ChatLogState } from './chatLog';
import { emptyRedemptionLog, reduceRedemptions, type RedemptionLogState } from './redemptionLog';

/**
 * The control panel's session logs (chat log and redemption list), kept by
 * the main process so the control panel window can be closed to save memory
 * (#57) and still show the whole session when it opens again.
 *
 * Every event gets a sequence number. A window that opens asks for a
 * snapshot while already listening for events, then keeps only the events
 * newer than the snapshot (`eventsAfter`), so none is lost or counted twice.
 */

/** A chat event as the control panel receives it. */
export interface LoggedChatEvent {
  event: ChatEvent;
  /** When Chatto received it (epoch ms). */
  at: number;
  /** Increases by one per event; 0 means none yet. */
  seq: number;
}

export interface ControlLogSnapshot {
  /** The `seq` of the last event included. */
  seq: number;
  chatLog: ChatLogState;
  redemptions: RedemptionLogState;
}

export class ControlLog {
  #seq = 0;
  #chatLog: ChatLogState = emptyChatLog;
  #redemptions: RedemptionLogState = emptyRedemptionLog;

  receive(event: ChatEvent, at: number = Date.now()): LoggedChatEvent {
    this.#seq += 1;
    this.#chatLog = reduceChatLog(this.#chatLog, { type: 'event', event, at });
    this.#redemptions = reduceRedemptions(this.#redemptions, { type: 'event', event, at });
    return { event, at, seq: this.#seq };
  }

  /** Empties the chat log (the session stats stay), as the chat page's "clear" does. */
  clearChat(): void {
    this.#chatLog = reduceChatLog(this.#chatLog, { type: 'clear' });
  }

  dismissRedemption(key: string): void {
    this.#redemptions = reduceRedemptions(this.#redemptions, { type: 'dismiss', key });
  }

  snapshot(): ControlLogSnapshot {
    return { seq: this.#seq, chatLog: this.#chatLog, redemptions: this.#redemptions };
  }
}

/** The events that arrived while a snapshot was on its way and are not in it yet. */
export function eventsAfter(snapshot: Pick<ControlLogSnapshot, 'seq'>, events: LoggedChatEvent[]): LoggedChatEvent[] {
  return events.filter((item) => item.seq > snapshot.seq);
}

/** The control panel's copy of the session logs. */
export interface ControlLogView {
  seq: number;
  chatLog: ChatLogState;
  redemptions: RedemptionLogState;
  /** The snapshot from the main process has arrived. */
  loaded: boolean;
  /** Events that arrived before the snapshot. */
  pending: LoggedChatEvent[];
}

export const emptyControlLogView: ControlLogView = {
  seq: 0,
  chatLog: emptyChatLog,
  redemptions: emptyRedemptionLog,
  loaded: false,
  pending: [],
};

export type ControlLogViewAction =
  | { type: 'load'; snapshot: ControlLogSnapshot }
  | { type: 'event'; item: LoggedChatEvent }
  | { type: 'clear-chat' }
  | { type: 'dismiss-redemption'; key: string };

function apply(view: ControlLogView, { event, at, seq }: LoggedChatEvent): ControlLogView {
  // Already in the snapshot, or delivered twice.
  if (seq <= view.seq) return view;
  return {
    ...view,
    seq,
    chatLog: reduceChatLog(view.chatLog, { type: 'event', event, at }),
    redemptions: reduceRedemptions(view.redemptions, { type: 'event', event, at }),
  };
}

/**
 * Keeps the control panel in step with the main process: events wait until
 * the snapshot arrives, then only the newer ones are applied on top of it.
 */
export function reduceControlLogView(view: ControlLogView, action: ControlLogViewAction): ControlLogView {
  switch (action.type) {
    case 'load': {
      const { snapshot } = action;
      const loaded: ControlLogView = {
        seq: snapshot.seq,
        chatLog: snapshot.chatLog,
        redemptions: snapshot.redemptions,
        loaded: true,
        pending: [],
      };
      return eventsAfter(snapshot, view.pending).reduce(apply, loaded);
    }
    case 'event':
      return view.loaded ? apply(view, action.item) : { ...view, pending: [...view.pending, action.item] };
    case 'clear-chat':
      return { ...view, chatLog: reduceChatLog(view.chatLog, { type: 'clear' }) };
    case 'dismiss-redemption':
      return { ...view, redemptions: reduceRedemptions(view.redemptions, { type: 'dismiss', key: action.key }) };
  }
}
