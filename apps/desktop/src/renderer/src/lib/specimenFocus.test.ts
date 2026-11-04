import { createSpecimenEvents, EVENT_CATALOG, eventKeyOf } from '@chatto/chat-ui';
import { AFTER_SILENCE, type ChatEvent } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { matchesFocus, type SpecimenFocus } from './specimenFocus';

const specimen = createSpecimenEvents();
const keep = (focus: SpecimenFocus) => specimen.filter((event) => matchesFocus(event, focus));
const keyOf = (event: ChatEvent) =>
  event.type === 'message' ? eventKeyOf(event.message) : event.type === 'notice' ? eventKeyOf(event.notice) : undefined;

describe('matchesFocus', () => {
  it('keeps only plain chat messages for message sections', () => {
    const rows = keep('messages');
    expect(rows.length).toBeGreaterThan(0);
    for (const event of rows) {
      expect(event.type).toBe('message');
      expect(keyOf(event)).toBeUndefined();
    }
  });

  it('keeps every platform event for the generic event section', () => {
    const rows = keep('events');
    expect(rows.length).toBe(EVENT_CATALOG.flatMap((group) => group.events).length);
    for (const event of rows) expect(keyOf(event)).toBeDefined();
  });

  it('keeps only messages after a quiet spell for the reminder section', () => {
    const rows = keep('attention');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type === 'message' && rows[0]!.message.highlights).toContain(AFTER_SILENCE);
  });

  it('keeps exactly the matching event for each event page', () => {
    for (const event of EVENT_CATALOG.flatMap((group) => group.events)) {
      const rows = keep(`event:${event.key}`);
      expect(rows.length, event.key).toBeGreaterThan(0);
      for (const row of rows) expect(keyOf(row)).toBe(event.key);
    }
  });

  it('skips events that are not rows', () => {
    const deleted: ChatEvent = { type: 'chat-cleared', platform: 'twitch', channelId: '1' };
    for (const focus of ['messages', 'events', 'attention', 'event:twitch:cheer'] as const) {
      expect(matchesFocus(deleted, focus)).toBe(false);
    }
  });
});
