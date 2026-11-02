import { FONT_STACKS } from '@chatto/chat-ui';
import type { AttentionEffect, EnterAnimation, ExitAnimation, RoleKey } from '@chatto/core';
import type { Messages } from '../../i18n';

/** Choice lists and labels used by the theme editor panels, in the interface language. */

type PanelText = Messages['editorPanels'];

const FONT_KEYS = ['huninn', 'sans', 'serif', 'mono', 'system'] as const;

export const fontOptions = (m: PanelText): { value: string; label: string }[] =>
  FONT_KEYS.map((key) => ({ value: FONT_STACKS[key], label: m.options.fonts[key] }));

const ENTER_ANIMATIONS: EnterAnimation[] = [
  'none',
  'fade',
  'slide-up',
  'slide-left',
  'slide-right',
  'pop',
  'bounce',
  'shake',
  'zoom',
];

export const animationOptions = (m: PanelText): { value: EnterAnimation; label: string }[] =>
  ENTER_ANIMATIONS.map((value) => ({ value, label: m.options.enter[value] }));

const EXIT_ANIMATIONS: ExitAnimation[] = ['none', 'fade', 'slide-up', 'slide-left', 'slide-right', 'pop', 'zoom'];

export const exitAnimationOptions = (m: PanelText): { value: ExitAnimation; label: string }[] =>
  EXIT_ANIMATIONS.map((value) => ({ value, label: m.options.exit[value] }));

const ATTENTION_EFFECTS: AttentionEffect[] = ['none', 'glow', 'pulse', 'shake'];

export const attentionEffectOptions = (m: PanelText): { value: AttentionEffect; label: string }[] =>
  ATTENTION_EFFECTS.map((value) => ({ value, label: m.options.attention[value] }));

export const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map((weight) => ({
  value: String(weight),
  label: String(weight),
}));

/** Display name of a role or highlight kind, shared by the role panel and the selector builder. */
export const roleName = (m: PanelText, key: string): string => m.roleNames[key] ?? key;

/** Roles that can be styled, in priority order (later entries win). */
export const STYLED_ROLES: RoleKey[] = ['viewer', 'broadcaster', 'moderator', 'vip', 'subscriber', 'first-message'];

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
