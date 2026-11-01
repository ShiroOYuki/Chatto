import type { ChatTheme } from '@chatto/core';
import { ArrowLeft, Check, Download, RotateCcw, Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAppState } from '../../store';
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
import { EditorNav } from './EditorNav';
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
  const { draft, setDraft, set, dirty, saving, justSaved, saveError, save, revert } = useThemeDraft(
    initial,
    themes.save,
    onSaved,
  );
  const [section, setSection] = useState<SectionId>('base');
  const [cursorRequest, setCursorRequest] = useState<CursorRequest | null>(null);
  const blank = draft.base === 'blank';
  const resolved = resolveSection(section, blank);
  const hl = usePreviewHighlight(resolved.active === 'css');
  const external = useExternalCss(draft.id, draft.customCss, set('customCss'));
  const editorLabel = useAppState()?.prefs.editorCommand.trim() ? '在外部編輯器開啟' : '在 VSCode 開啟';

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
          <ArrowLeft /> 主題
        </Button>
        <input
          value={draft.name}
          onChange={(event) => set('name')(event.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none hover:bg-tile-muted focus:bg-tile-muted"
          aria-label="主題名稱"
        />
        {saveError ? (
          <span role="alert" className="text-xs text-danger" title={saveError}>
            儲存失敗，請再試一次
          </span>
        ) : dirty ? (
          <span className="text-xs text-ink-faint">尚未儲存</span>
        ) : null}
        <Button variant="ghost" disabled={!dirty} onClick={revert}>
          <RotateCcw /> 復原
        </Button>
        <Button onClick={() => exportTheme(draft)}>
          <Download /> 匯出
        </Button>
        <Button variant="primary" disabled={saving || (!dirty && !justSaved)} onClick={() => void save()}>
          {justSaved ? <Check /> : <Save />}
          {justSaved ? '已儲存' : '儲存'}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[168px_minmax(0,1fr)_minmax(300px,380px)] gap-3">
        <EditorNav
          sections={resolved.sections}
          active={resolved.active}
          draft={draft}
          onSelect={setSection}
          hoverProps={hl.hoverProps}
        />

        <Tile className="min-h-0 overflow-y-auto">
          <PageTransition id={resolved.active}>
            <h2 className="mb-2 text-sm font-semibold">{resolved.label}</h2>
            {resolved.event ? (
              <EventPanel draft={draft} setDraft={setDraft} event={resolved.event} />
            ) : (
              panel(resolved.active as BaseSectionId)
            )}
          </PageTransition>
        </Tile>

        <PreviewPane theme={draft} highlight={hl} onInsertRule={insertRule} />
      </div>
    </div>
  );
}
