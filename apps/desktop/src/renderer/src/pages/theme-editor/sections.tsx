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
  Wand,
  Type,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { SpecimenFocus } from '../../lib/specimenFocus';

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
  /** Also the key of the section's label in `messages.editor.sections`. */
  id: BaseSectionId;
  icon: ReactNode;
  /** Hidden on the blank base, which has no style parameters. */
  styledOnly?: boolean;
  /**
   * What hovering the menu item outlines in the preview.
   * Sections without one (structure, motion, rules, CSS) have no single target.
   */
  selector?: string;
  /** Specimen rows the preview keeps when it shows only this section; all rows when unset. */
  focus?: SpecimenFocus;
}

export const SECTIONS: SectionDefinition[] = [
  { id: 'base', icon: <Layers /> },
  { id: 'text', icon: <Type />, styledOnly: true, selector: '.chatto-root' },
  { id: 'list', icon: <LayoutList />, styledOnly: true, selector: '.chatto-list' },
  { id: 'message', icon: <MessageSquare />, styledOnly: true, selector: '.chatto-message', focus: 'messages' },
  {
    id: 'author',
    icon: <UserRound />,
    styledOnly: true,
    selector: '.chatto-message .chatto-header',
    focus: 'messages',
  },
  { id: 'body', icon: <AtSign />, styledOnly: true, selector: '.chatto-message .chatto-body', focus: 'messages' },
  {
    id: 'parts',
    icon: <Shapes />,
    styledOnly: true,
    selector:
      '.chatto-avatar, .chatto-badge, .chatto-time, .chatto-emote, .chatto-mention, .chatto-link, .chatto-reply',
    focus: 'messages',
  },
  {
    id: 'notice',
    icon: <Bell />,
    styledOnly: true,
    selector: '.chatto-notice, .chatto-message[data-event]',
    focus: 'events',
  },
  {
    id: 'roles',
    icon: <UsersRound />,
    styledOnly: true,
    selector: '.chatto-message[data-roles], .chatto-message[data-highlight~="first-message"]',
    focus: 'messages',
  },
  {
    id: 'attention',
    icon: <BellRing />,
    styledOnly: true,
    selector: '.chatto-message[data-highlight~="after-silence"]',
    focus: 'attention',
  },
  { id: 'motion', icon: <Wand />, styledOnly: true },
  { id: 'behavior', icon: <SlidersHorizontal /> },
  { id: 'css', icon: <Braces /> },
];

export const eventSectionId = (eventKey: string): SectionId => `event:${eventKey}`;

export interface ResolvedSection {
  /** Sections available for the current base. */
  sections: SectionDefinition[];
  /** The section actually shown; falls back to `base` when the requested one is hidden. */
  active: SectionId;
  /** Set when the active section is a platform event page. */
  event?: EventDefinition;
  /** Specimen rows that belong to the active section, if it has its own. */
  focus?: SpecimenFocus;
}

/** Resolves which section to show, given the requested one and whether the theme is blank. */
export function resolveSection(requested: SectionId, blank: boolean): ResolvedSection {
  const sections = SECTIONS.filter((item) => !(blank && item.styledOnly));
  const event = requested.startsWith('event:') && !blank ? findEvent(requested.slice('event:'.length)) : undefined;
  if (event) return { sections, active: requested, event, focus: `event:${event.key}` };
  const base = sections.find((item) => item.id === requested) ?? sections[0]!;
  return { sections, active: base.id, focus: base.focus };
}
