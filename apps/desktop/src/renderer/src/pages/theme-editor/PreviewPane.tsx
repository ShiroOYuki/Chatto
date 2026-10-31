import type { ChatTheme } from '@chatto/core';
import { Crosshair } from 'lucide-react';
import { useState } from 'react';
import { InspectablePreview, type PreviewMode } from '../../components/InspectablePreview';
import { Hint, Segmented, Tile } from '../../components/kit';
import { BACKDROPS, type Backdrop } from '../../components/ThemePreview';
import { buildSelector } from '../../lib/cssSelector';
import { SelectorBuilder } from './SelectorBuilder';
import type { PreviewHighlight } from './usePreviewHighlight';

/** Right column: preview with mode, inspect and backdrop controls. */
export function PreviewPane({
  theme,
  highlight: hl,
  onInsertRule,
}: {
  theme: ChatTheme;
  highlight: PreviewHighlight;
  onInsertRule: (selector: string) => void;
}) {
  const [backdrop, setBackdrop] = useState<Backdrop>('game');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('specimen');
  const { picked } = hl;

  return (
    <Tile className="min-h-0 p-3!">
      <div className="mb-2 flex items-center gap-2">
        <Segmented
          size="sm"
          value={previewMode}
          onChange={setPreviewMode}
          options={[
            { value: 'specimen', label: '範例' },
            { value: 'live', label: '即時' },
          ]}
        />
        <Hint label="檢查：滑過預覽顯示 class，點一下產生選擇器">
          <button
            type="button"
            aria-pressed={hl.inspect}
            onClick={hl.toggleInspect}
            className={`grid size-8 place-items-center rounded-full transition-colors [&>svg]:size-4 ${
              hl.inspect ? 'bg-matcha-strong text-on-matcha' : 'text-ink-soft hover:bg-tile-muted'
            }`}
          >
            <Crosshair />
          </button>
        </Hint>
        <div className="ml-auto flex gap-1">
          {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-label={`預覽背景 ${key}`}
              onClick={() => setBackdrop(key)}
              className={`size-6 rounded-full border-2 transition ${backdrop === key ? 'border-matcha' : 'border-line'}`}
              style={{ background: BACKDROPS[key] }}
            />
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        <InspectablePreview
          theme={theme}
          backdrop={backdrop}
          mode={previewMode}
          inspect={hl.inspect && !picked}
          highlight={hl.highlight}
          onPick={hl.pick}
        />
        {picked ? (
          <SelectorBuilder
            info={picked}
            scopes={hl.pickedScopes}
            selected={hl.pickedScope}
            onSelect={hl.selectScope}
            onHover={(index) =>
              hl.setHoverSelector(index === null ? null : buildSelector(picked, hl.pickedScopes[index]!))
            }
            onCancel={hl.clearPick}
            onInsert={() => {
              if (hl.pickedSelector) onInsertRule(hl.pickedSelector);
              hl.clearPick();
            }}
          />
        ) : null}
      </div>
    </Tile>
  );
}
