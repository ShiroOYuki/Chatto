/**
 * Decides when the control panel window, out of sight, is replaced to free
 * its memory (#57): hidden in the tray it is closed (opening Chatto builds a
 * new one); minimized it is rebuilt minimized with a fresh renderer, because
 * Chromium keeps the memory heavy pages once used. The overlay, OBS and
 * alerts keep running in the main process.
 *
 * The release happens only after the window stayed out of sight for
 * `delayMs`, so a quick trip costs nothing, and never while it holds unsaved
 * work (an edited theme).
 */
export class WindowRelease {
  #timer: ReturnType<typeof setTimeout> | null = null;
  #hidden = false;
  #unsaved = false;

  constructor(private readonly options: { delayMs: number; release: () => void }) {}

  /** The window went out of sight (to the tray, or minimized). */
  hidden(): void {
    this.#hidden = true;
    this.#schedule();
  }

  /** The window is showing again (or was released). */
  shown(): void {
    this.#hidden = false;
    this.#cancel();
  }

  setUnsaved(unsaved: boolean): void {
    this.#unsaved = unsaved;
    if (unsaved) this.#cancel();
    else this.#schedule();
  }

  #schedule(): void {
    this.#cancel();
    if (!this.#hidden || this.#unsaved) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#hidden = false;
      this.options.release();
    }, this.options.delayMs);
  }

  #cancel(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
