/**
 * Where people can support Chatto. The settings page and the title bar read
 * from here; keep README.md and .github/FUNDING.yml in step when this changes.
 */
export interface SupportLink {
  id: 'kofi' | 'ecpay';
  label: string;
  /** Short note on who the option suits. */
  hint: string;
  url: string;
}

export const SUPPORT_LINKS: readonly SupportLink[] = [
  { id: 'kofi', label: 'Ko-fi', hint: '國際付款', url: 'https://ko-fi.com/ciel518' },
  { id: 'ecpay', label: '綠界', hint: '台灣付款', url: 'https://p.ecpay.com.tw/C487EF9' },
];
