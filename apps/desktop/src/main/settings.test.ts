import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const userData = vi.hoisted(() => ({ dir: '' }));
vi.mock('electron', () => ({ app: { getPath: () => userData.dir } }));

const { SettingsStore } = await import('./settings');

beforeEach(() => {
  userData.dir = mkdtempSync(join(tmpdir(), 'chatto-settings-'));
});
afterEach(() => rmSync(userData.dir, { recursive: true, force: true }));

describe('SettingsStore', () => {
  it('starts from defaults when no file exists', () => {
    const settings = new SettingsStore().get();
    expect(settings.serverPort).toBe(4820);
    expect(settings.overlay).toEqual({ enabled: false });
    expect(settings.customThemes).toEqual([]);
    expect(settings.prefs).toEqual({
      uiMode: 'full',
      appearance: 'system',
      closeToTray: true,
      launchAtLogin: false,
      editorCommand: '',
    });
  });

  it('falls back to defaults when the file is corrupt', () => {
    writeFileSync(join(userData.dir, 'settings.json'), '{ not json');
    expect(new SettingsStore().get().serverPort).toBe(4820);
  });

  it('merges a partial file from an older version with the defaults', () => {
    writeFileSync(
      join(userData.dir, 'settings.json'),
      JSON.stringify({ channelLogin: 'ciel', prefs: { uiMode: 'compact' }, selectedThemes: { embed: 'washi' } }),
    );
    const settings = new SettingsStore().get();
    expect(settings.channelLogin).toBe('ciel');
    expect(settings.prefs.uiMode).toBe('compact');
    expect(settings.prefs.closeToTray).toBe(true);
    expect(settings.selectedThemes.embed).toBe('washi');
    expect(settings.selectedThemes.overlay).toBeTruthy();
  });

  it('persists updates and leaves no temp file behind', () => {
    const store = new SettingsStore();
    store.update((draft) => {
      draft.channelLogin = 'shiraine_ciel';
      draft.overlay.enabled = true;
    });

    expect(existsSync(`${store.path}.tmp`)).toBe(false);
    const saved = JSON.parse(readFileSync(store.path, 'utf8'));
    expect(saved.channelLogin).toBe('shiraine_ciel');
    expect(new SettingsStore().get().overlay.enabled).toBe(true);
  });

  it('does not mutate the previous snapshot', () => {
    const store = new SettingsStore();
    const before = store.get();
    store.update((draft) => {
      draft.channelLogin = 'changed';
    });
    expect(before.channelLogin).toBe('');
    expect(store.get().channelLogin).toBe('changed');
  });

  it('repairs alert sounds that a newer version removed', () => {
    writeFileSync(
      join(userData.dir, 'settings.json'),
      JSON.stringify({
        alerts: {
          silence: {
            thresholdSeconds: 300,
            sound: { enabled: false, sound: { kind: 'builtin', id: 'teacup' }, volume: 0.3 },
          },
          events: {
            rules: {
              'twitch:raid': {
                minimum: 5,
                sound: { enabled: true, sound: { kind: 'builtin', id: 'chime' }, volume: 1 },
              },
            },
          },
        },
      }),
    );
    const { alerts } = new SettingsStore().get();
    expect(alerts.silence).toMatchObject({ enabled: true, thresholdSeconds: 300 });
    expect(alerts.silence.sound).toEqual({ enabled: false, sound: { kind: 'builtin', id: 'bubble' }, volume: 0.3 });
    expect(alerts.events.durationSeconds).toBe(5);
    expect(alerts.events.rules['twitch:raid']).toMatchObject({
      enabled: true,
      minimum: 5,
      sound: { sound: { id: 'bell' }, volume: 1 },
    });
  });
});
