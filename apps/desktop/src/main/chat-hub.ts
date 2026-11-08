import type { ChatEvent } from '@chatto/core';

const BACKLOG_SIZE = 50;

/**
 * Fan-out point for every normalized event. Providers publish here; the local
 * server, the control panel and future plugins subscribe. Keeps a short
 * backlog so a viewer opened mid-stream is not empty.
 */
export class ChatHub {
  #listeners = new Set<(event: ChatEvent) => void>();
  #backlog: ChatEvent[] = [];

  constructor(private readonly backlogSize = BACKLOG_SIZE) {}

  publish(event: ChatEvent): void {
    this.#remember(event);
    for (const listener of this.#listeners) listener(event);
  }

  subscribe(listener: (event: ChatEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  backlog(): ChatEvent[] {
    return [...this.#backlog];
  }

  /** Forgets the backlog, so a viewer opened later starts empty. */
  clear(): void {
    this.#backlog = [];
  }

  #remember(event: ChatEvent): void {
    switch (event.type) {
      case 'message':
      case 'notice':
        this.#backlog.push(event);
        if (this.#backlog.length > this.backlogSize) this.#backlog.shift();
        break;
      case 'message-deleted':
        this.#backlog = this.#backlog.filter(
          (item) => !(item.type === 'message' && item.message.id === event.messageId),
        );
        break;
      case 'user-cleared':
        this.#backlog = this.#backlog.filter(
          (item) => !(item.type === 'message' && item.message.author.id === event.userId),
        );
        break;
      case 'chat-cleared':
        this.#backlog = this.#backlog.filter((item) =>
          item.type === 'message' ? item.message.platform !== event.platform : true,
        );
        break;
      case 'connection':
        break;
    }
  }
}
