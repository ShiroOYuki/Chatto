import type { ChatTheme } from '@chatto/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CaptureRect, ShareApi, ShareMethod } from '../../../shared/ipc';
import {
  SHARE_TERMS_VERSION,
  type ShareResult,
  type ShareSession,
  type ShareThemeDetail,
  isModifiedInstall,
} from '@chatto/share';
import { api } from '../api';
import { useAppState } from '../store';

/** Calls the main process's sharing client; every call resolves to a `ShareResult`. */
export function shareCall<K extends ShareMethod>(
  method: K,
  ...args: Parameters<ShareApi[K]>
): Promise<Awaited<ReturnType<ShareApi[K]>>> {
  return api.share(method, ...args);
}

/** A PNG data URL of part of the window, or null where it cannot capture (the browser preview). */
export function captureThumbnail(element: Element): Promise<string | null> {
  const box = element.getBoundingClientRect();
  const rect: CaptureRect = { x: box.left, y: box.top, width: box.width, height: box.height };
  return api.captureThumbnail(rect).catch(() => null);
}

const SIGNED_OUT: ShareSession = { status: 'signed-out' };

/** The sharing account as the control panel sees it. */
export function useShareSession(): { session: ShareSession; needsTerms: boolean } {
  const share = useAppState()?.share;
  return {
    session: share?.session ?? SIGNED_OUT,
    needsTerms: (share?.termsAccepted ?? 0) < SHARE_TERMS_VERSION,
  };
}

const details = new Map<string, Promise<ShareResult<ShareThemeDetail>>>();

/**
 * A shared theme with its full content, kept per version so cards and the detail view load it
 * once. Failed loads are not kept, so they can be retried.
 */
export function loadShareDetail(id: string, version: number): Promise<ShareResult<ShareThemeDetail>> {
  const key = `${id}@${version}`;
  let pending = details.get(key);
  if (!pending) {
    pending = shareCall('get', id).then((result) => {
      if (!result.ok) details.delete(key);
      return result;
    });
    details.set(key, pending);
  }
  return pending;
}

/** Local themes installed from each shared theme (`origin.shareId`). */
export function useInstalledThemes(): Map<string, ChatTheme[]> {
  const themes = useAppState()?.themes;
  return useMemo(() => {
    const byShare = new Map<string, ChatTheme[]>();
    for (const theme of themes ?? []) {
      if (!theme.origin) continue;
      byShare.set(theme.origin.shareId, [...(byShare.get(theme.origin.shareId) ?? []), theme]);
    }
    return byShare;
  }, [themes]);
}

/**
 * Installed themes a newer shared version exists for, by local theme id, with that version.
 * Themes the user changed after installing are left alone.
 */
export function useShareUpdates(): Map<string, number> {
  const installed = useInstalledThemes();
  const ids = useMemo(() => [...installed.keys()].sort(), [installed]);
  const [latest, setLatest] = useState<Record<string, number>>({});
  const key = ids.join(',');
  useEffect(() => {
    if (!key) return;
    let current = true;
    void shareCall('versions', key.split(',')).then((result) => {
      if (current && result.ok) setLatest(result.value);
    });
    return () => {
      current = false;
    };
  }, [key]);
  return useMemo(() => {
    const updates = new Map<string, number>();
    for (const [shareId, themes] of installed) {
      const version = latest[shareId];
      if (!version) continue;
      for (const theme of themes)
        if (theme.origin && theme.origin.version < version && !isModifiedInstall(theme)) updates.set(theme.id, version);
    }
    return updates;
  }, [installed, latest]);
}

/** Runs a sharing call and tracks whether it is in flight. */
export function useShareAction(): {
  busy: boolean;
  run: <T>(action: () => Promise<ShareResult<T>>) => Promise<ShareResult<T>>;
} {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T>(action: () => Promise<ShareResult<T>>) => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
