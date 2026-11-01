import { BUILTIN_SOUNDS, defaultAlertSettings } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import {
  IMPORT_SOUND,
  ruleFor,
  soundFromValue,
  soundOptions,
  soundValue,
  withEvents,
  withRule,
  withSilence,
} from './draft';

describe('alert settings drafts', () => {
  it('reads the default rule for events that have none yet and stores edits per event', () => {
    const base = defaultAlertSettings();
    expect(ruleFor(base, 'twitch:raid').enabled).toBe(false);
    const next = withRule(base, 'twitch:raid', { minimum: 10 });
    expect(next.events.rules['twitch:raid']).toMatchObject({ enabled: false, minimum: 10 });
    expect(base.events.rules).toEqual({});
  });

  it('patches the silence and event sections without touching the other', () => {
    const base = defaultAlertSettings();
    const next = withEvents(withSilence(base, { thresholdSeconds: 90 }), { durationSeconds: 8 });
    expect(next.silence.thresholdSeconds).toBe(90);
    expect(next.events.durationSeconds).toBe(8);
    expect(next.silence.sound).toBe(base.silence.sound);
  });

  it('offers 泡泡、金幣、鈴聲、雷射 and 自訂', () => {
    const builtin = soundOptions({ kind: 'builtin', id: 'bell' });
    expect(builtin.map((option) => option.label)).toEqual(['泡泡', '金幣', '鈴聲', '雷射', '自訂…']);
    expect(builtin.at(-1)?.value).toBe(IMPORT_SOUND);

    const file = { kind: 'file' as const, id: 'a.mp3', name: '叮.mp3' };
    const custom = soundOptions(file);
    expect(custom.map((option) => option.value)).toEqual([...BUILTIN_SOUNDS, 'file:a.mp3']);
    expect(custom.at(-1)?.label).toBe('自訂：叮.mp3');
    expect(soundFromValue('bell', file)).toEqual({ kind: 'builtin', id: 'bell' });
    expect(soundFromValue(soundValue(file), file)).toBe(file);
    expect(soundFromValue(IMPORT_SOUND, file)).toBeUndefined();
  });
});
