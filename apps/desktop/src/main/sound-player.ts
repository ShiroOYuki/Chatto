import type { SoundSetting } from '@chatto/core';
import { BrowserWindow } from 'electron';

/** Long enough for any reminder sound; the window is gone after that. */
const PLAYER_LIFETIME_MS = 15_000;

/**
 * Plays the quiet-spell reminder when the control panel window is not there
 * (released to the tray, #57). Main has no audio, so a hidden window with a
 * tiny page (`renderer/sound.html`) plays it and is destroyed soon after.
 */
export class SoundPlayer {
  #window: BrowserWindow | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;

  /** `load` points the window at the sound page with the given query. */
  constructor(private readonly load: (window: BrowserWindow, query: Record<string, string>) => Promise<void>) {}

  play(sound: SoundSetting, port: number): void {
    this.stop();
    const window = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      skipTaskbar: true,
      webPreferences: { sandbox: true, contextIsolation: true, autoplayPolicy: 'no-user-gesture-required' },
    });
    window.on('closed', () => {
      if (this.#window === window) this.#window = null;
    });
    this.#window = window;
    this.#timer = setTimeout(() => this.stop(), PLAYER_LIFETIME_MS);
    void this.load(window, { sound: JSON.stringify(sound), port: String(port) }).catch((error: unknown) =>
      console.error('[chatto] sound player failed', error),
    );
  }

  stop(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    if (this.#window && !this.#window.isDestroyed()) this.#window.destroy();
    this.#window = null;
  }
}
