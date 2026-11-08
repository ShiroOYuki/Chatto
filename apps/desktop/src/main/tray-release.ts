/**
 * Decides when the control panel window, hidden in the tray, is closed for
 * real to free its memory (#57). The overlay, OBS and alerts keep running in
 * the main process; opening Chatto from the tray builds a new window.
 *
 * The window is released only after it has stayed hidden for `delayMs`, so a
 * quick trip to the tray costs nothing, and never while it holds unsaved
 * work (an edited theme).
 */
export class TrayRelease {
  #timer: ReturnType<typeof setTimeout> | null = null;
  #hidden = false;
  #unsaved = false;

  constructor(private readonly options: { delayMs: number; release: () => void }) {}

  /** The window went to the tray. */
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
