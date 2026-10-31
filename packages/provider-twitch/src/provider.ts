import {
  ChatEventEmitter,
  type ChannelRef,
  type ChatBadge,
  type ChatEventListener,
  type ChatProvider,
  type ChatProviderFactory,
  type ConnectionState,
  type Unsubscribe,
} from '@chatto/core';
import { TwitchAuth, type TokenStore } from './auth';
import { EventSubSession } from './eventsub';
import { HelixClient } from './helix';
import { mapEventSubNotification } from './mapper';

/** EventSub subscriptions Chatto relies on (all v1, all need user:read:chat). */
export const CHAT_SUBSCRIPTIONS = [
  'channel.chat.message',
  'channel.chat.notification',
  'channel.chat.message_delete',
  'channel.chat.clear_user_messages',
  'channel.chat.clear',
] as const;

export interface TwitchProviderOptions {
  clientId: string;
  tokenStore: TokenStore;
}

export class TwitchChatProvider implements ChatProvider {
  readonly platform = 'twitch';
  readonly auth: TwitchAuth;
  readonly helix: HelixClient;

  #state: ConnectionState = 'idle';
  #emitter = new ChatEventEmitter();
  #session: EventSubSession | null = null;
  #channel: ChannelRef | null = null;
  #badges = new Map<string, ChatBadge>();

  constructor(options: TwitchProviderOptions) {
    this.auth = new TwitchAuth(options.clientId, options.tokenStore);
    this.helix = new HelixClient(this.auth);
  }

  get state(): ConnectionState {
    return this.#state;
  }

  onEvent(listener: ChatEventListener): Unsubscribe {
    return this.#emitter.on(listener);
  }

  /** Resolve a login (e.g. typed into the UI) into a channel reference. */
  async resolveChannel(login: string): Promise<ChannelRef> {
    const user = await this.helix.getUserByLogin(login.trim().toLowerCase());
    if (!user) throw new Error(`Twitch channel "${login}" not found`);
    return { platform: this.platform, channelId: user.id, login: user.login };
  }

  async connect(channel: ChannelRef): Promise<void> {
    await this.disconnect();
    const identity = await this.auth.currentIdentity();
    if (!identity) throw new Error('Sign in to Twitch first');

    this.#channel = channel;
    this.#badges = await this.helix.getBadges(channel.channelId).catch(() => new Map());

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      this.#session = new EventSubSession({
        onWelcome: async (sessionId) => {
          try {
            await Promise.all(
              CHAT_SUBSCRIPTIONS.map((type) =>
                this.helix.createEventSubSubscription(
                  type,
                  '1',
                  { broadcaster_user_id: channel.channelId, user_id: identity.userId },
                  sessionId,
                ),
              ),
            );
            if (!settled) {
              settled = true;
              resolve();
            }
          } catch (error) {
            if (!settled) {
              settled = true;
              reject(error);
            }
            throw error; // the session reports the error state and stops
          }
        },
        onNotification: (type, event) => {
          const mapped = mapEventSubNotification(type, event, (key) => this.#badges.get(key));
          if (mapped) this.#emitter.emit(mapped);
        },
        onRevocation: (type, status) => {
          this.#setState('error', `Subscription ${type} revoked: ${status}`);
        },
        onStateChange: (state, detail) => this.#setState(state, detail),
      });
      this.#session.open();
    });
  }

  async disconnect(): Promise<void> {
    this.#session?.close();
    this.#session = null;
  }

  #setState(state: ConnectionState, detail?: string): void {
    this.#state = state;
    if (!this.#channel) return;
    this.#emitter.emit({
      type: 'connection',
      platform: this.platform,
      channelId: this.#channel.channelId,
      state,
      detail,
    });
  }
}

export const twitchProviderFactory: ChatProviderFactory<TwitchProviderOptions> = {
  platform: 'twitch',
  displayName: 'Twitch',
  create: (options) => new TwitchChatProvider(options),
};
