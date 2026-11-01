import { findEvent, type EventDefinition } from '@chatto/chat-ui';
import {
  AtSign,
  Bell,
  BellRing,
  Braces,
  Layers,
  LayoutList,
  MessageSquare,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Type,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type BaseSectionId =
  | 'base'
  | 'text'
  | 'list'
  | 'message'
  | 'author'
  | 'body'
  | 'parts'
  | 'notice'
  | 'roles'
  | 'attention'
  | 'motion'
  | 'behavior'
  | 'css';

/** Platform event pages are `event:<platform>:<eventType>`. */
export type SectionId = BaseSectionId | `event:${string}`;

export interface SectionDefinition {
  id: BaseSectionId;
  label: string;
  icon: ReactNode;
  /** Hidden on the blank base, which has no style parameters. */
  styledOnly?: boolean;
  /**
   * What hovering the menu item outlines in the preview.
   * Sections without one (structure, motion, rules, CSS) have no single target.
   */
  selector?: string;
}

export const SECTIONS: SectionDefinition[] = [
  { id: 'base', label: '基底與結構', icon: <Layers /> },
  { id: 'text', label: '文字', icon: <Type />, styledOnly: true, selector: '.chatto-root' },
  { id: 'list', label: '面板', icon: <LayoutList />, styledOnly: true, selector: '.chatto-list' },
  { id: 'message', label: '訊息', icon: <MessageSquare />, styledOnly: true, selector: '.chatto-message' },
  { id: 'author', label: '名稱', icon: <UserRound />, styledOnly: true, selector: '.chatto-message .chatto-header' },
  { id: 'body', label: '內容', icon: <AtSign />, styledOnly: true, selector: '.chatto-message .chatto-body' },
  {
    id: 'parts',
    label: '細節元件',
    icon: <Shapes />,
    styledOnly: true,
    selector:
      '.chatto-avatar, .chatto-badge, .chatto-time, .chatto-emote, .chatto-mention, .chatto-link, .chatto-reply',
  },
  {
    id: 'notice',
    label: '通用事件訊息',
    icon: <Bell />,
    styledOnly: true,
    selector: '.chatto-notice, .chatto-message[data-event]',
  },
  {
    id: 'roles',
    label: '身分樣式',
    icon: <UsersRound />,
    styledOnly: true,
    selector: '.chatto-message[data-roles], .chatto-message[data-highlight~="first-message"]',
  },
  {
    id: 'attention',
    label: '新留言提醒',
    icon: <BellRing />,
    styledOnly: true,
    selector: '.chatto-message[data-highlight~="after-silence"]',
  },
  { id: 'motion', label: '動畫', icon: <Sparkles />, styledOnly: true },
  { id: 'behavior', label: '顯示規則', icon: <SlidersHorizontal /> },
  { id: 'css', label: '自訂 CSS', icon: <Braces /> },
];

export const eventSectionId = (eventKey: string): SectionId => `event:${eventKey}`;

export interface ResolvedSection {
  /** Sections available for the current base. */
  sections: SectionDefinition[];
  /** The section actually shown; falls back to `base` when the requested one is hidden. */
  active: SectionId;
  /** Set when the active section is a platform event page. */
  event?: EventDefinition;
  label?: string;
}

/** Resolves which section to show, given the requested one and whether the theme is blank. */
export function resolveSection(requested: SectionId, blank: boolean): ResolvedSection {
  const sections = SECTIONS.filter((item) => !(blank && item.styledOnly));
  const event = requested.startsWith('event:') && !blank ? findEvent(requested.slice('event:'.length)) : undefined;
  if (event) return { sections, active: requested, event, label: event.label };
  const base = sections.find((item) => item.id === requested) ?? sections[0]!;
  return { sections, active: base.id, label: base.label };
}
