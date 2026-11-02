import { duplicateTheme } from '@chatto/chat-ui';
import type { ChatTheme, ViewerTarget } from '@chatto/core';
import { Copy, Download, Ellipsis, MonitorUp, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { useChatLocale, useMessages, useThemeName } from '../i18n';
import { runAction } from '../services/run';
import { themes } from '../services/themes';
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
import { ThemeEditor } from './theme-editor/ThemeEditor';
import { exportTheme, needsPackage, pickThemeFile } from './themeIO';
import { describeTheme } from './themeLabels';

export function ThemesPage({ state }: { state: AppState }) {
  const [editing, setEditing] = useState<ChatTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatTheme | null>(null);
  const messages = useMessages();
  const m = messages.themes;
  const themeName = useThemeName();
  const chatLocale = useChatLocale();

  if (editing) {
    return <ThemeEditor initial={editing} onClose={() => setEditing(null)} onSaved={(theme) => setEditing(theme)} />;
  }

  const usedBy = (theme: ChatTheme) =>
    (['overlay', 'embed'] as const).filter((target) => state.selectedThemes[target] === theme.id);

  const duplicate = async (theme: ChatTheme) => {
    setError(null);
    const copy = duplicateTheme(theme, m.copyOf(themeName(theme)), chatLocale);
    try {
      await themes.save(copy);
      setEditing(copy);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const importTheme = async () => {
    setError(null);
    try {
      const theme = await pickThemeFile(m.io);
      await themes.save(theme);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div>
      <PageHeader
        title={m.title}
        description={m.description}
        action={
          <div className="flex gap-2">
            <Button onClick={() => void importTheme()}>
              <Upload /> {messages.common.import}
            </Button>
            <Button variant="primary" onClick={() => void duplicate(state.themes[0]!)}>
              <Plus /> {m.newTheme}
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
                        <h3 className="truncate font-medium">{themeName(theme)}</h3>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                          {describeTheme(theme, m.labels)} · {theme.builtIn ? m.builtIn : m.custom}
                          {targets.map((target) => (
                            <Badge key={target} tone="matcha">
                              {target === 'overlay' ? 'Overlay' : 'OBS'}
                            </Badge>
                          ))}
                        </p>
                      </div>
                      <div className="flex">
                        {theme.builtIn ? (
                          <Hint label={m.duplicateAndEdit}>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={m.duplicateAndEdit}
                              onClick={() => void duplicate(theme)}
                            >
                              <Copy />
                            </Button>
                          </Hint>
                        ) : (
                          <Hint label={messages.common.edit}>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={messages.common.edit}
                              onClick={() => setEditing(theme)}
                            >
                              <Pencil />
                            </Button>
                          </Hint>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" aria-label={m.moreActions}>
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl">
                            <DropdownMenuItem onSelect={() => runAction('exportTheme', exportTheme(theme))}>
                              <Download /> {needsPackage(theme) ? m.exportPackage : m.exportJson}
                            </DropdownMenuItem>
                            {!theme.builtIn ? (
                              <DropdownMenuItem onSelect={() => void duplicate(theme)}>
                                <Copy /> {m.duplicate}
                              </DropdownMenuItem>
                            ) : null}
                            {!theme.builtIn ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(theme)}>
                                  <Trash2 /> {m.deleteTheme}
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
                            onClick={() => themes.select(target, theme.id)}
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
            <AlertDialogTitle>{pendingDelete ? m.deleteTitle(themeName(pendingDelete)) : null}</AlertDialogTitle>
            <AlertDialogDescription>{m.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full"
              onClick={() => pendingDelete && themes.remove(pendingDelete.id)}
            >
              {messages.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
