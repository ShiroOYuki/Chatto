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
    expect(ruleFor(base, 'twitch:raid').enabled).toBe(true);
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

  it('lists built-in sounds, the chosen file and a file picker', () => {
    const file = { kind: 'file' as const, id: 'a.mp3', name: '叮.mp3' };
    const values = soundOptions(file).map((option) => option.value);
    expect(values).toEqual([...BUILTIN_SOUNDS, 'file:a.mp3', IMPORT_SOUND]);
    expect(soundOptions({ kind: 'builtin', id: 'bell' }).some((option) => option.value.startsWith('file:'))).toBe(
      false,
    );
    expect(soundFromValue('bell', file)).toEqual({ kind: 'builtin', id: 'bell' });
    expect(soundFromValue(soundValue(file), file)).toBe(file);
    expect(soundFromValue(IMPORT_SOUND, file)).toBeUndefined();
  });
});
