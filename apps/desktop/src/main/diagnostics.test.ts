import { unzipSync, strFromU8 } from 'fflate';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleState } from '../../../../tests/fake-api';

const userData = vi.hoisted(() => ({ dir: '' }));
vi.mock('electron', () => ({ app: { getPath: () => userData.dir, getLocale: () => 'zh-TW' } }));

const { SettingsStore } = await import('./settings');
const {
  HIDDEN_CHANNEL,
  PREFS_POLICY,
  SETTINGS_POLICY,
  buildDiagnosticsZip,
  connectionSummary,
  describeStateChanges,
  diagnosticsFileName,
  hideNames,
  sanitizeSettings,
} = await import('./diagnostics');

beforeEach(() => {
  userData.dir = mkdtempSync(join(tmpdir(), 'chatto-diag-'));
});
afterEach(() => rmSync(userData.dir, { recursive: true, force: true }));

const settingsWith = () => {
  const store = new SettingsStore();
  return store.update((draft) => {
    draft.channelLogin = 'shiraine_ciel';
    draft.twitchClientId = 'abc123';
    draft.prefs.editorCommand = 'C:\\Users\\Ciel\\code.exe {file}';
    draft.windowBounds = { x: 0, y: 0, width: 1280, height: 820 };
  });
};

describe('settings in diagnostics', () => {
  // A new setting must be sorted into SETTINGS_POLICY / PREFS_POLICY before it can be exported.
  it('decides on every setting the app saves', () => {
    const settings = settingsWith();
    expect(Object.keys(SETTINGS_POLICY).sort()).toEqual(Object.keys(settings).sort());
    expect(Object.keys(PREFS_POLICY).sort()).toEqual(Object.keys(settings.prefs).sort());
  });

  it('leaves out the sharing id, editor path and, by default, the channel', () => {
    const settings = settingsWith();
    const out = sanitizeSettings(settings, { includeChannel: false });
    const text = JSON.stringify(out);
    expect(out.channelLogin).toBe(HIDDEN_CHANNEL);
    expect(text).not.toContain('shiraine_ciel');
    expect(text).not.toContain(settings.share.clientId);
    expect(text).not.toContain('Users\\\\Ciel');
    expect(out.share).toEqual({ termsAccepted: 0 });
    expect(out.twitchClientId).toBe('abc123');
  });

  it('includes the channel when asked', () => {
    expect(sanitizeSettings(settingsWith(), { includeChannel: true }).channelLogin).toBe('shiraine_ciel');
  });
});

describe('connection summary', () => {
  it('hides the account and channel names unless asked', () => {
    const state = sampleState();
    expect(JSON.stringify(connectionSummary(state, { includeChannel: false }))).not.toContain('shiraine_ciel');
    expect(JSON.stringify(connectionSummary(state, { includeChannel: true }))).toContain('shiraine_ciel');
  });

  it('hides names inside free text', () => {
    expect(hideNames('Channel Shiraine_Ciel not found', ['shiraine_ciel'])).toBe(`Channel ${HIDDEN_CHANNEL} not found`);
    expect(hideNames('nothing here', [undefined, ''])).toBe('nothing here');
  });
});

describe('state change log lines', () => {
  it('reports connection changes without names', () => {
    const prev = sampleState({ channel: { login: 'shiraine_ciel', state: 'connecting' } });
    const next = sampleState({ channel: { login: 'shiraine_ciel', state: 'error', detail: 'network' } });
    expect(describeStateChanges(prev, next)).toEqual(['chat: error (network)']);
    expect(describeStateChanges(next, next)).toEqual([]);
  });
});

describe('the zip', () => {
  it('has the info, settings and logs', () => {
    const zip = unzipSync(
      buildDiagnosticsZip({ info: { app: '0.3.0' }, settings: { a: 1 }, logs: [{ name: 'chatto.log', text: 'hi' }] }),
    );
    expect(Object.keys(zip).sort()).toEqual(['info.json', 'logs/chatto.log', 'settings.json']);
    expect(JSON.parse(strFromU8(zip['info.json']!))).toEqual({ app: '0.3.0' });
  });

  it('is named with the local date and time', () => {
    expect(diagnosticsFileName(new Date(2026, 10, 8, 13, 5))).toBe('chatto-diagnostics-20261108-1305.zip');
  });
});
