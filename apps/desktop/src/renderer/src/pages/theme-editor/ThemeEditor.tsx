import type { ChatTheme } from '@chatto/core';
import { ArrowLeft, Check, Download, RotateCcw, Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAppState } from '../../store';
import { useLocale, useMessages } from '../../i18n';
import { runAction } from '../../services/run';
import { themes } from '../../services/themes';
import type { CursorRequest } from '../../components/CssEditor';
import { Button, Tile } from '../../components/kit';
import { PageTransition } from '../../components/motion';
import { appendRule } from '../../lib/cssSelector';
import { exportTheme } from '../themeIO';
import { AttentionPanel } from './panels/AttentionPanel';
import { BehaviorPanel, MotionPanel } from './panels/BehaviorPanels';
import { CssPanel } from './panels/CssPanel';
import { EventPanel, NoticePanel } from './panels/EventPanels';
import { ListPanel, MessagePanel } from './panels/LayoutPanels';
import { AuthorPanel, BodyPanel, PartsPanel } from './panels/MessagePartPanels';
import { RolesPanel } from './panels/RolesPanel';
import { StructurePanel } from './panels/StructurePanel';
import { TextPanel } from './panels/TextPanel';
import { EditorNav, EditorNavSelect } from './EditorNav';
import { PreviewPane } from './PreviewPane';
import { resolveSection, type BaseSectionId, type SectionId } from './sections';
import { usePreviewHighlight } from './usePreviewHighlight';
import { useExternalCss } from './useExternalCss';
import { useThemeDraft } from './useThemeDraft';

export function ThemeEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: ChatTheme;
  onClose: () => void;
  onSaved: (theme: ChatTheme) => void;
}) {
  const { draft, saved, setDraft, set, dirty, saving, justSaved, saveError, save, revert, acceptSavedCss } =
    useThemeDraft(initial, themes.save, onSaved);
  const [section, setSection] = useState<SectionId>('base');
  const [cursorRequest, setCursorRequest] = useState<CursorRequest | null>(null);
  const blank = draft.base === 'blank';
  const resolved = resolveSection(section, blank);
  const hl = usePreviewHighlight(resolved.active === 'css');
  const external = useExternalCss(draft.id, acceptSavedCss);
  const messages = useMessages();
  const m = messages.editor;
  const locale = useLocale();
  const editorLabel = useAppState()?.prefs.editorCommand.trim() ? m.openInEditor : m.openInVSCode;
  const sectionLabel = resolved.event ? resolved.event.label[locale] : m.sections[resolved.active as BaseSectionId];

  /** Inserts an empty rule into the custom CSS and puts the cursor inside it. */
  const insertRule = (selector: string) => {
    const next = appendRule(draft.customCss, selector);
    set('customCss')(next.css);
    setSection('css');
    setCursorRequest({ position: next.cursor, nonce: Date.now() });
  };

  const panel = (id: BaseSectionId): ReactNode => {
    const props = { draft, set };
    switch (id) {
      case 'base':
        return <StructurePanel {...props} setDraft={setDraft} />;
      case 'text':
        return <TextPanel {...props} />;
      case 'list':
        return <ListPanel {...props} />;
      case 'message':
        return <MessagePanel {...props} />;
      case 'author':
        return <AuthorPanel {...props} />;
      case 'body':
        return <BodyPanel {...props} />;
      case 'parts':
        return <PartsPanel {...props} />;
      case 'notice':
        return <NoticePanel draft={draft} setDraft={setDraft} />;
      case 'roles':
        return <RolesPanel draft={draft} setDraft={setDraft} />;
      case 'attention':
        return <AttentionPanel {...props} />;
      case 'motion':
        return <MotionPanel {...props} />;
      case 'behavior':
        return <BehaviorPanel {...props} />;
      case 'css':
        return (
          <CssPanel
            css={draft.customCss}
            blank={blank}
            cursorRequest={cursorRequest}
            external={external}
            editorLabel={editorLabel}
            cssUnsaved={draft.customCss !== saved.customCss}
            onChange={set('customCss')}
            onCursorSelector={hl.setCursorSelector}
            onHoverSelector={hl.setHoverSelector}
            onInsertRule={insertRule}
          />
        );
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft /> {m.back}
        </Button>
        <input
          value={draft.name}
          onChange={(event) => set('name')(event.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none hover:bg-tile-muted focus:bg-tile-muted"
          aria-label={m.themeName}
        />
        {saveError ? (
          <span role="alert" className="text-xs text-danger" title={saveError}>
            {m.saveFailed}
          </span>
        ) : dirty ? (
          <span className="text-xs text-ink-faint">{m.unsaved}</span>
        ) : null}
        <Button variant="ghost" disabled={!dirty} onClick={revert}>
          <RotateCcw /> {messages.common.revert}
        </Button>
        <Button onClick={() => runAction('exportTheme', exportTheme(draft))}>
          <Download /> {messages.common.export}
        </Button>
        <Button variant="primary" disabled={saving || (!dirty && !justSaved)} onClick={() => void save()}>
          {justSaved ? <Check /> : <Save />}
          {justSaved ? messages.common.saved : messages.common.save}
        </Button>
      </header>

      {/* Narrow windows swap the side menu for a dropdown so the panel keeps a usable width. */}
      <div className="grid min-h-0 flex-1 grid-cols-[168px_minmax(0,1fr)_minmax(300px,380px)] gap-3 max-[1180px]:grid-cols-[minmax(0,1fr)_minmax(260px,40%)]">
        <div className="flex min-h-0 flex-col max-[1180px]:hidden">
          <EditorNav
            sections={resolved.sections}
            active={resolved.active}
            draft={draft}
            onSelect={setSection}
            hoverProps={hl.hoverProps}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="hidden max-[1180px]:block">
            <EditorNavSelect
              sections={resolved.sections}
              active={resolved.active}
              draft={draft}
              onSelect={setSection}
            />
          </div>
          <Tile className="min-h-0 flex-1 overflow-y-auto">
            <PageTransition id={resolved.active}>
              <h2 className="mb-2 text-sm font-semibold max-[1180px]:hidden">{sectionLabel}</h2>
              {resolved.event ? (
                <EventPanel draft={draft} setDraft={setDraft} event={resolved.event} />
              ) : (
                panel(resolved.active as BaseSectionId)
              )}
            </PageTransition>
          </Tile>
        </div>

        <PreviewPane theme={draft} highlight={hl} onInsertRule={insertRule} />
      </div>
    </div>
  );
}
