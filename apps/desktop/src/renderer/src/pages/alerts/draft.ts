import { SOUND_LABELS } from '@chatto/chat-ui';
import {
  BUILTIN_SOUNDS,
  defaultEventAlertRule,
  type AlertSettings,
  type EventAlertRule,
  type EventAlertSettings,
  type SilenceAlertSettings,
  type SoundRef,
} from '@chatto/core';

/** Pure updates of alert settings for the 提醒 page; main clamps values when saving. */

export function ruleFor(settings: AlertSettings, key: string): EventAlertRule {
  return settings.events.rules[key] ?? defaultEventAlertRule();
}

export function withRule(settings: AlertSettings, key: string, patch: Partial<EventAlertRule>): AlertSettings {
  const rules = { ...settings.events.rules, [key]: { ...ruleFor(settings, key), ...patch } };
  return { ...settings, events: { ...settings.events, rules } };
}

export function withSilence(settings: AlertSettings, patch: Partial<SilenceAlertSettings>): AlertSettings {
  return { ...settings, silence: { ...settings.silence, ...patch } };
}

export function withEvents(settings: AlertSettings, patch: Partial<Omit<EventAlertSettings, 'rules'>>): AlertSettings {
  return { ...settings, events: { ...settings.events, ...patch } };
}

/** Value of the 自訂 entry before a file is chosen: picking it opens the file picker. */
export const IMPORT_SOUND = 'import';

/** Menu value for a sound: the built-in id, or `file:<id>`. */
export const soundValue = (ref: SoundRef) => (ref.kind === 'builtin' ? ref.id : `file:${ref.id}`);

/** Sound menu: the built-in sounds, then 自訂 (the chosen file, or a file picker when there is none). */
export function soundOptions(current: SoundRef): { value: string; label: string }[] {
  return [
    ...BUILTIN_SOUNDS.map((id) => ({ value: id as string, label: SOUND_LABELS[id] })),
    current.kind === 'file'
      ? { value: soundValue(current), label: `自訂：${current.name}` }
      : { value: IMPORT_SOUND, label: '自訂…' },
  ];
}

/** The sound a menu value stands for; undefined for "pick a file". */
export function soundFromValue(value: string, current: SoundRef): SoundRef | undefined {
  if (value === IMPORT_SOUND) return undefined;
  const builtin = BUILTIN_SOUNDS.find((id) => id === value);
  return builtin ? { kind: 'builtin', id: builtin } : current;
}
