import { fragmentsToText } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { mapChatMessage, mapEventSubNotification, twitchNoticeEventType, type TwitchChatMessageEvent } from './mapper';

const base: TwitchChatMessageEvent = {
  broadcaster_user_id: '1',
  chatter_user_id: '2',
  chatter_user_login: 'mochi_fan',
  chatter_user_name: 'Mochi_Fan',
  message_id: 'abc',
  message_type: 'text',
  color: '#FAC775',
  badges: [{ set_id: 'moderator', id: '1', info: '' }],
  message: {
    text: 'hi Kappa @shiraine_ciel https://chatto.dev',
    fragments: [
      { type: 'text', text: 'hi ' },
      { type: 'emote', text: 'Kappa', emote: { id: '25', emote_set_id: '0', format: ['static'] } },
      { type: 'text', text: ' ' },
      {
        type: 'mention',
        text: '@shiraine_ciel',
        mention: { user_id: '1', user_login: 'shiraine_ciel', user_name: 'shiraine_ciel' },
      },
      { type: 'text', text: ' https://chatto.dev' },
    ],
  },
};

describe('twitch mapper', () => {
  it('maps fragments, roles and links', () => {
    const message = mapChatMessage(base, () => undefined, 0);
    expect(message.author.roles).toContain('moderator');
    expect(message.fragments.map((f) => f.type)).toEqual(['text', 'emote', 'text', 'mention', 'text', 'link']);
    expect(fragmentsToText(message.fragments)).toBe(base.message.text);
  });

  it('tags cheers and highlighted messages as events', () => {
    expect(mapChatMessage({ ...base, cheer: { bits: 100 } }, () => undefined).eventType).toBe('cheer');
    expect(mapChatMessage({ ...base, message_type: 'channel_points_highlighted' }, () => undefined).eventType).toBe(
      'highlighted',
    );
    expect(mapChatMessage(base, () => undefined).eventType).toBeUndefined();
    expect(twitchNoticeEventType('community_sub_gift')).toBe('community-gift');
    expect(twitchNoticeEventType('shared_chat_resub')).toBe('resub');
    expect(twitchNoticeEventType('watch_streak')).toBe('watch-streak');
  });

  it('detects /me actions', () => {
    const message = mapChatMessage(
      {
        ...base,
        message: { text: '\u0001ACTION waves\u0001', fragments: [{ type: 'text', text: '\u0001ACTION waves\u0001' }] },
      },
      () => undefined,
    );
    expect(message.isAction).toBe(true);
    expect(message.text).toBe('waves');
  });

  it('maps moderation events', () => {
    const event = mapEventSubNotification(
      'channel.chat.message_delete',
      { broadcaster_user_id: '1', message_id: 'abc', target_user_id: '2' },
      () => undefined,
    );
    expect(event).toEqual({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: 'abc' });
  });
});
