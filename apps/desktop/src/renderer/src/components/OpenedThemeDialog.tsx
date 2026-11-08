import { VIEWER_TARGETS, type ChatTheme } from '@chatto/core';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import type { AppState, OpenedThemeFile } from '../../../shared/ipc';
import { useMessages, useThemeName } from '../i18n';
import { asImportedTheme } from '../pages/themeIO';
import { themes } from '../services/themes';
import { ActionNote, Button, Hint, Modal } from './kit';
import { StaticThemePreview } from './ThemePreview';

/** The file waiting for an answer: its preview, then import or cancel. */
function ConfirmFile({
  file,
  waiting,
  onImported,
}: {
  file: OpenedThemeFile;
  waiting: number;
  onImported: (theme: ChatTheme) => void;
}) {
  const messages = useMessages();
  const m = messages.appDialogs.openedTheme;
  const themeName = useThemeName();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const theme = file.theme;

  const confirm = async () => {
    if (!theme) return;
    setBusy(true);
    setError(null);
    const imported = asImportedTheme(theme, messages.themes.io);
    try {
      await themes.save(imported);
      // Answered first, so a window rebuilt later cannot offer the same file twice.
      themes.dismissOpenedFile(file.id);
      onImported(imported);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {theme ? (
        <figure className="flex flex-col gap-2">
          <div className="h-48 overflow-hidden rounded-xl border border-line" data-testid="opened-theme-preview">
            <StaticThemePreview theme={theme} />
          </div>
          <figcaption className="truncate font-medium">
            {themeName(theme) || messages.themes.io.untitledImport}
          </figcaption>
        </figure>
      ) : (
        <ActionNote tone="error">
          {m.failed}
          {file.error ? `\n${file.error}` : ''}
        </ActionNote>
      )}
      {error ? <ActionNote tone="error">{error}</ActionNote> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {waiting ? <span className="mr-auto text-xs text-ink-faint">{m.more(waiting)}</span> : null}
        {theme ? (
          <>
            <Button variant="ghost" onClick={() => themes.dismissOpenedFile(file.id)}>
              {m.cancel}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void confirm()}>
              <Upload /> {m.import}
            </Button>
          </>
        ) : (
          <Button onClick={() => themes.dismissOpenedFile(file.id)}>{m.close}</Button>
        )}
      </div>
    </>
  );
}

/** After importing: put the new theme to use on any output right away, like a theme card. */
function ApplyImported({ theme, state, onDone }: { theme: ChatTheme; state: AppState; onDone: () => void }) {
  const messages = useMessages();
  const m = messages.appDialogs.openedTheme;
  const t = messages.themes;
  return (
    <>
      <ActionNote tone="ok">{m.imported(theme.name)}</ActionNote>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-soft">{m.applyTo}</p>
        <div className="grid grid-cols-3 gap-2">
          {VIEWER_TARGETS.map((target) => {
            const active = state.selectedThemes[target] === theme.id;
            return (
              <Hint key={target} label={t.useFor[target]}>
                <Button
                  size="sm"
                  variant={active ? 'primary' : 'secondary'}
                  aria-pressed={active}
                  className="min-w-0 px-2"
                  onClick={() => themes.select(target, theme.id)}
                >
                  <span className="truncate">{t.targets[target]}</span>
                </Button>
              </Hint>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone}>
          {m.done}
        </Button>
      </div>
    </>
  );
}

/**
 * `.chattotheme` files opened from Windows (#40), one at a time: nothing is saved until the
 * user presses Import, and a file that cannot be read says why.
 */
export function OpenedThemeDialog({ state }: { state: AppState }) {
  const m = useMessages().appDialogs.openedTheme;
  const themeName = useThemeName();
  const [imported, setImported] = useState<ChatTheme | null>(null);
  const [file, ...rest] = state.openedThemeFiles;
  // The saved copy, once the state has it (names of saved themes can be localized).
  const saved = imported ? (state.themes.find((theme) => theme.id === imported.id) ?? imported) : null;
  const open = Boolean(saved || file);

  const close = () => {
    if (saved) setImported(null);
    else if (file) themes.dismissOpenedFile(file.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title={m.title}
      description={saved ? undefined : file ? m.from(file.fileName) : undefined}
      className="sm:max-w-lg"
    >
      {saved ? (
        <ApplyImported theme={{ ...saved, name: themeName(saved) }} state={state} onDone={() => setImported(null)} />
      ) : file ? (
        <ConfirmFile key={file.id} file={file} waiting={rest.length} onImported={setImported} />
      ) : null}
    </Modal>
  );
}
