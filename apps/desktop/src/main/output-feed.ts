import type { ChatEvent } from '@chatto/core';
import { ChatHub } from './chat-hub';

/** Messages held while paused; the oldest go first past this. */
export const MAX_HELD = 500;

/**
 * What the overlays and OBS get (#53): the chat hub's events, unless the streamer paused them.
 * While paused, new messages and notices wait here and arrive in order on resume; deletions,
 * timeouts and clears still go out at once (and drop what they remove from the waiting ones),
 * so moderated messages never linger on stream. The control panel reads the hub directly and
 * is never paused. `clear()` forgets what viewers would get on (re)connecting.
 */
export class OutputFeed {
  #out = new ChatHub();
  #held = new ChatHub(MAX_HELD);
  #paused = false;

  constructor(source: Pick<ChatHub, 'subscribe'>) {
    source.subscribe((event) => this.#receive(event));
  }

  get paused(): boolean {
    return this.#paused;
  }

  subscribe(listener: (event: ChatEvent) => void): () => void {
    return this.#out.subscribe(listener);
  }

  backlog(): ChatEvent[] {
    return this.#out.backlog();
  }

  setPaused(paused: boolean): void {
    if (paused === this.#paused) return;
    this.#paused = paused;
    if (paused) return;
    const held = this.#held.backlog();
    this.#held.clear();
    for (const event of held) this.#out.publish(event);
  }

  /** Drops what is on screen and what is waiting; viewers are told separately (`broadcastClear`). */
  clear(): void {
    this.#out.clear();
    this.#held.clear();
  }

  #receive(event: ChatEvent): void {
    if (this.#paused && (event.type === 'message' || event.type === 'notice')) {
      this.#held.publish(event);
      return;
    }
    if (this.#paused) this.#held.publish(event);
    this.#out.publish(event);
  }
}
