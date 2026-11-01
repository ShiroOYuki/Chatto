import { LayoutDashboard, PanelsTopLeft } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { AppState } from '../../../shared/ipc';
import { SUPPORT_LINKS } from '../../../shared/support';
import { appPrefs, openExternal } from '../services/app';
import { Stagger } from '../components/motion';
import { ThemeSwitcher } from '../components/kibo-ui/theme-switcher';
import { TeaCup } from '../components/TeaCup';
import { Button, PageHeader, Segmented, TextInput, Tile, Toggle } from '../components/kit';

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-4 last:border-b-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-ink-faint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Saved when the field loses focus or on Enter, not on every key. */
function EditorCommandField({ value }: { value: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text.trim() !== value) appPrefs.set({ editorCommand: text.trim() });
  };
  return (
    <TextInput
      aria-label="外部 CSS 編輯器指令"
      value={text}
      placeholder='code "{folder}" "{file}"'
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
      className="w-72 font-mono text-xs md:text-xs"
    />
  );
}

export function SettingsPage({ state }: { state: AppState }) {
  const { prefs } = state;
  return (
    <div className="max-w-3xl">
      <PageHeader title="設定" />

      <Stagger className="flex flex-col gap-3">
        <Tile title="外觀">
          <Row title="主題色彩" hint="跟隨系統，或固定亮色／暗色。">
            <ThemeSwitcher
              value={prefs.appearance}
              onChange={(appearance) => appPrefs.set({ appearance })}
              className="h-9 bg-tile-muted p-1.5 ring-0 [&_button]:size-6"
            />
          </Row>
          <Row title="介面模式" hint="精簡模式把常用功能集中在一頁，適合開台時放在副螢幕。">
            <Segmented
              size="sm"
              value={prefs.uiMode}
              onChange={(uiMode) => appPrefs.set({ uiMode })}
              options={[
                {
                  value: 'full',
                  label: (
                    <>
                      <PanelsTopLeft /> 完整
                    </>
                  ),
                },
                {
                  value: 'compact',
                  label: (
                    <>
                      <LayoutDashboard /> 精簡
                    </>
                  ),
                },
              ]}
            />
          </Row>
        </Tile>

        <Tile title="視窗與啟動">
          <Row title="關閉時縮到系統匣" hint="Overlay 和 OBS 會繼續運作；從系統匣右鍵選「結束」才會完全關閉。">
            <Toggle
              checked={prefs.closeToTray}
              label="關閉時縮到系統匣"
              onChange={(closeToTray) => appPrefs.set({ closeToTray })}
            />
          </Row>
          <Row title="開機時自動啟動" hint="只在安裝版生效。">
            <Toggle
              checked={prefs.launchAtLogin}
              label="開機時自動啟動"
              onChange={(launchAtLogin) => appPrefs.set({ launchAtLogin })}
            />
          </Row>
        </Tile>

        <Tile title="自訂 CSS">
          <Row title="外部編輯器" hint="留空使用 VSCode。可用 {file}、{folder} 代入路徑。">
            <EditorCommandField value={prefs.editorCommand} />
          </Row>
        </Tile>

        <Tile title="本機伺服器">
          <Row title="連接埠" hint="只綁定 127.0.0.1，區網內其他裝置無法讀取。">
            <code className="rounded-lg bg-tile-muted px-3 py-1 font-mono text-sm">{state.server.port}</code>
          </Row>
        </Tile>

        <Tile title="關於">
          <div className="flex items-center gap-4">
            <TeaCup mood="happy" size={64} />
            <div className="flex-1">
              <div className="font-semibold">Chatto チャット</div>
              <div className="text-xs text-ink-faint">v{state.appInfo.version} · GPL-3.0-or-later · © 2026 Ciel</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => openExternal('https://www.gnu.org/licenses/gpl-3.0.html')}>
              授權條款
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-6 border-t border-line pt-4">
            <div>
              <div className="text-sm font-medium">支持 Chatto</div>
              <div className="mt-0.5 text-xs text-ink-faint">Chatto 免費開源。喜歡的話，請 Ciel 喝杯茶。</div>
            </div>
            <div className="flex gap-2">
              {SUPPORT_LINKS.map((link) => (
                <Button key={link.id} size="sm" onClick={() => openExternal(link.url)} title={link.hint}>
                  {link.label}
                </Button>
              ))}
            </div>
          </div>
        </Tile>
      </Stagger>
    </div>
  );
}
