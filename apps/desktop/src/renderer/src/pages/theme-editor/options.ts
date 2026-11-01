import { FONT_STACKS } from '@chatto/chat-ui';
import type { AttentionEffect, EnterAnimation, ExitAnimation, RoleKey } from '@chatto/core';

/** Choice lists and labels used by the theme editor panels. */

export const FONTS = [
  { value: FONT_STACKS.huninn, label: '粉圓（jf open Huninn）' },
  { value: FONT_STACKS.sans, label: '思源黑體（Noto Sans TC）' },
  { value: FONT_STACKS.serif, label: '思源宋體（Noto Serif TC）' },
  { value: FONT_STACKS.mono, label: '等寬（JetBrains Mono）' },
  { value: FONT_STACKS.system, label: '系統字型' },
];

export const ANIMATIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'fade', label: '淡入' },
  { value: 'slide-up', label: '向上滑入' },
  { value: 'slide-left', label: '從左滑入' },
  { value: 'slide-right', label: '從右滑入' },
  { value: 'pop', label: '彈出' },
  { value: 'bounce', label: '彈跳' },
  { value: 'shake', label: '搖晃' },
  { value: 'zoom', label: '放大淡入' },
];

export const EXIT_ANIMATIONS: { value: ExitAnimation; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'fade', label: '淡出' },
  { value: 'slide-up', label: '向上滑出' },
  { value: 'slide-left', label: '向左滑出' },
  { value: 'slide-right', label: '向右滑出' },
  { value: 'pop', label: '縮小' },
  { value: 'zoom', label: '放大淡出' },
];

export const ATTENTION_EFFECTS: { value: AttentionEffect; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'glow', label: '發光' },
  { value: 'pulse', label: '脈動' },
  { value: 'shake', label: '搖晃' },
];

export const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map((weight) => ({
  value: String(weight),
  label: String(weight),
}));

/** Display names for roles and highlight kinds, shared by the role panel and the selector builder. */
export const ROLE_NAMES: Record<string, string> = {
  viewer: '一般觀眾',
  broadcaster: '實況主',
  moderator: '管理員',
  vip: 'VIP',
  subscriber: '訂閱者',
  founder: '創始訂閱者',
  'first-message': '首次發言',
  highlighted: '點數強調訊息',
};

/** Roles that can be styled, in priority order (later entries win). */
const STYLED_ROLES: RoleKey[] = ['viewer', 'broadcaster', 'moderator', 'vip', 'subscriber', 'first-message'];

export const ROLE_LABELS: { key: RoleKey; label: string }[] = STYLED_ROLES.map((key) => ({
  key,
  label: ROLE_NAMES[key] ?? key,
}));

export const BOT_SUGGESTIONS = [
  'nightbot',
  'streamelements',
  'moobot',
  'fossabot',
  'wizebot',
  'streamlabs',
  'soundalerts',
];
export const PREFIX_SUGGESTIONS = ['!', '?', '~', '$'];
