import { duplicateTheme } from '@chatto/chat-ui';
import { VIEWER_TARGETS, type ChatTheme } from '@chatto/core';
import { Copy, Download, Ellipsis, Pencil, Plus, Send, Trash2, Upload } from 'lucide-react';
import { Suspense, useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import type { PageId } from '../components/Sidebar';
import { useChatLocale, useMessages, useThemeName } from '../i18n';
import { runAction } from '../services/run';
import { useShareUpdates } from '../services/share';
import { themes } from '../services/themes';
import { SignInDialog } from '../components/share/SignInDialog';
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
import { exportTheme, pickThemeFile } from './themeIO';
import { describeTheme } from './themeLabels';
import { LazyBoundary, lazyNamed } from '../components/lazy';

// The editor pulls in CodeMirror; the publish dialog the share forms. Both load when first opened.
const ThemeEditor = lazyNamed(() => import('./theme-editor/ThemeEditor'), 'ThemeEditor');
const PublishDialog = lazyNamed(() => import('./explore/PublishDialog'), 'PublishDialog');

export function ThemesPage({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const [editing, setEditing] = useState<ChatTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatTheme | null>(null);
  const [publishing, setPublishing] = useState<ChatTheme | null>(null);
  // Mounted from the first publish on, so the dialog keeps its closing animation.
  const [publishMounted, setPublishMounted] = useState(false);
  if (publishing !== null && !publishMounted) setPublishMounted(true);
  const [signingIn, setSigningIn] = useState(false);
  const messages = useMessages();
  const m = messages.themes;
  const themeName = useThemeName();
  const chatLocale = useChatLocale();
  const updates = useShareUpdates();

  // Publishing needs an account; without one, signing in comes first.
  const publish = (theme: ChatTheme) => {
    if (state.share.session.status === 'signed-in') setPublishing(theme);
    else setSigningIn(true);
  };

  if (editing) {
    return (
      <LazyBoundary>
        <ThemeEditor initial={editing} onClose={() => setEditing(null)} onSaved={(theme) => setEditing(theme)} />
      </LazyBoundary>
    );
  }

  const usedBy = (theme: ChatTheme) => VIEWER_TARGETS.filter((target) => state.selectedThemes[target] === theme.id);

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
              className={`overflow-hidden rounded-tile border bg-tile transition-colors ${
                targets.length ? 'border-matcha' : 'border-line hover:border-ink-faint/40'
              }`}
            >
              <div>
                <div className="flex h-full flex-col">
                  <div className="relative h-44 overflow-hidden rounded-t-tile">
                    <StaticThemePreview theme={theme} />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate font-medium">{themeName(theme)}</h2>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                          {describeTheme(theme, m.labels)} · {theme.builtIn ? m.builtIn : m.custom}
                          {updates.has(theme.id) ? (
                            <button type="button" onClick={() => onNavigate('explore')}>
                              <Badge tone="sakura">{messages.share.updateAvailable}</Badge>
                            </button>
                          ) : null}
                          {targets.map((target) => (
                            <Badge key={target} tone="matcha">
                              {m.targets[target]}
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
                              <Download /> {m.exportPackage}
                            </DropdownMenuItem>
                            {!theme.builtIn ? (
                              <DropdownMenuItem onSelect={() => void duplicate(theme)}>
                                <Copy /> {m.duplicate}
                              </DropdownMenuItem>
                            ) : null}
                            {!theme.builtIn ? (
                              <DropdownMenuItem onSelect={() => publish(theme)}>
                                <Send /> {m.publish}
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
                    <div className="mt-auto grid grid-cols-3 gap-2">
                      {VIEWER_TARGETS.map((target) => {
                        const active = state.selectedThemes[target] === theme.id;
                        return (
                          <Hint key={target} label={m.useFor[target]}>
                            <Button
                              size="sm"
                              variant={active ? 'primary' : 'secondary'}
                              aria-pressed={active}
                              className="min-w-0 px-2"
                              onClick={() => themes.select(target, theme.id)}
                            >
                              <span className="truncate">{m.targets[target]}</span>
                            </Button>
                          </Hint>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
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
            <AlertDialogCancel className="rounded-xl">{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-xl"
              onClick={() => pendingDelete && themes.remove(pendingDelete.id)}
            >
              {messages.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {publishMounted && (
        <Suspense fallback={null}>
          <PublishDialog
            open={publishing !== null}
            onOpenChange={(open) => !open && setPublishing(null)}
            themeId={publishing?.id}
          />
        </Suspense>
      )}
      <SignInDialog open={signingIn} onOpenChange={setSigningIn} />
    </div>
  );
}
