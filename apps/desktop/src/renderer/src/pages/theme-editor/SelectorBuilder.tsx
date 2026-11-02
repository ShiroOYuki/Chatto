import { findEvent } from '@chatto/chat-ui';
import type { Locale } from '@chatto/core';
import { Braces, X } from 'lucide-react';
import { describeInspected } from '../../components/InspectablePreview';
import { Button } from '../../components/kit';
import { motion, spring } from '../../components/motion';
import { useLocale, useMessages, type Messages } from '../../i18n';
import { buildSelector, type InspectedElement, type SelectorScope } from '../../lib/cssSelector';
import { roleName } from './options';

function scopeLabel(scope: SelectorScope, info: InspectedElement, messages: Messages, locale: Locale): string {
  const m = messages.editor.selector;
  const names = messages.editorPanels;
  switch (scope.kind) {
    case 'all':
      return info.part === 'chatto-root' || info.part === 'chatto-list' ? m.wholeChat : m.all;
    case 'role':
      return m.role(roleName(names, scope.role));
    case 'highlight':
      return roleName(names, scope.highlight);
    case 'user':
      return m.user(scope.user);
    case 'event':
      return m.event(findEvent(scope.event)?.label[locale] ?? scope.event);
    case 'platform':
      return m.platform(scope.platform);
    case 'badge':
      return m.badge(scope.badge);
  }
}

/** Popover over the preview: pick how widely a picked part's rule applies. */
export function SelectorBuilder({
  info,
  scopes,
  selected,
  onSelect,
  onHover,
  onCancel,
  onInsert,
}: {
  info: InspectedElement;
  scopes: SelectorScope[];
  selected: number;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  onCancel: () => void;
  onInsert: () => void;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const m = messages.editor.selector;
  const { title } = describeInspected(info, messages, locale);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="absolute inset-x-2 bottom-2 z-20 rounded-2xl border border-line bg-tile p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{title}</span>
        <button
          type="button"
          aria-label={messages.common.close}
          onClick={onCancel}
          className="grid size-6 place-items-center rounded-full text-ink-faint hover:bg-tile-muted [&>svg]:size-3.5"
        >
          <X />
        </button>
      </div>
      <div className="text-[11px] text-ink-faint">{m.scope}</div>
      <div className="mt-1 flex max-h-44 flex-col gap-0.5 overflow-y-auto" onMouseLeave={() => onHover(null)}>
        {scopes.map((scope, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            onMouseEnter={() => onHover(index)}
            className={`rounded-lg px-2 py-1 text-left transition-colors ${
              index === selected ? 'bg-matcha-soft/50' : 'hover:bg-tile-muted'
            }`}
          >
            <div className="text-xs">{scopeLabel(scope, info, messages, locale)}</div>
            <div className="truncate font-mono text-[10px] text-ink-faint">{buildSelector(info, scope)}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {messages.common.cancel}
        </Button>
        <Button size="sm" variant="primary" onClick={onInsert}>
          <Braces /> {m.insert}
        </Button>
      </div>
    </motion.div>
  );
}
