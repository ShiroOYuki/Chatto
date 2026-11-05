import type { ChatTheme } from '@chatto/core';
import { Crosshair, Focus } from 'lucide-react';
import { useState } from 'react';
import { InspectablePreview, type PreviewMode } from '../../components/InspectablePreview';
import { Hint, Segmented, Tile } from '../../components/kit';
import { useMessages } from '../../i18n';
import { BACKDROPS, type Backdrop } from '../../components/ThemePreview';
import { buildSelector } from '../../lib/cssSelector';
import type { SpecimenFocus } from '../../lib/specimenFocus';
import { SelectorBuilder } from './SelectorBuilder';
import type { PreviewHighlight } from './usePreviewHighlight';

const iconToggle = (on: boolean) =>
  `grid size-8 place-items-center rounded-full transition-colors [&>svg]:size-4 ${
    on ? 'bg-matcha-strong text-on-matcha' : 'text-ink-soft hover:bg-tile-muted'
  }`;

/**
 * Right column: preview with mode, focus, inspect and backdrop controls.
 * `focus` is the specimen rows of the section being edited; with "only this section" on,
 * the sample shows just those rows.
 */
export function PreviewPane({
  theme,
  highlight: hl,
  focus,
  onInsertRule,
}: {
  theme: ChatTheme;
  highlight: PreviewHighlight;
  focus?: SpecimenFocus;
  onInsertRule: (selector: string) => void;
}) {
  const [backdrop, setBackdrop] = useState<Backdrop>('game');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('specimen');
  const [focusOn, setFocusOn] = useState(false);
  const { picked } = hl;
  const m = useMessages().editor.preview;
  const specimen = previewMode === 'specimen';
  const focusLabel = focus ? m.focus : m.focusUnavailable;

  return (
    <Tile className="min-h-0 p-3!">
      <div className="mb-2 flex items-center gap-2">
        <Segmented
          size="sm"
          value={previewMode}
          onChange={setPreviewMode}
          options={[
            { value: 'specimen', label: m.sample },
            { value: 'live', label: m.live },
          ]}
        />
        {specimen ? (
          <Hint label={focusLabel}>
            {/* aria-disabled rather than disabled, so the tooltip still explains why. */}
            <button
              type="button"
              aria-label={focusLabel}
              aria-pressed={Boolean(focus) && focusOn}
              aria-disabled={!focus}
              onClick={() => focus && setFocusOn((on) => !on)}
              className={`${iconToggle(Boolean(focus) && focusOn)} aria-disabled:opacity-40`}
            >
              <Focus />
            </button>
          </Hint>
        ) : null}
        <Hint label={m.inspect}>
          <button
            type="button"
            aria-label={m.inspect}
            aria-pressed={hl.inspect}
            onClick={hl.toggleInspect}
            className={iconToggle(hl.inspect)}
          >
            <Crosshair />
          </button>
        </Hint>
        <div className="ml-auto flex gap-1">
          {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-label={m.backdrop(key)}
              onClick={() => setBackdrop(key)}
              className={`size-6 rounded-full border-2 transition ${backdrop === key ? 'border-matcha' : 'border-line'}`}
              style={{ background: BACKDROPS[key] }}
            />
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
        <InspectablePreview
          theme={theme}
          backdrop={backdrop}
          mode={previewMode}
          focus={specimen && focusOn ? focus : undefined}
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
