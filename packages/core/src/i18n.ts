/**
 * Languages Chatto speaks. The control panel follows the interface language
 * (`prefs.locale`); chat outputs (overlay, OBS, alerts) follow the chat
 * language, which defaults to the interface language.
 */
export const LOCALES = ['zh-TW', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh-TW';

/** Names of each language in itself, for language pickers. */
export const LOCALE_NAMES: Record<Locale, string> = { 'zh-TW': '繁體中文', en: 'English' };

export const isLocale = (value: unknown): value is Locale => (LOCALES as readonly unknown[]).includes(value);

/** A language for an OS or browser language tag such as `zh-Hant-TW`, `zh-HK` or `en-US`. */
export function localeFromTag(tag: string | undefined): Locale {
  const lower = (tag ?? '').toLowerCase();
  if (lower.startsWith('zh')) return 'zh-TW';
  return lower ? 'en' : DEFAULT_LOCALE;
}

/** Text in every supported language. */
export type Localized<T = string> = Record<Locale, T>;

/** The chat language setting: follow the interface, or a fixed language. */
export type ChatLocalePref = 'auto' | Locale;

export const chatLocaleOf = (pref: ChatLocalePref, interfaceLocale: Locale): Locale =>
  pref === 'auto' ? interfaceLocale : pref;
