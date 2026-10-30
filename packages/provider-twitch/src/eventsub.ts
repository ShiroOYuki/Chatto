/**
 * Minimal EventSub WebSocket session with keepalive watchdog, server-initiated
 * reconnects and exponential back-off.
 * https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
 */

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';

export interface EventSubMetadata {
  message_id: string;
  message_type: 'session_welcome' | 'session_keepalive' | 'notification' | 'session_reconnect' | 'revocation';
  message_timestamp: string;
  subscription_type?: string;
  subscription_version?: string;
}

interface EventSubFrame {
  metadata: EventSubMetadata;
  payload: {
    session?: { id: string; keepalive_timeout_seconds: number | null; reconnect_url: string | null };
    subscription?: { type: string; status: string };
    event?: unknown;
  };
}

export interface EventSubHandlers {
  /** Called with a fresh session id; subscriptions must be created within 10 s. */
  onWelcome(sessionId: string): Promise<void>;
  onNotification(type: string, event: unknown): void;
  onRevocation(type: string, status: string): void;
  onStateChange(state: 'connecting' | 'connected' | 'reconnecting' | 'closed', detail?: string): void;
}

export class EventSubSession {
  #socket: WebSocket | null = null;
  #watchdog: ReturnType<typeof setTimeout> | null = null;
  #keepaliveMs = 10_000;
  #attempt = 0;
  #closedByUser = false;
  #seenMessageIds = new Set<string>();

  constructor(private readonly handlers: EventSubHandlers) {}

  open(): void {
    this.#closedByUser = false;
    this.#connect(EVENTSUB_URL, false);
  }

  close(): void {
    this.#closedByUser = true;
    this.#clearWatchdog();
    this.#socket?.close();
    this.#socket = null;
    this.handlers.onStateChange('closed');
  }

  #connect(url: string, isServerReconnect: boolean): void {
    this.handlers.onStateChange(this.#attempt === 0 && !isServerReconnect ? 'connecting' : 'reconnecting');
    const socket = new WebSocket(url);
    const previous = this.#socket;

    socket.addEventListener('message', (message) => {
      void this.#handleFrame(socket, String(message.data), previous);
    });
    socket.addEventListener('close', () => {
      if (socket !== this.#socket) return; // replaced by a reconnect socket
      this.#clearWatchdog();
      if (this.#closedByUser) return;
      this.#scheduleReconnect('connection closed');
    });
    socket.addEventListener('error', () => socket.close());

    if (!isServerReconnect) this.#socket = socket;
    else this.#pendingReconnect = socket;
  }

  #pendingReconnect: WebSocket | null = null;

  async #handleFrame(socket: WebSocket, raw: string, previous: WebSocket | null): Promise<void> {
    let frame: EventSubFrame;
    try {
      frame = JSON.parse(raw) as EventSubFrame;
    } catch {
      return;
    }
    const { metadata, payload } = frame;

    // Twitch may redeliver; de-duplicate by message id.
    if (this.#seenMessageIds.has(metadata.message_id)) return;
    this.#seenMessageIds.add(metadata.message_id);
    if (this.#seenMessageIds.size > 500) {
      const first = this.#seenMessageIds.values().next().value;
      if (first) this.#seenMessageIds.delete(first);
    }

    this.#resetWatchdog();

    switch (metadata.message_type) {
      case 'session_welcome': {
        const session = payload.session!;
        this.#keepaliveMs = ((session.keepalive_timeout_seconds ?? 10) + 5) * 1000;
        if (socket === this.#pendingReconnect) {
          // Server-initiated reconnect: subscriptions carry over, swap sockets.
          this.#pendingReconnect = null;
          this.#socket = socket;
          previous?.close();
        } else {
          await this.handlers.onWelcome(session.id);
        }
        this.#attempt = 0;
        this.handlers.onStateChange('connected');
        break;
      }
      case 'session_keepalive':
        break;
      case 'notification':
        if (metadata.subscription_type) this.handlers.onNotification(metadata.subscription_type, payload.event);
        break;
      case 'session_reconnect':
        if (payload.session?.reconnect_url) this.#connect(payload.session.reconnect_url, true);
        break;
      case 'revocation':
        if (payload.subscription) this.handlers.onRevocation(payload.subscription.type, payload.subscription.status);
        break;
    }
  }

  #scheduleReconnect(reason: string): void {
    this.handlers.onStateChange('reconnecting', reason);
    const delay = Math.min(30_000, 1000 * 2 ** this.#attempt);
    this.#attempt += 1;
    setTimeout(() => {
      if (!this.#closedByUser) this.#connect(EVENTSUB_URL, false);
    }, delay);
  }

  #resetWatchdog(): void {
    this.#clearWatchdog();
    this.#watchdog = setTimeout(() => this.#socket?.close(), this.#keepaliveMs);
  }

  #clearWatchdog(): void {
    if (this.#watchdog) clearTimeout(this.#watchdog);
    this.#watchdog = null;
  }
}
