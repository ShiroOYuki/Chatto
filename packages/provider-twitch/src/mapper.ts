/**
 * Converts Twitch EventSub chat payloads into Chatto's normalized schema.
 * Kept pure (no I/O) so it can be unit-tested with recorded payloads.
 */
import {
  linkifyFragments,
  type ChatBadge,
  type ChatEvent,
  type ChatMessage,
  type ChatNotice,
  type ChatUser,
  type MessageFragment,
  type MessageHighlight,
  type NoticeKind,
  type UserRole,
} from '@chatto/core';

export interface TwitchBadgeRef {
  set_id: string;
  id: string;
  info: string;
}

export interface TwitchFragment {
  type: 'text' | 'cheermote' | 'emote' | 'mention' | 'gif' | (string & {});
  text: string;
  cheermote?: { prefix: string; bits: number; tier: number } | null;
  emote?: { id: string; emote_set_id: string; owner_id?: string; format?: string[] } | null;
  mention?: { user_id: string; user_name: string; user_login: string } | null;
  gif?: { gif_id: string; url: string } | null;
}

export interface TwitchChatMessageEvent {
  broadcaster_user_id: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  message: { text: string; fragments: TwitchFragment[] };
  message_type: string;
  color: string;
  badges: TwitchBadgeRef[];
  cheer?: { bits: number } | null;
  reply?: {
    parent_message_id: string;
    parent_message_body: string;
    parent_user_id: string;
    parent_user_name: string;
    parent_user_login: string;
  } | null;
}

export interface TwitchNotificationEvent {
  broadcaster_user_id: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  chatter_is_anonymous: boolean;
  color: string;
  badges: TwitchBadgeRef[];
  system_message: string;
  message_id: string;
  message: { text: string; fragments: TwitchFragment[] };
  notice_type: string;
  resub?: { cumulative_months?: number; streak_months?: number | null } | null;
  sub_gift?: { duration_months?: number; recipient_user_name?: string } | null;
  community_sub_gift?: { total?: number } | null;
  raid?: { viewer_count?: number; user_name?: string } | null;
}

export type BadgeLookup = (key: string) => ChatBadge | undefined;

const PLATFORM = 'twitch';
const ACTION_PATTERN = /^\u0001ACTION (.*)\u0001$/;

