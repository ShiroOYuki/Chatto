import { DEFAULT_LOCALE, isLocale, type Locale } from '@chatto/core';

/**
 * Language of event texts until the desktop app says otherwise. `?lang=en`
 * picks one for standalone previews (`?mock=1`, `?specimen`).
 */
export function initialLocale(params: URLSearchParams): Locale {
  const lang = params.get('lang');
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}
