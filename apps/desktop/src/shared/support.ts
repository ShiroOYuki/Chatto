/**
 * Where people can support Chatto. The settings page and the title bar read
 * from here; keep README.md, README.zh-TW.md and .github/FUNDING.yml in step when this changes.
 */
import type { Localized } from '@chatto/core';

export interface SupportLink {
  id: 'kofi' | 'ecpay';
  label: Localized;
  /** Short note on who the option suits. */
  hint: Localized;
  url: string;
}

export const SUPPORT_LINKS: readonly SupportLink[] = [
  {
    id: 'kofi',
    label: { 'zh-TW': 'Ko-fi', en: 'Ko-fi' },
    hint: { 'zh-TW': '國際付款', en: 'Pay from anywhere' },
    url: 'https://ko-fi.com/ciel518',
  },
  {
    id: 'ecpay',
    label: { 'zh-TW': '綠界', en: 'ECPay' },
    hint: { 'zh-TW': '台灣付款', en: 'Pay from Taiwan' },
    url: 'https://p.ecpay.com.tw/C487EF9',
  },
];
