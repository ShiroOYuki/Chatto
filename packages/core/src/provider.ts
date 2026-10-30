import type { ChatEvent, ConnectionState, PlatformId } from './message';

export type Unsubscribe = () => void;
export type ChatEventListener = (event: ChatEvent) => void;

/** Identifies one channel on one platform. */
export interface ChannelRef {
  platform: PlatformId;
  /** Platform-native channel / broadcaster id. */
  channelId: string;
  /** Login or handle, kept for display and for platforms that join by name. */
  login: string;
}

/**
 * Contract every platform adapter implements.
 *
 * A provider owns its network connections and authentication, and emits
 * normalized {@link ChatEvent}s only. Adding a platform means implementing this
 * interface in a new `@chatto/provider-*` package and registering it in the
 * desktop app's provider registry — nothing else needs to change.
 */
export interface ChatProvider {
  readonly platform: PlatformId;
  readonly state: ConnectionState;

  /** Start receiving chat for the channel. Resolves once the stream is live. */
  connect(channel: ChannelRef): Promise<void>;
  /** Stop and release every connection. Safe to call repeatedly. */
  disconnect(): Promise<void>;
  /** Subscribe to normalized events. Returns an unsubscribe function. */
  onEvent(listener: ChatEventListener): Unsubscribe;
}

/** Factory used by the provider registry so adapters can be created lazily. */
export interface ChatProviderFactory<TOptions = unknown> {
  readonly platform: PlatformId;
  readonly displayName: string;
  create(options: TOptions): ChatProvider;
}

/** Small typed event emitter shared by adapters. */
export class ChatEventEmitter {
  #listeners = new Set<ChatEventListener>();

  on(listener: ChatEventListener): Unsubscribe {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(event: ChatEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[chatto] chat event listener failed', error);
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
