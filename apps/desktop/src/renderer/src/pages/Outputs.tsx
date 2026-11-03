import type { ViewerTarget } from '@chatto/core';
import { AppWindow, Info, Move, RotateCcw, Tv } from 'lucide-react';
import type { AppState } from '../../../shared/ipc';
import { useMessages, useThemeName } from '../i18n';
import { overlay } from '../services/overlay';
import { themes } from '../services/themes';
import { Stagger } from '../components/motion';
import { LiveThemePreview } from '../components/ThemePreview';
import { Badge, Button, CopyField, Field, Hint, PageHeader, Select, Tile, Toggle } from '../components/kit';

function ThemeSelect({ state, target }: { state: AppState; target: ViewerTarget }) {
  const m = useMessages().outputs;
  const themeName = useThemeName();
  return (
    <Field label={m.theme}>
      <Select
        value={state.selectedThemes[target]}
        options={state.themes.map((theme) => ({ value: theme.id, label: themeName(theme) }))}
        onChange={(id) => themes.select(target, id)}
      />
    </Field>
  );
}

function themeOf(state: AppState, target: ViewerTarget) {
  return state.themes.find((theme) => theme.id === state.selectedThemes[target]) ?? state.themes[0]!;
}

export function OutputsPage({ state }: { state: AppState }) {
  const m = useMessages().outputs;
  const { enabled, editing } = state.overlay;

  return (
    <div>
      <PageHeader title={m.title} description={m.description} />

      <Stagger className="grid grid-cols-2 gap-3">
        <Tile
          title={m.desktopOverlay}
          icon={<AppWindow />}
          action={<Toggle checked={enabled} label={m.desktopOverlay} onChange={(v) => overlay.setEnabled(v)} />}
        >
          <p className="text-sm text-ink-soft">{m.overlayIntro}</p>
          <div className="my-4 h-64 overflow-hidden rounded-xl">
            <LiveThemePreview theme={themeOf(state, 'overlay')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ThemeSelect state={state} target="overlay" />
            <Field label={m.positionAndSize}>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={editing ? 'primary' : 'secondary'}
                  disabled={!enabled}
                  onClick={() => overlay.setEditing(!editing)}
                >
                  <Move /> {editing ? m.finishAdjusting : m.adjust}
                </Button>
                <Hint label={m.resetPosition}>
                  <Button
                    variant="ghost"
                    disabled={!enabled}
                    aria-label={m.resetPosition}
                    onClick={() => overlay.resetBounds()}
                  >
                    <RotateCcw />
                  </Button>
                </Hint>
              </div>
            </Field>
          </div>
          {editing ? (
            <p className="mt-3 rounded-xl bg-matcha-soft/40 px-3 py-2 text-xs text-matcha-strong">{m.adjustingHint}</p>
          ) : null}
          <p className="mt-3 flex gap-2 text-xs text-ink-faint">
            <Info className="size-4 shrink-0" />
            {m.borderlessHint}
          </p>
        </Tile>

        <Tile title={m.obsSource} icon={<Tv />} action={<Badge tone="matcha">{m.autoTransparent}</Badge>}>
          <p className="text-sm text-ink-soft">{m.obsIntro}</p>
          <div className="my-4 h-64 overflow-hidden rounded-xl">
            <LiveThemePreview theme={themeOf(state, 'embed')} backdrop="checker" />
          </div>
          <ThemeSelect state={state} target="embed" />
          <div className="mt-3">
            <Field label={m.sourceUrl}>
              <CopyField label={m.obsSource} value={state.server.embedUrl} />
            </Field>
          </div>
          <ol className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
            {m.obsSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-matcha-soft/60 text-[11px] font-semibold text-matcha-strong">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Tile>
      </Stagger>
    </div>
  );
}
