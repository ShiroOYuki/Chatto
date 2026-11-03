import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { OBS_PLUGIN_NAME, ObsPlugin } from './obs-plugin';

let root = '';
let bundledDir = '';
let pluginsDir = '';
let obsRunning = false;

function writeBundle(dll: string) {
  mkdirSync(join(bundledDir, 'bin', '64bit'), { recursive: true });
  mkdirSync(join(bundledDir, 'data', 'locale'), { recursive: true });
  writeFileSync(join(bundledDir, 'bin', '64bit', `${OBS_PLUGIN_NAME}.dll`), dll);
  writeFileSync(join(bundledDir, 'data', 'locale', 'en-US.ini'), 'ChattoChat="Chatto Chat"');
}

const plugin = () =>
  new ObsPlugin({ bundledDir, pluginsDir, obsDirs: [join(root, 'obs-studio')], isObsRunning: async () => obsRunning });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'chatto-obs-'));
  bundledDir = join(root, 'bundle', OBS_PLUGIN_NAME);
  pluginsDir = join(root, 'obs-studio', 'plugins');
  obsRunning = false;
});

describe('ObsPlugin', () => {
  it('is unavailable when this build ships no plugin', async () => {
    expect(plugin().status()).toEqual({ state: 'unavailable', obsFound: false });
    expect(await plugin().install()).toMatchObject({ ok: false, reason: 'failed' });
  });

  it('installs into the shared plugin folder and reports it installed', async () => {
    writeBundle('v1');
    mkdirSync(pluginsDir, { recursive: true });
    expect(plugin().status()).toEqual({ state: 'not-installed', obsFound: true });

    const result = await plugin().install();
    expect(result).toEqual({ ok: true, status: { state: 'installed', obsFound: true } });
    expect(readFileSync(join(pluginsDir, OBS_PLUGIN_NAME, 'bin', '64bit', `${OBS_PLUGIN_NAME}.dll`), 'utf8')).toBe(
      'v1',
    );
  });

  it('calls a different installed copy outdated and replaces it, dropping stale files', async () => {
    writeBundle('v1');
    await plugin().install();
    writeFileSync(join(pluginsDir, OBS_PLUGIN_NAME, 'data', 'old.txt'), 'stale');
    writeBundle('v2');
    expect(plugin().status().state).toBe('outdated');

    await plugin().install();
    expect(plugin().status().state).toBe('installed');
    expect(existsSync(join(pluginsDir, OBS_PLUGIN_NAME, 'data', 'old.txt'))).toBe(false);
  });

  it('asks to close OBS first, since it holds the DLL open', async () => {
    writeBundle('v1');
    obsRunning = true;
    expect(await plugin().install()).toMatchObject({
      ok: false,
      reason: 'obs-running',
      status: { state: 'not-installed' },
    });
    obsRunning = false;
    await plugin().install();
    obsRunning = true;
    expect(await plugin().uninstall()).toMatchObject({
      ok: false,
      reason: 'obs-running',
      status: { state: 'installed' },
    });
  });

  it('uninstalls by removing only its own folder', async () => {
    writeBundle('v1');
    await plugin().install();
    mkdirSync(join(pluginsDir, 'win-spout'), { recursive: true });
    expect(await plugin().uninstall()).toMatchObject({ ok: true, status: { state: 'not-installed' } });
    expect(existsSync(join(pluginsDir, 'win-spout'))).toBe(true);
  });
});
