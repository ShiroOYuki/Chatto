import { duplicateTheme, localizeTheme } from '@chatto/chat-ui';
import { LOCALES, VIEWER_TARGETS, type ChatTheme } from '@chatto/core';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import type { PageId } from '../../components/Sidebar';
import { useChatLocale, useMessages, useThemeName } from '../../i18n';
import { useShareUpdates } from '../../services/share';
import { themes } from '../../services/themes';
import { SignInDialog } from '../../components/share/SignInDialog';
import { MotionConfig } from '../../components/motion';
import { Badge, Button, EmptyState, Hint, PageHeader } from '../../components/kit';
import { LazyBoundary, lazyNamed } from '../../components/lazy';
import { pickThemeFile } from '../themeIO';
import { ConfirmDialog } from './ConfirmDialog';
import { FolderNameDialog } from './FolderNameDialog';
import {
  EMPTY_FILTER,
  isFiltering,
  sectionFolder,
  stepFolder,
  stepTheme,
  themeSections,
  type MatchContext,
  type ThemeFilter,
  type ThemeSection,
} from './library';
import { ThemeCard } from './ThemeCard';
import { ThemeSectionView } from './ThemeSectionView';
import { ThemeToolbar } from './ThemeToolbar';
import { TrashDialog } from './TrashDialog';

// The editor pulls in CodeMirror; the publish dialog the share forms. Both load when first opened.
const ThemeEditor = lazyNamed(() => import('../theme-editor/ThemeEditor'), 'ThemeEditor');
const PublishDialog = lazyNamed(() => import('../explore/PublishDialog'), 'PublishDialog');

type FolderDialog = { kind: 'create' } | { kind: 'rename'; id: string; name: string };

export function ThemesPage({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const [editing, setEditing] = useState<ChatTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatTheme | null>(null);
  const [pendingFolderDelete, setPendingFolderDelete] = useState<{ id: string; name: string } | null>(null);
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [filter, setFilter] = useState<ThemeFilter>(EMPTY_FILTER);
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
  const { themeLibrary: library, selectedThemes } = state;

  const context = useMemo<MatchContext>(
    () => ({
      names: (theme) => (theme.builtIn ? LOCALES.map((locale) => localizeTheme(theme, locale).name) : [theme.name]),
      inUse: (theme) => VIEWER_TARGETS.some((target) => selectedThemes[target] === theme.id),
    }),
    [selectedThemes],
  );
  const filtering = isFiltering(filter);
  const sections = useMemo(
    () => themeSections(state.themes, library, filter, context),
    [state.themes, library, filter, context],
  );

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

  const usedBy = (theme: ChatTheme) => VIEWER_TARGETS.filter((target) => selectedThemes[target] === theme.id);

  /** A copy lands in the folder of the theme it came from (built-in and unfiled ones: unfiled). */
  const duplicate = async (theme: ChatTheme, folderId: string | null = null) => {
    setError(null);
    const copy = duplicateTheme(theme, m.copyOf(themeName(theme)), chatLocale);
    try {
      await themes.save(copy);
      if (folderId) themes.library({ type: 'move-theme', themeId: copy.id, folderId, before: null });
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

  const sectionName = (section: ThemeSection) =>
    section.kind === 'folder'
      ? section.folder.name
      : section.kind === 'built-in'
        ? m.library.builtIn
        : m.library.unfiled;

  const card = (section: ThemeSection, theme: ChatTheme) => {
    const folderId = sectionFolder(section);
    return (
      <ThemeCard
        key={theme.id}
        theme={theme}
        targets={usedBy(theme)}
        selected={selectedThemes}
        updateAvailable={updates.has(theme.id)}
        moves={
          folderId === undefined
            ? undefined
            : {
                folders: library.folders,
                current: folderId,
                up: filtering ? null : stepTheme(section, theme.id, -1),
                down: filtering ? null : stepTheme(section, theme.id, 1),
                dropBefore: (dragged) =>
                  themes.library({ type: 'move-theme', themeId: dragged, folderId, before: theme.id }),
              }
        }
        onEdit={() => setEditing(theme)}
        onDuplicate={() => void duplicate(theme, folderId ?? null)}
        onPublish={() => publish(theme)}
        onDelete={() => setPendingDelete(theme)}
        onOpenExplore={() => onNavigate('explore')}
      />
    );
  };

  const trashCount = state.themeTrash.length;

  return (
    <div>
      <PageHeader
        title={m.title}
        description={m.description}
        action={
          <div className="flex gap-2">
            <Hint label={m.trash.open}>
              <Button aria-label={m.trash.open} onClick={() => setTrashOpen(true)}>
                <Trash2 /> <span className="max-[1180px]:sr-only">{m.trash.open}</span>
                {trashCount > 0 ? <Badge>{trashCount}</Badge> : null}
              </Button>
            </Hint>
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

      <ThemeToolbar filter={filter} onChange={setFilter} onNewFolder={() => setFolderDialog({ kind: 'create' })} />

      <MotionConfig reducedMotion="user">
        {sections.length === 0 ? (
          <EmptyState title={m.library.noResults} hint={m.library.noResultsHint} />
        ) : (
          sections.map((section) => (
            <ThemeSectionView
              key={section.id}
              section={section}
              name={sectionName(section)}
              collapsed={library.collapsed.includes(section.id)}
              canCollapse={!filtering}
              folderMoves={
                section.kind === 'folder'
                  ? { up: stepFolder(library, section.id, -1), down: stepFolder(library, section.id, 1) }
                  : undefined
              }
              onRename={
                section.kind === 'folder'
                  ? () => setFolderDialog({ kind: 'rename', id: section.id, name: section.folder.name })
                  : undefined
              }
              onDelete={
                section.kind === 'folder'
                  ? () => setPendingFolderDelete({ id: section.id, name: section.folder.name })
                  : undefined
              }
            >
              {section.themes.map((theme) => card(section, theme))}
            </ThemeSectionView>
          ))
        )}
      </MotionConfig>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? m.deleteTitle(themeName(pendingDelete)) : ''}
        description={m.deleteDescription}
        confirmLabel={m.moveToTrash}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) themes.remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <ConfirmDialog
        open={pendingFolderDelete !== null}
        title={pendingFolderDelete ? m.library.deleteFolderTitle(pendingFolderDelete.name) : ''}
        description={m.library.deleteFolderDescription}
        confirmLabel={m.library.deleteFolder}
        onCancel={() => setPendingFolderDelete(null)}
        onConfirm={() => {
          if (pendingFolderDelete) themes.library({ type: 'delete-folder', id: pendingFolderDelete.id });
          setPendingFolderDelete(null);
        }}
      />
      <FolderNameDialog
        open={folderDialog !== null}
        initial={folderDialog?.kind === 'rename' ? folderDialog.name : undefined}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        onSubmit={(name) => {
          if (folderDialog?.kind === 'rename') themes.library({ type: 'rename-folder', id: folderDialog.id, name });
          else themes.library({ type: 'create-folder', id: `folder-${crypto.randomUUID()}`, name });
        }}
      />
      <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} entries={state.themeTrash} />
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
