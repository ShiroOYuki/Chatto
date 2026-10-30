import { duplicateTheme } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { Copy, Download, Ellipsis, MonitorUp, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { motion, riseIn, Stagger } from '../components/motion';
import { StaticThemePreview } from '../components/ThemePreview';
import { Badge, Button, Hint, PageHeader } from '../components/kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { MagicCard } from '../components/ui/magic-card';
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
  const [pendingDelete, setPendingDelete] = useState<ChatTheme | null>(null);

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

      <Stagger className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {state.themes.map((theme) => {
          const targets = usedBy(theme);
          return (
            <motion.article
              key={theme.id}
              layout
              variants={riseIn}
              whileHover={{ y: -3 }}
              className={`rounded-tile ${targets.length ? 'ring-2 ring-matcha' : ''}`}
            >
              {/* Magic UI spotlight card: a matcha glow follows the pointer. */}
              <MagicCard
                className="h-full rounded-tile"
                gradientSize={240}
                gradientColor="rgba(151, 196, 89, 0.16)"
                gradientFrom="#97c459"
                gradientTo="#f4c0d1"
              >
                <div className="flex h-full flex-col">
                  <div className="relative h-44 overflow-hidden rounded-t-tile">
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
                      <div className="flex">
                        {theme.builtIn ? (
                          <Hint label="複製並編輯">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="複製並編輯"
                              onClick={() => void duplicate(theme)}
                            >
                              <Copy />
                            </Button>
                          </Hint>
                        ) : (
                          <Hint label="編輯">
                            <Button size="sm" variant="ghost" aria-label="編輯" onClick={() => setEditing(theme)}>
                              <Pencil />
                            </Button>
                          </Hint>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" aria-label="更多動作">
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem onSelect={() => exportTheme(theme)}>
                              <Download /> 匯出 JSON
                            </DropdownMenuItem>
                            {!theme.builtIn ? (
                              <DropdownMenuItem onSelect={() => void duplicate(theme)}>
                                <Copy /> 建立副本
                              </DropdownMenuItem>
                            ) : null}
                            {!theme.builtIn ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(theme)}>
                                  <Trash2 /> 刪除主題
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                </div>
              </MagicCard>
            </motion.article>
          );
        })}
      </Stagger>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-tile">
          <AlertDialogHeader>
            <AlertDialogTitle>刪除「{pendingDelete?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法復原。正在使用這個主題的 Overlay 或 OBS 會改回預設主題。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full"
              onClick={() => pendingDelete && void api.deleteTheme(pendingDelete.id)}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
