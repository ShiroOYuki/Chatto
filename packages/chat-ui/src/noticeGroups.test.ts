import type { ChatNotice } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { emptyFeed, reduceFeed, type FeedState } from './feed';
import { createMockGiftBatch } from './mock';
import { mockNotice } from './mockData';
import { groupNotice, type NoticeGroupAccess } from './noticeGroups';
import { PRESET_THEMES } from './themes';

interface Entry {
  notice: ChatNotice;
  members: ChatNotice[];
}
const access: NoticeGroupAccess<Entry> = {
  notice: (entry) => entry.notice,
  members: (entry) => entry.members,
  withMembers: (entry, members) => ({ ...entry, members }),
};
const notices = (count = 3) =>
  createMockGiftBatch(count).map((event) => (event.type === 'notice' ? event.notice : null!));
const add = (entries: Entry[], notice: ChatNotice) => {
  const grouped = groupNotice(entries, notice, access);
  return grouped.merged ? grouped.entries : [...grouped.entries, { notice, members: grouped.members }];
};

describe('notice batches', () => {
  it('folds gifted subs into the community gift that announced them', () => {
    const [lead, ...gifts] = notices();
    const entries = [lead!, ...gifts].reduce(add, []);
    expect(entries).toEqual([{ notice: lead, members: gifts }]);
  });

  it('folds gifted subs that arrived before their community gift', () => {
    const [lead, first, ...rest] = notices();
    const other = mockNotice({ eventType: 'raid', kind: 'raid', systemText: '揪團' });
    const entries = [first!, other, lead!, ...rest].reduce(add, []);
    expect(entries).toEqual([
      { notice: other, members: [] },
      { notice: lead, members: [first, ...rest] },
    ]);
  });

  it('keeps separate batches and standalone notices apart', () => {
    const [leadA, giftA] = notices(1);
    const [leadB, giftB] = notices(1);
    const direct = mockNotice({ eventType: 'sub-gift', kind: 'gift-subscription', systemText: '送一份', meta: {} });
    const entries = [leadA!, leadB!, giftB!, giftA!, direct].reduce(add, []);
    expect(entries).toEqual([
      { notice: leadA, members: [giftA] },
      { notice: leadB, members: [giftB] },
      { notice: direct, members: [] },
    ]);
  });

  it('shows a gifted sub on its own when its community gift never came', () => {
    const [, gift] = notices(1);
    expect([gift!].reduce(add, [])).toEqual([{ notice: gift, members: [] }]);
  });

  it('the OBS and overlay feed shows one notice per batch', () => {
    const options = { ...PRESET_THEMES[0]!.options, maxMessages: 10 };
    const state = createMockGiftBatch(5).reduce<FeedState>(
      (feed, event) => reduceFeed(feed, event, options),
      emptyFeed,
    );
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ kind: 'notice', members: expect.any(Array) });
    expect(state.items[0]!.kind === 'notice' && state.items[0]!.members).toHaveLength(5);
  });
});
