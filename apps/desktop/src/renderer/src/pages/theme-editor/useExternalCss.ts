import { useEffect, useRef, useState } from 'react';
import type { CssFileOpenResult } from '../../../../shared/ipc';
import { cssFiles } from '../../services/cssFiles';

export interface ExternalCss {
  /** How the file was opened, once it has been in this editor session. */
  opened: CssFileOpenResult | null;
  opening: boolean;
  error: string | null;
  open: () => Promise<void>;
}

/**
 * Opens the theme's CSS file in an external editor. Saving the file there saves
 * the theme in the main process (so OBS and the overlay update at once);
 * `onSaved` brings that CSS into the open editor as well.
 */
export function useExternalCss(themeId: string, onSaved: (css: string) => void): ExternalCss {
  const [opened, setOpened] = useState<CssFileOpenResult | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(onSaved);
  latest.current = onSaved;

  useEffect(
    () =>
      cssFiles.onChange((change) => {
        if (change.themeId === themeId) latest.current(change.css);
      }),
    [themeId],
  );

  const open = async () => {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      setOpened(await cssFiles.open(themeId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpening(false);
    }
  };

  return { opened, opening, error, open };
}
