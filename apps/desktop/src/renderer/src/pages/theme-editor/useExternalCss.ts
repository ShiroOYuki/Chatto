import { useEffect, useRef, useState } from 'react';
import type { CssFileOpenResult } from '../../../../shared/ipc';
import { cssFiles } from '../../services/cssFiles';

/** Waits for typing to pause before writing the file, so the editor does not reload on every key. */
export const WRITE_DELAY_MS = 250;

export interface ExternalCss {
  /** Set once the file is open; the draft and the file stay in sync from then on. */
  synced: CssFileOpenResult | null;
  opening: boolean;
  error: string | null;
  open: () => Promise<void>;
}

/**
 * Two-way sync between the draft's custom CSS and the theme's CSS file, from the
 * first "open in VSCode" until the theme editor closes. Outside edits land in the
 * draft like any other edit, so they are saved with the theme.
 */
export function useExternalCss(themeId: string, css: string, setCss: (css: string) => void): ExternalCss {
  const [synced, setSynced] = useState<CssFileOpenResult | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ css, setCss });
  latest.current = { css, setCss };
  const active = synced !== null;

  useEffect(() => {
    if (!active) return;
    return cssFiles.onChange((change) => {
      if (change.themeId === themeId) latest.current.setCss(change.css);
    });
  }, [active, themeId]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => cssFiles.write(themeId, css), WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, themeId, css]);

  useEffect(() => {
    if (!active) return;
    return () => cssFiles.close(themeId);
  }, [active, themeId]);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      setSynced(await cssFiles.open(themeId, latest.current.css));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpening(false);
    }
  };

  return { synced, opening, error, open };
}
