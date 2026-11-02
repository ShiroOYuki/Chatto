import { describe, expect, it } from 'vitest';
import { fragmentsToText, noticeGroup } from '@chatto/core';
import {
  mapChatMessage,
  mapEventSubNotification,
  mapNotification,
  noticeMeta,
  twitchNoticeEventType,
  type TwitchChatMessageEvent,
  type TwitchNotificationEvent,
} from './mapper';

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

  it('ties a community gift and its gifted subs together', () => {
    // Shapes from channel.chat.notification (EventSub v1), trimmed to what the mapper reads.
    const notification = (patch: Partial<TwitchNotificationEvent>): TwitchNotificationEvent => ({
      broadcaster_user_id: '1',
      chatter_user_id: '3',
      chatter_user_login: 'matchalatte',
      chatter_user_name: 'MatchaLatte',
      chatter_is_anonymous: false,
      color: '#97C459',
      badges: [],
      system_message: '',
      message_id: 'n',
      message: { text: '', fragments: [] },
      notice_type: 'sub',
      ...patch,
    });
    const lead = mapNotification(
      notification({
        message_id: 'lead',
        notice_type: 'community_sub_gift',
        system_message: 'MatchaLatte is gifting 5 Tier 1 Subs to the community!',
        community_sub_gift: { id: '42', total: 5 },
      }),
      () => undefined,
    );
    const gift = mapNotification(
      notification({
        message_id: 'gift-1',
        notice_type: 'sub_gift',
        system_message: 'MatchaLatte gifted a Tier 1 sub to okome_rice!',
        sub_gift: { duration_months: 1, recipient_user_name: 'okome_rice', community_gift_id: '42' },
      }),
      () => undefined,
    );
    const direct = mapNotification(
      notification({
        notice_type: 'sub_gift',
        sub_gift: { recipient_user_name: 'Mochi_Fan', community_gift_id: null },
      }),
      () => undefined,
    );
    expect(lead.meta).toMatchObject({ count: 5, groupId: '42', groupLead: true });
    expect(noticeGroup(lead)).toEqual({ id: 'twitch:42', lead: true });
    expect(gift.meta).toMatchObject({ groupId: '42', recipient: 'okome_rice' });
    expect(noticeGroup(gift)).toEqual({ id: 'twitch:42', lead: false });
    expect(noticeGroup(direct)).toBeNull();
    expect(direct.meta.recipient).toBe('Mochi_Fan');
  });

  it('normalizes notice payloads into the shared meta keys', () => {
    const meta = (notice_type: string, payload: Record<string, unknown>, anonymous = false) =>
      noticeMeta({
        broadcaster_user_id: '1',
        chatter_user_id: '3',
        chatter_user_login: 'mochi_fan',
        chatter_user_name: 'Mochi_Fan',
        chatter_is_anonymous: anonymous,
        color: '',
        badges: [],
        system_message: '',
        message_id: 'n',
        message: { text: '', fragments: [] },
        notice_type,
        ...payload,
      });
    // Recorded shape from the EventSub reference (resub, viewer hid their streak).
    expect(
      meta('resub', {
        resub: {
          cumulative_months: 99,
          duration_months: 0,
          streak_months: null,
          sub_tier: '1000',
          is_prime: false,
          is_gift: false,
          gifter_is_anonymous: null,
          gifter_user_name: null,
        },
      }),
    ).toEqual({ noticeType: 'resub', tier: '1', months: 99 });
    // Shared chat puts the same payload under a prefixed key.
    expect(
      meta('shared_chat_resub', {
        resub: null,
        shared_chat_resub: { cumulative_months: 3, streak_months: 3, sub_tier: '2000' },
      }),
    ).toMatchObject({ tier: '2', months: 3, streakMonths: 3 });
    expect(meta('sub', { sub: { sub_tier: '1000', is_prime: true, duration_months: 6 } })).toMatchObject({
      tier: 'prime',
      durationMonths: 6,
    });
    expect(
      meta('sub_gift', {
        sub_gift: { sub_tier: '3000', recipient_user_name: 'okome_rice', duration_months: 1, cumulative_total: 12 },
      }),
    ).toMatchObject({ tier: '3', recipient: 'okome_rice', totalGifts: 12 });
    expect(
      meta('community_sub_gift', { community_sub_gift: { id: 'g', total: 5, sub_tier: '1000' } }, true),
    ).toMatchObject({
      tier: '1',
      count: 5,
      anonymous: true,
    });
    expect(
      meta('gift_paid_upgrade', { gift_paid_upgrade: { gifter_is_anonymous: false, gifter_user_name: 'MatchaLatte' } }),
    ).toMatchObject({
      gifter: 'MatchaLatte',
    });
    expect(
      meta('pay_it_forward', { pay_it_forward: { gifter_is_anonymous: true, gifter_user_name: null } }),
    ).toMatchObject({
      gifterAnonymous: true,
    });
    expect(meta('raid', { raid: { user_name: 'ShiroLive', viewer_count: 42 } })).toMatchObject({
      raider: 'ShiroLive',
      viewers: 42,
    });
    expect(meta('bits_badge_tier', { bits_badge_tier: { tier: 1000 } })).toMatchObject({ bitsTier: 1000 });
    expect(
      meta('charity_donation', {
        charity_donation: { charity_name: '茶園基金會', amount: { value: 1250, decimal_places: 2, currency: 'USD' } },
      }),
    ).toMatchObject({ charity: '茶園基金會', donation: 12.5, currency: 'USD' });
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
