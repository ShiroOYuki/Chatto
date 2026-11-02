import { describe, expect, it } from 'vitest';
import { chatLocaleOf, isLocale, localeFromTag } from './i18n';

describe('locales', () => {
  it('picks a supported language from an OS language tag', () => {
    expect(localeFromTag('zh-TW')).toBe('zh-TW');
    expect(localeFromTag('zh-Hant-HK')).toBe('zh-TW');
    expect(localeFromTag('en-US')).toBe('en');
    expect(localeFromTag('ja')).toBe('en');
    expect(localeFromTag(undefined)).toBe('zh-TW');
  });

  it('follows the interface language unless the chat language is fixed', () => {
    expect(chatLocaleOf('auto', 'en')).toBe('en');
    expect(chatLocaleOf('zh-TW', 'en')).toBe('zh-TW');
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});
