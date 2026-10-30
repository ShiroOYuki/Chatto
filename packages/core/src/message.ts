/**
 * Chatto normalized chat schema.
 *
 * Every platform adapter converts its native payloads into these types, so
 * renderers, themes and the transport layer never depend on a specific
 * platform. Bump {@link SCHEMA_VERSION} on any breaking change and document it
 * in docs/message-format.md.
 */

export const SCHEMA_VERSION = 1 as const;

/** Known platforms. Open-ended so third-party adapters can register their own id. */
export type PlatformId = 'twitch' | 'youtube' | 'kick' | (string & {});

/** Image in several pixel densities. Renderers pick the closest match. */
export interface ImageSet {
  /** 1x density, always present. */
  x1: string;
  x2?: string;
  x4?: string;
}

/** Normalized privilege level, used by themes to style names and filter messages. */
export type UserRole =
  'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'founder' | 'staff' | 'partner' | 'artist' | 'bot';

export interface ChatBadge {
  /** Stable id, unique within the platform, e.g. `subscriber/12`. */
  id: string;
  /** Badge family without version, e.g. `subscriber`. */
  setId: string;
  title: string;
  image?: ImageSet;
}

export interface ChatUser {
  /** Platform-native user id. */
  id: string;
  /** Lowercase login / handle. */
  login: string;
  displayName: string;
  /** Hex colour such as `#1E90FF`, when the platform provides one. */
  color?: string;
  avatar?: string;
  badges: ChatBadge[];
  roles: UserRole[];
}

/** Where an emote comes from. Third-party sources share the emote fragment type. */
export type EmoteSource = 'platform' | '7tv' | 'bttv' | 'ffz' | (string & {});

export interface Emote {
  id: string;
  /** Text code that produced the emote, e.g. `Kappa`. */
  name: string;
  source: EmoteSource;
  image: ImageSet;
  animated?: boolean;
  /** Zero-width emotes overlay the previous emote (7TV / BTTV). */
  zeroWidth?: boolean;
}

/**
 * A message body is an ordered list of fragments. Concatenating every
 * fragment's `text` must reproduce the original plain text.
 */
export type MessageFragment =
  | { type: 'text'; text: string }
  | { type: 'emote'; text: string; emote: Emote }
  | { type: 'mention'; text: string; user: Pick<ChatUser, 'id' | 'login' | 'displayName'> }
  | { type: 'cheer'; text: string; prefix: string; amount: number; tier?: number; image?: ImageSet }
  | { type: 'link'; text: string; url: string }
  | { type: 'media'; text: string; mediaType: 'gif' | 'image'; url: string };

export type MessageFragmentType = MessageFragment['type'];

/** Visual emphasis flags the platform attached to a message. */
export type MessageHighlight =
  'first-message' | 'highlighted' | 'returning-chatter' | 'mentions-broadcaster' | (string & {});

export interface ChatMessageReply {
  parentMessageId: string;
  parentAuthor: Pick<ChatUser, 'id' | 'login' | 'displayName'>;
  parentText: string;
}

export interface ChatMessage {
  /** Platform-native message id, unique within platform + channel. */
  id: string;
  platform: PlatformId;
  channelId: string;
  /** Unix epoch milliseconds. */
  timestamp: number;
  author: ChatUser;
  fragments: MessageFragment[];
  /** Plain text, equal to concatenating fragment texts. */
  text: string;
  /** `/me` style action message. */
  isAction: boolean;
  highlights: MessageHighlight[];
  reply?: ChatMessageReply;
  /** Total bits / currency attached to the message, if any. */
  cheerAmount?: number;
}

/** Non-chat channel activity rendered inline in the chat (subs, raids, …). */
export type NoticeKind =
  'subscription' | 'resubscription' | 'gift-subscription' | 'raid' | 'announcement' | 'watch-streak' | 'other';

export interface ChatNotice {
  id: string;
  platform: PlatformId;
  channelId: string;
  timestamp: number;
  kind: NoticeKind;
  /** Human-readable system line, e.g. "Ciel subscribed for 3 months". */
  systemText: string;
  /** Optional attached chat message (resub message, announcement body). */
  author?: ChatUser;
  fragments: MessageFragment[];
  /** Extra platform-specific numbers (months, viewers, count), already normalized. */
  meta: Record<string, string | number | boolean>;
}

/** Connection lifecycle of one provider/channel pair. */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';

/**
 * The single event stream every consumer (overlay, embed, plugins) reads.
 * Moderation events let renderers remove messages that must not stay on screen.
 */
export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'notice'; notice: ChatNotice }
  | { type: 'message-deleted'; platform: PlatformId; channelId: string; messageId: string }
  | { type: 'user-cleared'; platform: PlatformId; channelId: string; userId: string }
  | { type: 'chat-cleared'; platform: PlatformId; channelId: string }
  | {
      type: 'connection';
      platform: PlatformId;
      channelId: string;
      state: ConnectionState;
      detail?: string;
    };

export type ChatEventType = ChatEvent['type'];
