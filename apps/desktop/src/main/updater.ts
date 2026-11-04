import type { AppUpdater } from 'electron-updater';
import type { UpdateErrorKind, UpdateState } from '../shared/ipc';

/** Checks again this often while Chatto keeps running (streamers often leave it open for days). */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const NETWORK_ERROR = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|net::ERR_/;

/**
 * Sorts an electron-updater error into what the user is told. Its messages can carry
 * whole HTTP responses (headers, cookies), so they go to the log, never to the screen.
 */
export function updateErrorKind(error: unknown): UpdateErrorKind {
  const { statusCode, code, message } = (error ?? {}) as { statusCode?: unknown; code?: unknown; message?: unknown };
  const text = typeof message === 'string' ? message : String(error);
  // No published release (or no latest.yml in it) answers 404.
  if (statusCode === 404 || /^404\b/.test(text)) return 'not-found';
  if (NETWORK_ERROR.test(`${typeof code === 'string' ? code : ''} ${text}`)) return 'network';
  return 'unknown';
}

/** The part of electron-updater's `autoUpdater` this module uses, so tests can fake it. */
export type UpdaterBackend = Pick<AppUpdater, 'checkForUpdates' | 'downloadUpdate' | 'quitAndInstall' | 'on'> & {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
};

/**
 * Finds new versions on GitHub Releases. It only asks: downloading waits for the
 * user, and installing waits for a restart they choose or for quitting Chatto,
 * so an update never cuts into a stream.
 */
export class Updater {
  #state: UpdateState;
  #timer: ReturnType<typeof setInterval> | null = null;

  /** `backend` is null where updates do not apply (development builds). */
  constructor(
    private readonly backend: UpdaterBackend | null,
    private readonly onChange: (state: UpdateState) => void = () => undefined,
  ) {
    this.#state = backend ? { status: 'idle' } : { status: 'unsupported' };
    if (!backend) return;
    backend.autoDownload = false;
    backend.autoInstallOnAppQuit = true;
    backend.on('checking-for-update', () => this.#set({ status: 'checking' }));
    backend.on('update-available', (info) => this.#set({ status: 'available', version: info.version }));
    backend.on('update-not-available', () => this.#set({ status: 'not-available' }));
    backend.on('download-progress', (progress) =>
      this.#set({ status: 'downloading', version: this.#state.version, percent: Math.floor(progress.percent) }),
    );
    backend.on('update-downloaded', (info) => this.#set({ status: 'downloaded', version: info.version }));
    backend.on('error', (error) => this.#fail(error));
  }

  get state(): UpdateState {
    return this.#state;
  }

  /** Checks now and then every `UPDATE_CHECK_INTERVAL_MS`. */
  start(): void {
    if (!this.backend || this.#timer) return;
    void this.check();
    this.#timer = setInterval(() => void this.check(), UPDATE_CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
  }

  async check(): Promise<void> {
    if (!this.backend) return;
    // A check must not undo a download that is running or waiting to be installed.
    const { status } = this.#state;
    if (status === 'checking' || status === 'downloading' || status === 'downloaded') return;
    try {
      await this.backend.checkForUpdates();
    } catch (error) {
      this.#fail(error);
    }
  }

  async download(): Promise<void> {
    if (!this.backend || this.#state.status !== 'available') return;
    this.#set({ status: 'downloading', version: this.#state.version, percent: 0 });
    try {
      await this.backend.downloadUpdate();
    } catch (error) {
      this.#fail(error);
    }
  }

  /** Quits, installs silently and starts the new version. */
  install(): void {
    if (this.backend && this.#state.status === 'downloaded') this.backend.quitAndInstall(true, true);
  }

  #fail(error: unknown): void {
    console.error('[chatto] update failed', error);
    this.#set({ status: 'error', version: this.#state.version, error: updateErrorKind(error) });
  }

  #set(state: UpdateState): void {
    this.#state = state;
    this.onChange(state);
  }
}
