import type { ChatTheme } from '@chatto/core';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { pathSetter, type PathSetter } from './draft';

const SAVED_FLASH_MS = 1600;

export interface ThemeDraft {
  draft: ChatTheme;
  /** The theme as last saved. */
  saved: ChatTheme;
  setDraft: Dispatch<SetStateAction<ChatTheme>>;
  set: PathSetter<ChatTheme>;
  dirty: boolean;
  saving: boolean;
  /** True for a moment after a successful save, to show the confirmation. */
  justSaved: boolean;
  saveError: string | null;
  save: () => Promise<void>;
  revert: () => void;
  /** The theme's custom CSS was saved elsewhere (its CSS file); take it into both copies. */
  acceptSavedCss: (css: string) => void;
}

/**
 * Editable copy of a theme plus its last saved state.
 * `persist` does the actual write so this hook stays free of IPC.
 */
export function useThemeDraft(
  initial: ChatTheme,
  persist: (theme: ChatTheme) => Promise<void>,
  onSaved: (theme: ChatTheme) => void,
): ThemeDraft {
  const [draft, setDraft] = useState<ChatTheme>(initial);
  const [saved, setSaved] = useState<ChatTheme>(initial);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = useMemo(() => pathSetter<ChatTheme>(setDraft), []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await persist(draft);
      setSaved(draft);
      onSaved(draft);
      setJustSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const acceptSavedCss = (customCss: string) => {
    setSaved((current) => ({ ...current, customCss }));
    setDraft((current) => ({ ...current, customCss }));
  };

  return {
    draft,
    saved,
    setDraft,
    set,
    dirty,
    saving,
    justSaved,
    saveError,
    save,
    revert: () => setDraft(saved),
    acceptSavedCss,
  };
}
