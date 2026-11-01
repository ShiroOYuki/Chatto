import { defaultAlertSettings, type ChatEvent, type ChatMessage, type EventAlertSettings } from '@chatto/core';
import { mockMessage, MOCK_USERS, sampleEvent } from '@chatto/chat-ui';
import { describe, expect, it } from 'vitest';
import { alertCue, markAfterSilence, SilenceTracker } from './alerts';

const display = { messageLifetime: 0, maxMessages: 50, hiddenUsers: ['nightbot'], hiddenPrefixes: ['!'] };
const silence = { ...defaultAlertSettings().silence, thresholdSeconds: 60 };
const say = (text: string, user = MOCK_USERS[1]!): ChatMessage => mockMessage(user, [{ type: 'text', text }]);

describe('SilenceTracker', () => {
  it('flags the first message after the threshold, counting from when the channel connected', () => {
    const tracker = new SilenceTracker();
    tracker.reset(0);
    expect(tracker.observe(say('hi'), 59_000, silence, display)).toBe(false);
    expect(tracker.observe(say('again'), 100_000, silence, display)).toBe(false);
    expect(tracker.observe(say('anyone?'), 160_000, silence, display)).toBe(true);
  });

  it('does not flag before it knows when chat started', () => {
    expect(new SilenceTracker().observe(say('hi'), 999_000, silence, display)).toBe(false);
  });

  it('ignores bots, commands and event messages entirely', () => {
    const tracker = new SilenceTracker();
    tracker.reset(0);
    const bot = { ...MOCK_USERS[1]!, login: 'nightbot' };
    expect(tracker.observe(say('timer', bot), 70_000, silence, display)).toBe(false);
    expect(tracker.observe(say('!uptime'), 80_000, silence, display)).toBe(false);
    const cheer = sampleEvent('twitch:cheer') as Extract<ChatEvent, { type: 'message' }>;
    expect(tracker.observe(cheer.message, 90_000, silence, display)).toBe(false);
    // None of those reset the quiet spell.
    expect(tracker.observe(say('hello'), 95_000, silence, display)).toBe(true);
  });

  it('keeps tracking but stays quiet while disabled', () => {
    const tracker = new SilenceTracker();
    tracker.reset(0);
    expect(tracker.observe(say('hi'), 120_000, { ...silence, enabled: false }, display)).toBe(false);
  });

  it('marks a copy of the message once', () => {
    const message = say('hi');
    const marked = markAfterSilence(message);
    expect(marked.highlights).toContain('after-silence');
    expect(message.highlights).not.toContain('after-silence');
    expect(markAfterSilence(marked)).toBe(marked);
  });
});

describe('alertCue', () => {
  const settings = (patch: Partial<EventAlertSettings> = {}): EventAlertSettings => ({
    ...defaultAlertSettings().events,
    ...patch,
  });

  it('alerts platform events with the default rule', () => {
    const cue = alertCue(sampleEvent('twitch:sub'), settings({ durationSeconds: 4 }));
    expect(cue).toMatchObject({ durationMs: 4000, sound: { enabled: true } });
  });

  it('never alerts plain chat or moderation events', () => {
    expect(alertCue({ type: 'message', message: say('hi') }, settings())).toBeNull();
    expect(alertCue({ type: 'chat-cleared', platform: 'twitch', channelId: '1' }, settings())).toBeNull();
  });

  it('follows the per-event switch, minimum and sound', () => {
    const rule = { enabled: true, minimum: 0, sound: { ...defaultAlertSettings().silence.sound, enabled: false } };
    expect(
      alertCue(sampleEvent('twitch:raid'), settings({ rules: { 'any:raid': { ...rule, enabled: false } } })),
    ).toBeNull();
    // The raid sample brings 42 viewers.
    expect(
      alertCue(sampleEvent('twitch:raid'), settings({ rules: { 'any:raid': { ...rule, minimum: 50 } } })),
    ).toBeNull();
    const cue = alertCue(sampleEvent('twitch:raid'), settings({ rules: { 'any:raid': { ...rule, minimum: 40 } } }));
    expect(cue).not.toBeNull();
    expect(cue?.sound).toBeUndefined();
  });

  it('applies a category rule to every event in it', () => {
    const off = { enabled: false, minimum: 0, sound: defaultAlertSettings().silence.sound };
    const gifts = settings({ rules: { 'any:gift': off } });
    expect(alertCue(sampleEvent('twitch:sub-gift'), gifts)).toBeNull();
    expect(alertCue(sampleEvent('twitch:community-gift'), gifts)).toBeNull();
    expect(alertCue(sampleEvent('twitch:sub'), gifts)).not.toBeNull();
    // Platform-only events keep their own key.
    expect(alertCue(sampleEvent('twitch:highlighted'), settings({ rules: { 'twitch:highlighted': off } }))).toBeNull();
  });

  it('ignores the minimum for events without a size', () => {
    const rule = { enabled: true, minimum: 10, sound: defaultAlertSettings().silence.sound };
    expect(alertCue(sampleEvent('twitch:sub'), settings({ rules: { 'any:sub': rule } }))).not.toBeNull();
  });
});
