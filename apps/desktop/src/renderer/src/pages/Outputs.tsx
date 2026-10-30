import type { ViewerTarget } from '@chatto/core';
import { AppWindow, Info, Move, RotateCcw, Tv } from 'lucide-react';
import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { Stagger } from '../components/motion';
import { LiveThemePreview } from '../components/ThemePreview';
import { Badge, Button, CopyField, Field, PageHeader, Select, Tile, Toggle } from '../components/ui';

function ThemeSelect({ state, target }: { state: AppState; target: ViewerTarget }) {
  return (
    <Field label="主題">
      <Select
        value={state.selectedThemes[target]}
        options={state.themes.map((theme) => ({ value: theme.id, label: theme.name }))}
        onChange={(id) => void api.selectTheme(target, id)}
      />
    </Field>
  );
}

function themeOf(state: AppState, target: ViewerTarget) {
  return state.themes.find((theme) => theme.id === state.selectedThemes[target]) ?? state.themes[0]!;
}

export function OutputsPage({ state }: { state: AppState }) {
  const { enabled, editing } = state.overlay;

  return (
    <div>
      <PageHeader title="輸出" description="同一份聊天內容，同時送到桌面 Overlay 和 OBS，兩邊可以用不同主題。" />

      <Stagger className="grid grid-cols-2 gap-3">
        <Tile
          title="桌面 Overlay"
          icon={<AppWindow />}
          action={<Toggle checked={enabled} label="桌面 Overlay" onChange={(v) => void api.setOverlayEnabled(v)} />}
        >
          <p className="text-sm text-ink-soft">
            給自己看的透明聊天室，浮在所有視窗上方，滑鼠可以直接穿過。OBS
            若使用「顯示器擷取」會一起錄到，建議改用遊戲或視窗擷取。
          </p>
          <div className="my-4 h-64 overflow-hidden rounded-2xl">
            <LiveThemePreview theme={themeOf(state, 'overlay')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ThemeSelect state={state} target="overlay" />
            <Field label="位置與大小">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={editing ? 'primary' : 'secondary'}
                  disabled={!enabled}
                  onClick={() => void api.setOverlayEditing(!editing)}
                >
                  <Move /> {editing ? '完成調整' : '調整'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={!enabled}
                  title="移回右下角"
                  onClick={() => void api.resetOverlayBounds()}
                >
                  <RotateCcw />
                </Button>
              </div>
            </Field>
          </div>
          {editing ? (
            <p className="mt-3 rounded-xl bg-matcha-soft/40 px-3 py-2 text-xs text-matcha-strong">
              直接拖曳 Overlay 移動位置、拖曳邊緣調整大小，完成後按「完成調整」。
            </p>
          ) : null}
          <p className="mt-3 flex gap-2 text-xs text-ink-faint">
            <Info className="size-4 shrink-0" />
            遊戲請使用「無邊框視窗」模式；獨佔全螢幕會蓋過所有置頂視窗。
          </p>
        </Tile>

        <Tile title="OBS 瀏覽器來源" icon={<Tv />} action={<Badge tone="matcha">背景自動透明</Badge>}>
          <p className="text-sm text-ink-soft">把聊天室放進直播畫面，觀眾會看到這個版本。</p>
          <div className="my-4 h-64 overflow-hidden rounded-2xl">
            <LiveThemePreview theme={themeOf(state, 'embed')} backdrop="checker" />
          </div>
          <ThemeSelect state={state} target="embed" />
          <div className="mt-3">
            <Field label="來源網址">
              <CopyField value={state.server.embedUrl} />
            </Field>
          </div>
          <ol className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
            {[
              '在 OBS 的來源新增「瀏覽器」。',
              '貼上上面的網址，建議寬 420、高 600。',
              '勾選「場景啟用時重新整理瀏覽器」更穩定。',
            ].map((step, index) => (
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
