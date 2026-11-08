import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UpdateState } from '../shared/ipc';
import { updateErrorKind, UPDATE_CHECK_INTERVAL_MS, Updater, type UpdaterBackend } from './updater';

/** Stands in for electron-updater's autoUpdater: tests emit its events by hand. */
function fakeBackend() {
  const events = new EventEmitter();
  const backend = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    on: (event: string, listener: (...args: unknown[]) => void) => events.on(event, listener),
    checkForUpdates: vi.fn(async () => null),
    downloadUpdate: vi.fn(async () => []),
    quitAndInstall: vi.fn(),
  };
  return { backend, emit: (event: string, payload?: unknown) => events.emit(event, payload) };
}

function setup() {
  const { backend, emit } = fakeBackend();
  const changes: UpdateState[] = [];
  const updater = new Updater(backend as unknown as UpdaterBackend, (state) => changes.push(state));
  return { updater, backend, emit, changes };
}

afterEach(() => vi.useRealTimers());

describe('updateErrorKind', () => {
  it('tells a missing release, a network failure and anything else apart', () => {
    const httpError = Object.assign(
      new Error('404 "method: GET url: https://github.com/x/y/releases.atom"\n\nheaders: set-cookie=secret'),
      { statusCode: 404 },
    );
    expect(updateErrorKind(httpError)).toBe('not-found');
    expect(updateErrorKind(new Error('404 "method: GET url: …"'))).toBe('not-found');
    expect(updateErrorKind(Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' }))).toBe('network');
    expect(updateErrorKind(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('network');
    expect(updateErrorKind(new Error('sha512 checksum mismatch'))).toBe('unknown');
    expect(updateErrorKind('weird')).toBe('unknown');
  });
});

describe('Updater', () => {
  it('does nothing in a development build', async () => {
    const updater = new Updater(null);
    expect(updater.state).toEqual({ status: 'unsupported' });
    updater.start();
    await updater.check();
    expect(updater.state.status).toBe('unsupported');
  });

  it('only asks: no automatic download, but installs when the app quits', () => {
    const { backend } = setup();
    expect(backend.autoDownload).toBe(false);
    expect(backend.autoInstallOnAppQuit).toBe(true);
  });

  it('checks on start and every six hours', async () => {
    vi.useFakeTimers();
    const { updater, backend } = setup();
    updater.start();
    expect(backend.checkForUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(backend.checkForUpdates).toHaveBeenCalledTimes(2);
    updater.stop();
    await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
    expect(backend.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('reports a new version, downloads it on request and installs on request', async () => {
    const { updater, backend, emit } = setup();
    emit('checking-for-update');
    expect(updater.state.status).toBe('checking');
    emit('update-available', { version: '0.2.0' });
    expect(updater.state).toEqual({ status: 'available', version: '0.2.0' });
    expect(backend.downloadUpdate).not.toHaveBeenCalled();

    await updater.download();
    expect(backend.downloadUpdate).toHaveBeenCalled();
    emit('download-progress', { percent: 42.7 });
    expect(updater.state).toEqual({ status: 'downloading', version: '0.2.0', percent: 42 });

    updater.install();
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
    emit('update-downloaded', { version: '0.2.0' });
    updater.install();
    expect(backend.quitAndInstall).toHaveBeenCalledWith(true, true);
  });

  it('does not let a periodic check undo a download', async () => {
    const { updater, backend, emit } = setup();
    emit('update-available', { version: '0.2.0' });
    await updater.download();
    await updater.check();
    emit('update-downloaded', { version: '0.2.0' });
    await updater.check();
    expect(backend.checkForUpdates).not.toHaveBeenCalled();
    expect(updater.state.status).toBe('downloaded');
  });

  describe('the update dialog (#39)', () => {
    const NOTES = [{ version: 'v0.2.0', sections: [] }];

    function withPrompt(options: { skipped?: string; notes?: () => Promise<typeof NOTES | null> } = {}) {
      const { backend, emit } = fakeBackend();
      // The real check announces the new version before it resolves.
      backend.checkForUpdates.mockImplementation(async () => {
        emit('update-available', { version: '0.2.0' });
        return null;
      });
      const fetchNotes = vi.fn(options.notes ?? (async () => NOTES));
      const updater = new Updater(backend as unknown as UpdaterBackend, () => undefined, {
        isSkipped: (version) => version === options.skipped,
        fetchNotes,
      });
      return { updater, backend, emit, fetchNotes };
    }

    it('opens after the startup check finds a version, with its notes', async () => {
      const { updater, fetchNotes } = withPrompt();
      updater.start();
      await vi.waitFor(() => expect(updater.state.prompt).toBe(true));
      expect(fetchNotes).toHaveBeenCalledWith('0.2.0');
      expect(updater.state).toEqual({ status: 'available', version: '0.2.0', prompt: true, notes: NOTES });
      updater.stop();
    });

    it('still opens, without notes, when they cannot be read', async () => {
      const { updater } = withPrompt({
        notes: async () => {
          throw new Error('offline');
        },
      });
      updater.start();
      await vi.waitFor(() => expect(updater.state.prompt).toBe(true));
      expect(updater.state.notes).toBeNull();
      updater.stop();
    });

    it('stays closed for a skipped version and after later checks', async () => {
      const skipped = withPrompt({ skipped: '0.2.0' });
      skipped.updater.start();
      await vi.waitFor(() => expect(skipped.updater.state.status).toBe('available'));
      await Promise.resolve();
      expect(skipped.updater.state.prompt).toBeUndefined();
      expect(skipped.fetchNotes).not.toHaveBeenCalled();
      skipped.updater.stop();

      const later = withPrompt();
      await later.updater.check();
      expect(later.updater.state).toEqual({ status: 'available', version: '0.2.0' });
    });

    it('closes when answered and when the download starts', async () => {
      const { updater } = withPrompt();
      updater.start();
      await vi.waitFor(() => expect(updater.state.prompt).toBe(true));
      updater.dismissPrompt();
      expect(updater.state.prompt).toBe(false);
      expect(updater.state.status).toBe('available');
      updater.stop();

      const downloading = withPrompt();
      downloading.updater.start();
      await vi.waitFor(() => expect(downloading.updater.state.prompt).toBe(true));
      await downloading.updater.download();
      expect(downloading.updater.state.prompt).toBeUndefined();
      downloading.updater.stop();
    });
  });

  it('reports this version as the latest and surfaces errors', async () => {
    const { updater, backend, emit, changes } = setup();
    emit('update-not-available', { version: '0.1.0' });
    expect(updater.state).toEqual({ status: 'not-available' });
    backend.checkForUpdates.mockRejectedValueOnce(new Error('offline'));
    await updater.check();
    expect(updater.state).toEqual({ status: 'error', version: undefined, error: 'unknown' });
    expect(changes.at(-1)).toEqual(updater.state);
  });
});
