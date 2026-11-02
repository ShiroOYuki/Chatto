import type { Locale } from '@chatto/core';

/**
 * Declares one namespace of interface text in every language (control panel and main process). The Traditional
 * Chinese entry sets the shape; every other language must match it exactly
 * (same keys, same function signatures), so a missing translation fails to
 * compile instead of showing up blank.
 *
 * Plain strings for fixed text; functions for text with values in it.
 */
export function defineMessages<T>(messages: { 'zh-TW': T } & { [L in Exclude<Locale, 'zh-TW'>]: NoInfer<T> }) {
  return messages as Record<Locale, T>;
}
