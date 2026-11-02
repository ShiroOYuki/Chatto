import { ATTRIBUTE_REFERENCE, CLASS_REFERENCE, EVENT_REFERENCE, type SelectorReference } from '@chatto/chat-ui';
import { SquarePen } from 'lucide-react';
import { CssEditor, type CursorRequest } from '../../../components/CssEditor';
import type { ReactNode } from 'react';
import { Button, Hint } from '../../../components/kit';
import { useLocale, useMessages } from '../../../i18n';
import type { ExternalCss } from '../useExternalCss';
import { PanelIntro } from './shared';

const REFERENCE_GROUPS: { key: 'classes' | 'attributes' | 'events'; items: SelectorReference[] }[] = [
  { key: 'classes', items: CLASS_REFERENCE },
  { key: 'attributes', items: ATTRIBUTE_REFERENCE },
  { key: 'events', items: EVENT_REFERENCE },
];

const isAttribute = (item: SelectorReference) => item.selector.startsWith('[');

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** Puts the file name where `{file}` stands in a status text. */
function withFile(text: string, file: ReactNode): ReactNode {
  const [before, after] = text.split('{file}');
  return (
    <>
      {before}
      {file}
      {after}
    </>
  );
}

function ExternalStatus({ external, cssUnsaved }: { external: ExternalCss; cssUnsaved: boolean }) {
  const m = useMessages().editorPanels.css;
  if (cssUnsaved) return <span className="text-xs text-ink-faint">{m.saveFirst}</span>;
  if (external.error) {
    return (
      <span role="alert" className="text-xs text-danger" title={external.error}>
        {m.openFailed}
      </span>
    );
  }
  const { opened } = external;
  if (!opened) return <span className="text-xs text-ink-faint">{m.idle}</span>;
  const file = (
    <code className="font-mono text-ink-soft select-all" title={opened.path}>
      {opened.launched === 'none' ? opened.path : fileName(opened.path)}
    </code>
  );
  const text = { editor: m.openedEditor, system: m.openedSystem, none: m.openedNone }[opened.launched];
  return (
    <span role="status" className="min-w-0 text-xs text-ink-faint">
      {withFile(text, file)}
    </span>
  );
}

export function CssPanel({
  css,
  blank,
  cursorRequest,
  external,
  editorLabel,
  cssUnsaved,
  onChange,
  onCursorSelector,
  onHoverSelector,
  onInsertRule,
}: {
  css: string;
  blank: boolean;
  cursorRequest: CursorRequest | null;
  external: ExternalCss;
  /** "Open in VSCode", or a generic label when the user set another editor. */
  editorLabel: string;
  /** The CSS here has edits not saved yet; the file only ever holds the saved CSS. */
  cssUnsaved: boolean;
  onChange: (css: string) => void;
  onCursorSelector: (selector: string | null) => void;
  onHoverSelector: (selector: string | null) => void;
  onInsertRule: (selector: string) => void;
}) {
  const m = useMessages().editorPanels.css;
  const locale = useLocale();
  return (
    <>
      <PanelIntro>{m.intro(blank)}</PanelIntro>
      <div className="flex items-center gap-3 pb-3">
        <Button
          size="sm"
          className="shrink-0"
          disabled={external.opening || cssUnsaved}
          onClick={() => void external.open()}
        >
          <SquarePen /> {editorLabel}
        </Button>
        <ExternalStatus external={external} cssUnsaved={cssUnsaved} />
      </div>
      <div className="h-[360px]">
        <CssEditor
          value={css}
          onChange={onChange}
          onSelectorChange={onCursorSelector}
          cursorRequest={cursorRequest}
          placeholder={".chatto-message[data-roles~='moderator'] .chatto-author::before {\n  content: '🛡 ';\n}"}
        />
      </div>
      <p className="pt-3 text-xs text-ink-faint">{m.referenceHelp}</p>
      {REFERENCE_GROUPS.map((group) => (
        <div key={group.key} className="pt-2">
          <div className="pb-1 text-[11px] font-medium text-ink-faint">{m.groups[group.key]}</div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              // Attribute conditions apply to messages and notices alike, so outline both.
              const highlight = isAttribute(item)
                ? `.chatto-message${item.selector}, .chatto-notice${item.selector}`
                : item.selector;
              const insert = isAttribute(item) ? `.chatto-message${item.selector}` : item.selector;
              return (
                <Hint key={item.selector} label={m.reference(item.label[locale], item.description[locale])} side="top">
                  <button
                    type="button"
                    onMouseEnter={() => onHoverSelector(highlight)}
                    onMouseLeave={() => onHoverSelector(null)}
                    onFocus={() => onHoverSelector(highlight)}
                    onBlur={() => onHoverSelector(null)}
                    onClick={() => onInsertRule(insert)}
                    className="rounded-md bg-tile-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft transition-colors hover:bg-matcha-soft/50 hover:text-ink"
                  >
                    {item.selector}
                  </button>
                </Hint>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
