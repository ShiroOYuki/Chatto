import { playSound } from '@chatto/chat-ui';
import type { AlertSettings, SoundRef, SoundSetting } from '@chatto/core';
import { api } from '../api';
import { runAction } from './run';

/** URL of a user sound on the desktop app's local server. */
export const soundUrl = (port: number) => (id: string) => `http://localhost:${port}/sounds/${encodeURIComponent(id)}`;

/** Plays an alert sound in the control panel; failures are logged, never thrown. */
export function previewSound(sound: SoundSetting, port: number): void {
  playSound({ ...sound, enabled: true }, soundUrl(port)).catch((error: unknown) =>
    console.error('[chatto] sound failed', error),
  );
}

export const alerts = {
  setSettings: (settings: AlertSettings) => runAction('setAlertSettings', api.setAlertSettings(settings)),
  setOverlayEnabled: (enabled: boolean) => runAction('setAlertsOverlayEnabled', api.setAlertsOverlayEnabled(enabled)),
  setOverlayEditing: (editing: boolean) => runAction('setAlertsOverlayEditing', api.setAlertsOverlayEditing(editing)),
  resetOverlayBounds: () => runAction('resetAlertsOverlayBounds', api.resetAlertsOverlayBounds()),
  /** Opens a file picker; resolves to null when cancelled or when copying failed (logged). */
  importSound: (): Promise<SoundRef | null> =>
    api.importSound().catch((error: unknown) => {
      console.error('[chatto] importSound failed', error);
      return null;
    }),
};
