import { EVENT_CATALOG } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { Zap } from 'lucide-react';
import { Select, SideNavItem } from '../../components/kit';
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
        <SideNavItem
          group="editor-section"
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
              <SideNavItem
                group="editor-section"
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
