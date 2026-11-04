import { useEffect, useSyncExternalStore } from 'react';
import type { ObsPluginResult, ObsPluginStatus } from '../../../shared/ipc';
import { api } from '../api';

/** The last known plugin status, shared by the title bar and the outputs page. */
let current: ObsPluginStatus | null = null;
const listeners = new Set<() => void>();

function publish(status: ObsPluginStatus): void {
  current = status;
  listeners.forEach((listener) => listener());
}

async function act(action: Promise<ObsPluginResult>): Promise<ObsPluginResult> {
  const result = await action;
  publish(result.status);
  return result;
}

/** The bundled OBS plugin ("Chatto Chat" source). Each action reports the plugin's status after it. */
export const obsPlugin = {
  refresh: (): void => {
    api
      .getObsPluginStatus()
      .then(publish)
      .catch((error: unknown) => console.error('[chatto] obs plugin status failed', error));
  },
  install: (): Promise<ObsPluginResult> => act(api.installObsPlugin()),
  uninstall: (): Promise<ObsPluginResult> => act(api.uninstallObsPlugin()),
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The plugin's status, or null until the first check. OBS may be installed, closed or
 * changed while Chatto runs, so it is checked again whenever the window regains focus.
 */
export function useObsPluginStatus(): ObsPluginStatus | null {
  useEffect(() => {
    obsPlugin.refresh();
    window.addEventListener('focus', obsPlugin.refresh);
    return () => window.removeEventListener('focus', obsPlugin.refresh);
  }, []);
  return useSyncExternalStore(subscribe, () => current);
}
