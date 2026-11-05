import { BUILTIN_SOUNDS, defaultAlertSettings } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import alertMessages from '../../i18n/messages/alerts';
import {
  IMPORT_SOUND,
  ruleFor,
  soundFromValue,
  soundOptions,
  soundValue,
  withEvents,
  withRedemptions,
  withRule,
  withSilence,
} from './draft';

describe('alert settings drafts', () => {
  it('keeps redemptions out of OBS without touching the other settings', () => {
    const base = defaultAlertSettings();
    expect(base.redemptions.showInObs).toBe(true);
    const next = withRedemptions(base, { showInObs: false });
    expect(next.redemptions.showInObs).toBe(false);
    expect(next.events).toBe(base.events);
    expect(base.redemptions.showInObs).toBe(true);
  });

  it('reads the default rule for events that have none yet and stores edits per event', () => {
    const base = defaultAlertSettings();
    expect(ruleFor(base, 'twitch:raid')).toMatchObject({ enabled: true, sound: { enabled: false } });
    const next = withRule(base, 'twitch:raid', { minimum: 10 });
    expect(next.events.rules['twitch:raid']).toMatchObject({ enabled: true, minimum: 10 });
    expect(base.events.rules).toEqual({});
  });

  it('patches the silence and event sections without touching the other', () => {
    const base = defaultAlertSettings();
    const next = withEvents(withSilence(base, { thresholdSeconds: 90 }), { durationSeconds: 8 });
    expect(next.silence.thresholdSeconds).toBe(90);
    expect(next.events.durationSeconds).toBe(8);
    expect(next.silence.sound).toBe(base.silence.sound);
  });

  const labels = alertMessages['zh-TW'].sound;

  it('offers 泡泡、金幣、鈴聲、雷射 and 自訂', () => {
    const builtin = soundOptions({ kind: 'builtin', id: 'bell' }, labels);
    expect(builtin.map((option) => option.label)).toEqual(['泡泡', '金幣', '鈴聲', '雷射', '自訂…']);
    expect(builtin.at(-1)?.value).toBe(IMPORT_SOUND);

    const file = { kind: 'file' as const, id: 'a.mp3', name: '叮.mp3' };
    const custom = soundOptions(file, labels);
    expect(custom.map((option) => option.value)).toEqual([...BUILTIN_SOUNDS, 'file:a.mp3']);
    expect(custom.at(-1)?.label).toBe('自訂：叮.mp3');
    expect(soundFromValue('bell', file)).toEqual({ kind: 'builtin', id: 'bell' });
    expect(soundFromValue(soundValue(file), file)).toBe(file);
    expect(soundFromValue(IMPORT_SOUND, file)).toBeUndefined();
  });

  it('names the sounds in English too', () => {
    const options = soundOptions({ kind: 'file', id: 'a.mp3', name: 'ding.mp3' }, alertMessages.en.sound);
    expect(options.map((option) => option.label)).toEqual(['Bubble', 'Coin', 'Bell', 'Laser', 'Custom: ding.mp3']);
  });
});