export function emoteImage(id: string, animated: boolean) {
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/${animated ? 'animated' : 'static'}/dark`;
  return { x1: `${base}/1.0`, x2: `${base}/2.0`, x4: `${base}/3.0` };
}

const ROLE_BY_BADGE: Record<string, UserRole> = {
  broadcaster: 'broadcaster',
  moderator: 'moderator',
  lead_moderator: 'moderator',
  vip: 'vip',
  subscriber: 'subscriber',
  founder: 'founder',
  staff: 'staff',
  partner: 'partner',
  artist: 'artist',
};

export function mapUser(
  id: string,
  login: string,
  displayName: string,
  color: string,
  badges: TwitchBadgeRef[],
  lookup: BadgeLookup,
): ChatUser {
  const roles = new Set<UserRole>();
  const mapped: ChatBadge[] = [];
  for (const badge of badges) {
    const role = ROLE_BY_BADGE[badge.set_id];
    if (role) roles.add(role);
    const key = `${badge.set_id}/${badge.id}`;
    mapped.push(lookup(key) ?? { id: key, setId: badge.set_id, title: badge.set_id });
  }
  return {
    id,
    login,
    displayName: displayName || login,
    color: color || undefined,
    badges: mapped,
    roles: [...roles],
  };
}

export function mapFragments(fragments: TwitchFragment[]): MessageFragment[] {
  const result: MessageFragment[] = [];
  for (const fragment of fragments) {
    if (fragment.type === 'emote' && fragment.emote) {
      const animated = fragment.emote.format?.includes('animated') ?? false;
      result.push({
        type: 'emote',
        text: fragment.text,
        emote: {
          id: fragment.emote.id,
          name: fragment.text,
          source: 'platform',
          animated,
          image: emoteImage(fragment.emote.id, animated),
        },
      });
    } else if (fragment.type === 'mention' && fragment.mention) {
      result.push({
        type: 'mention',
        text: fragment.text,
        user: {
          id: fragment.mention.user_id,
          login: fragment.mention.user_login,
          displayName: fragment.mention.user_name,
        },
      });
    } else if (fragment.type === 'cheermote' && fragment.cheermote) {
      result.push({
        type: 'cheer',
        text: fragment.text,
        prefix: fragment.cheermote.prefix,
        amount: fragment.cheermote.bits,
        tier: fragment.cheermote.tier,
      });
    } else if (fragment.type === 'gif' && fragment.gif) {
      result.push({ type: 'media', text: fragment.text, mediaType: 'gif', url: fragment.gif.url });
    } else {
      result.push({ type: 'text', text: fragment.text });
    }
  }
  return linkifyFragments(result);
}

const HIGHLIGHT_BY_TYPE: Record<string, MessageHighlight> = {
  channel_points_highlighted: 'highlighted',
  user_intro: 'first-message',
};

export function mapChatMessage(event: TwitchChatMessageEvent, lookup: BadgeLookup, now = Date.now()): ChatMessage {
  let fragments = mapFragments(event.message.fragments);
  let text = event.message.text;
  let isAction = false;

  const action = ACTION_PATTERN.exec(text);
  if (action) {
    isAction = true;
    text = action[1] ?? '';
    fragments = fragments.map((fragment) =>
      fragment.type === 'text'
        ? { ...fragment, text: fragment.text.replace('\u0001ACTION ', '').replace('\u0001', '') }
        : fragment,
    );
  }

  const highlight = HIGHLIGHT_BY_TYPE[event.message_type];
  return {
    id: event.message_id,
    platform: PLATFORM,
    channelId: event.broadcaster_user_id,
    timestamp: now,
    author: mapUser(
      event.chatter_user_id,
      event.chatter_user_login,
      event.chatter_user_name,
      event.color,
      event.badges,
      lookup,
    ),
    fragments,
    text,
    isAction,
    highlights: highlight ? [highlight] : [],
    reply: event.reply
      ? {
          parentMessageId: event.reply.parent_message_id,
          parentText: event.reply.parent_message_body,
          parentAuthor: {
            id: event.reply.parent_user_id,
            login: event.reply.parent_user_login,
            displayName: event.reply.parent_user_name,
          },
        }
      : undefined,
    cheerAmount: event.cheer?.bits,
  };
}

const NOTICE_KIND: Record<string, NoticeKind> = {
  sub: 'subscription',
  resub: 'resubscription',
  sub_gift: 'gift-subscription',
  community_sub_gift: 'gift-subscription',
  raid: 'raid',
  announcement: 'announcement',
  watch_streak: 'watch-streak',
};

export function mapNotification(event: TwitchNotificationEvent, lookup: BadgeLookup, now = Date.now()): ChatNotice {
  const meta: ChatNotice['meta'] = { noticeType: event.notice_type };
  if (event.resub?.cumulative_months) meta.months = event.resub.cumulative_months;
  if (event.community_sub_gift?.total) meta.count = event.community_sub_gift.total;
  if (event.raid?.viewer_count) meta.viewers = event.raid.viewer_count;

  return {
    id: event.message_id,
    platform: PLATFORM,
    channelId: event.broadcaster_user_id,
    timestamp: now,
    kind: NOTICE_KIND[event.notice_type] ?? 'other',
    systemText: event.system_message,
    author: event.chatter_is_anonymous
      ? undefined
      : mapUser(
          event.chatter_user_id,
          event.chatter_user_login,
          event.chatter_user_name,
          event.color,
          event.badges,
          lookup,
        ),
    fragments: event.message?.text ? mapFragments(event.message.fragments) : [],
    meta,
  };
}

/** Maps any supported EventSub notification to a ChatEvent, or null when ignored. */
export function mapEventSubNotification(type: string, event: unknown, lookup: BadgeLookup): ChatEvent | null {
  const e = event as Record<string, string>;
  switch (type) {
    case 'channel.chat.message':
      return { type: 'message', message: mapChatMessage(event as TwitchChatMessageEvent, lookup) };
    case 'channel.chat.notification':
      return { type: 'notice', notice: mapNotification(event as TwitchNotificationEvent, lookup) };
    case 'channel.chat.message_delete':
      return {
        type: 'message-deleted',
        platform: PLATFORM,
        channelId: e.broadcaster_user_id ?? '',
        messageId: e.message_id ?? '',
      };
    case 'channel.chat.clear_user_messages':
      return {
        type: 'user-cleared',
        platform: PLATFORM,
        channelId: e.broadcaster_user_id ?? '',
        userId: e.target_user_id ?? '',
      };
    case 'channel.chat.clear':
      return { type: 'chat-cleared', platform: PLATFORM, channelId: e.broadcaster_user_id ?? '' };
    default:
      return null;
  }
}
