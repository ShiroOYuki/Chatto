import { ATTRIBUTE_REFERENCE, CLASS_REFERENCE, EVENT_REFERENCE, type SelectorReference } from '@chatto/chat-ui';
import { SquarePen } from 'lucide-react';
import { CssEditor, type CursorRequest } from '../../../components/CssEditor';
import { Button, Hint } from '../../../components/kit';
import type { ExternalCss } from '../useExternalCss';
import { PanelIntro } from './shared';

const REFERENCE_GROUPS: { label: string; items: SelectorReference[] }[] = [
  { label: '元件', items: CLASS_REFERENCE },
  { label: '條件', items: ATTRIBUTE_REFERENCE },
  { label: '平台事件', items: EVENT_REFERENCE },
];

const isAttribute = (item: SelectorReference) => item.selector.startsWith('[');

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

function ExternalStatus({ external }: { external: ExternalCss }) {
  if (external.error) {
    return (
      <span role="alert" className="text-xs text-danger" title={external.error}>
        無法開啟檔案，請再試一次
      </span>
    );
  }
  const { synced } = external;
  if (!synced) return <span className="text-xs text-ink-faint">在外部編輯器寫 CSS，存檔後會同步回來。</span>;
  const file = (
    <code className="font-mono text-ink-soft select-all" title={synced.path}>
      {synced.launched === 'none' ? synced.path : fileName(synced.path)}
    </code>
  );
  return (
    <span role="status" className="min-w-0 text-xs text-ink-faint">
      {synced.launched === 'editor' ? <>同步中：{file}</> : null}
      {synced.launched === 'system' ? <>找不到編輯器指令，已用預設程式開啟。同步中：{file}</> : null}
      {synced.launched === 'none' ? <>無法開啟編輯器，請手動開啟 {file}，仍會同步。</> : null}
    </span>
  );
}

export function CssPanel({
  css,
  blank,
  cursorRequest,
  external,
  editorLabel,
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
  onChange: (css: string) => void;
  onCursorSelector: (selector: string | null) => void;
  onHoverSelector: (selector: string | null) => void;
  onInsertRule: (selector: string) => void;
}) {
  return (
    <>
      <PanelIntro>
        {blank
          ? '空白基底不會產生任何樣式，畫面完全由這裡的 CSS 決定。'
          : '這裡的 CSS 會套在參數樣式之後，可以覆蓋任何設定。'}
        游標所在規則符合的元素會在預覽中標示出來。
      </PanelIntro>
      <div className="flex items-center gap-3 pb-3">
        <Button size="sm" className="shrink-0" disabled={external.opening} onClick={() => void external.open()}>
          <SquarePen /> {editorLabel}
        </Button>
        <ExternalStatus external={external} />
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
      <p className="pt-3 text-xs text-ink-faint">
        滑過可在預覽中標示，點一下插入一條新規則。也可以開啟預覽的「檢查」直接點選元素。
      </p>
      {REFERENCE_GROUPS.map((group) => (
        <div key={group.label} className="pt-2">
          <div className="pb-1 text-[11px] font-medium text-ink-faint">{group.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              // Attribute conditions apply to messages and notices alike, so outline both.
              const highlight = isAttribute(item)
                ? `.chatto-message${item.selector}, .chatto-notice${item.selector}`
                : item.selector;
              const insert = isAttribute(item) ? `.chatto-message${item.selector}` : item.selector;
              return (
                <Hint key={item.selector} label={`${item.label}：${item.description}`} side="top">
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
