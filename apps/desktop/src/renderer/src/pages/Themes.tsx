import { duplicateTheme } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { Copy, Download, MonitorUp, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { StaticThemePreview } from '../components/ThemePreview';
import { Badge, Button, PageHeader } from '../components/ui';
import { ThemeEditor } from './ThemeEditor';
import { exportTheme, pickThemeFile } from './themeIO';

const LAYOUT_LABEL: Record<string, string> = {
  card: '卡片',
  bubble: '泡泡',
  inline: '單行',
  tag: '標籤',
  terminal: '終端機',
};

export function ThemesPage({ state }: { state: AppState }) {
  const [editing, setEditing] = useState<ChatTheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return <ThemeEditor initial={editing} onClose={() => setEditing(null)} onSaved={(theme) => setEditing(theme)} />;
  }

  const usedBy = (theme: ChatTheme) =>
    (['overlay', 'embed'] as const).filter((target) => state.selectedThemes[target] === theme.id);

  const duplicate = async (theme: ChatTheme) => {
    const copy = duplicateTheme(theme, `${theme.name} 副本`);
    await api.saveTheme(copy);
    setEditing(copy);
  };

  const importTheme = async () => {
    setError(null);
    try {
      const theme = await pickThemeFile();
      await api.saveTheme(theme);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div>
      <PageHeader
        title="主題"
        description="風格與配色可以自由組合。內建主題可以複製後再編輯，也能匯出成 JSON 分享。"
        action={
          <div className="flex gap-2">
            <Button onClick={() => void importTheme()}>
              <Upload /> 匯入
            </Button>
            <Button variant="primary" onClick={() => void duplicate(state.themes[0]!)}>
              <Plus /> 新增主題
            </Button>
          </div>
        }
      />
      {error ? <p className="mb-4 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p> : null}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {state.themes.map((theme) => {
          const targets = usedBy(theme);
          return (
            <article
              key={theme.id}
              className={`group flex flex-col overflow-hidden rounded-tile border bg-tile transition ${
                targets.length ? 'border-matcha' : 'border-line hover:border-matcha/50'
              }`}
            >
              <div className="relative h-44">
                <StaticThemePreview theme={theme} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{theme.name}</h3>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                      {LAYOUT_LABEL[theme.layout] ?? theme.layout} · {theme.builtIn ? '內建' : '自訂'}
                      {targets.map((target) => (
                        <Badge key={target} tone="matcha">
                          {target === 'overlay' ? 'Overlay' : 'OBS'}
                        </Badge>
                      ))}
                    </p>
                  </div>
                  <div className="flex opacity-60 transition group-hover:opacity-100">
                    {theme.builtIn ? (
                      <Button size="sm" variant="ghost" title="複製並編輯" onClick={() => void duplicate(theme)}>
                        <Copy />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" title="編輯" onClick={() => setEditing(theme)}>
                        <Pencil />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" title="匯出 JSON" onClick={() => exportTheme(theme)}>
                      <Download />
                    </Button>
                    {!theme.builtIn ? (
                      <Button size="sm" variant="danger" title="刪除" onClick={() => void api.deleteTheme(theme.id)}>
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  {(['overlay', 'embed'] as ViewerTarget[]).map((target) => {
                    const active = state.selectedThemes[target] === theme.id;
                    return (
                      <Button
                        key={target}
                        size="sm"
                        variant={active ? 'primary' : 'secondary'}
                        onClick={() => void api.selectTheme(target, theme.id)}
                      >
                        <MonitorUp />
                        {target === 'overlay' ? 'Overlay' : 'OBS'}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
