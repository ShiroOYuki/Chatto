import {
  AFTER_SILENCE,
  defaultEventAlertRule,
  type AlertCue,
  type ChatEvent,
  type ChatMessage,
  type ChatThemeOptions,
  type EventAlertSettings,
  type SilenceAlertSettings,
} from '@chatto/core';
import { eventKeyOf, findEvent } from '@chatto/chat-ui/events';
import { isHidden } from '@chatto/chat-ui/feed';

/**
 * Notices the first chat message after a quiet spell. Only plain chat counts:
 * event messages (cheers …), hidden users and command prefixes neither break
 * the silence nor trigger the reminder.
 */
export class SilenceTracker {
  #lastAt: number | null = null;

  /** Starts counting from `now`, e.g. when the channel connects, so the first message can count too. */
  reset(now: number): void {
    this.#lastAt = now;
  }

  /** Records a message and reports whether it broke a quiet spell. */
  observe(message: ChatMessage, now: number, settings: SilenceAlertSettings, display: ChatThemeOptions): boolean {
    if (message.eventType || isHidden(message, display)) return false;
    const last = this.#lastAt;
    this.#lastAt = now;
    return settings.enabled && last !== null && now - last >= settings.thresholdSeconds * 1000;
  }
}

/** A copy of the message marked as having broken a quiet spell (styled by the theme's `attention`). */
export function markAfterSilence(message: ChatMessage): ChatMessage {
  return message.highlights.includes(AFTER_SILENCE)
    ? message
    : { ...message, highlights: [...message.highlights, AFTER_SILENCE] };
}

/**
 * Decides whether a platform event shows on the alert overlay, and how:
 * its rule must be on and its size (bits, viewers …) at least the rule's minimum.
 */
export function alertCue(event: ChatEvent, settings: EventAlertSettings): AlertCue | null {
  const item = event.type === 'message' ? event.message : event.type === 'notice' ? event.notice : null;
  const key = item && eventKeyOf(item);
  if (!item || !key) return null;
  const rule = settings.rules[key] ?? defaultEventAlertRule();
  if (!rule.enabled) return null;
  const amount = findEvent(key)?.amount?.read(item);
  if (rule.minimum > 0 && amount !== undefined && amount < rule.minimum) return null;
  return {
    durationMs: Math.max(1, settings.durationSeconds) * 1000,
    ...(rule.sound.enabled ? { sound: rule.sound } : {}),
  };
}
