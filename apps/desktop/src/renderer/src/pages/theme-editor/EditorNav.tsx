import { EVENT_CATALOG } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Select } from '../../components/kit';
import { motion, spring } from '../../components/motion';
import { useLocale, useMessages } from '../../i18n';
import { eventSectionId, type SectionDefinition, type SectionId } from './sections';

type HoverProps = (selector?: string) => { onMouseEnter?: () => void; onMouseLeave?: () => void };

/** Left menu: style sections, then one entry per platform event (styled bases only). */
export function EditorNav({
  sections,
  active,
  draft,
  onSelect,
  hoverProps,
}: {
  sections: SectionDefinition[];
  active: SectionId;
  draft: ChatTheme;
  onSelect: (id: SectionId) => void;
  hoverProps: HoverProps;
}) {
  const m = useMessages().editor;
  const locale = useLocale();
  const eventGroups = draft.base === 'blank' ? [] : EVENT_CATALOG;
  return (
    <nav className="flex flex-col gap-0.5 overflow-y-auto">
      {sections.map((item) => (
        <NavItem
          key={item.id}
          active={active === item.id}
          icon={item.icon}
          label={m.sections[item.id]}
          onClick={() => onSelect(item.id)}
          {...hoverProps(item.selector)}
        />
      ))}
      {eventGroups.map((group) => (
        <div key={group.platform} className="mt-3 flex flex-col gap-0.5">
          <div className="px-3 pb-1 text-xs font-medium text-ink-faint">{m.platformEvents(group.label)}</div>
          {group.events.map((event) => {
            const id = eventSectionId(event.key);
            const own = draft.events[event.key]?.linked === false;
            return (
              <NavItem
                key={event.key}
                active={active === id}
                icon={<Zap />}
                label={event.label[locale]}
                trailing={own ? <span className="size-1.5 rounded-full bg-sakura" aria-label={m.ownStyle} /> : null}
                onClick={() => onSelect(id)}
                {...hoverProps(`[data-event="${event.key}"]`)}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** The same menu as a dropdown, for windows too narrow for the side menu. */
export function EditorNavSelect({
  sections,
  active,
  draft,
  onSelect,
}: {
  sections: SectionDefinition[];
  active: SectionId;
  draft: ChatTheme;
  onSelect: (id: SectionId) => void;
}) {
  const m = useMessages().editor;
  const locale = useLocale();
  const eventGroups = draft.base === 'blank' ? [] : EVENT_CATALOG;
  return (
    <Select<SectionId>
      aria-label={m.sectionPicker}
      value={active}
      onChange={onSelect}
      groups={[
        { options: sections.map((item) => ({ value: item.id, label: m.sections[item.id] })) },
        ...eventGroups.map((group) => ({
          label: m.platformEvents(group.label),
          options: group.events.map((event) => ({ value: eventSectionId(event.key), label: event.label[locale] })),
        })),
      ]}
    />
  );
}

function NavItem({
  active,
  icon,
  label,
  trailing,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex h-9 shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
        active ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {active ? (
        <motion.span
          layoutId="editor-section"
          transition={spring}
          className="absolute inset-0 rounded-xl bg-tile shadow-sm"
        />
      ) : null}
      <span className={`relative [&>svg]:size-4 ${active ? 'text-matcha' : 'text-ink-faint'}`}>{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="relative flex">{trailing}</span> : null}
    </button>
  );
}
