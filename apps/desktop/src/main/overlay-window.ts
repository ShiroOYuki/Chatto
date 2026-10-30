import { BrowserWindow, screen } from 'electron';
import type { Rect } from './settings';

/**
 * The transparent desktop overlay: frameless, always on top, click-through.
 * In edit mode it accepts the mouse so the streamer can move and resize it.
 * Note: exclusive-fullscreen games draw above every window; use borderless.
 */
export class OverlayWindow {
  #window: BrowserWindow | null = null;
  #editing = false;

  constructor(
    private readonly url: string,
    private readonly onBoundsChanged: (bounds: Rect) => void,
  ) {}

  get isOpen(): boolean {
    return this.#window !== null && !this.#window.isDestroyed();
  }

  get editing(): boolean {
    return this.#editing;
  }

  open(bounds?: Rect): void {
    if (this.isOpen) return;
    const area = screen.getPrimaryDisplay().workArea;
    const initial = bounds ?? { width: 420, height: 560, x: area.x + area.width - 440, y: area.y + area.height - 600 };

    const window = new BrowserWindow({
      ...initial,
      transparent: true,
      frame: false,
      resizable: true,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      focusable: false,
      backgroundColor: '#00000000',
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    window.setAlwaysOnTop(true, 'screen-saver');
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setIgnoreMouseEvents(true, { forward: true });

    const save = () => {
      if (!window.isDestroyed()) this.onBoundsChanged(window.getBounds());
    };
    window.on('moved', save);
    window.on('resized', save);
    window.on('closed', () => {
      this.#window = null;
      this.#editing = false;
    });

    void window.loadURL(this.url);
    this.#window = window;
  }

  close(): void {
    if (this.isOpen) this.#window!.close();
    this.#window = null;
  }

  setEditing(editing: boolean): void {
    this.#editing = editing;
    const window = this.#window;
    if (!window || window.isDestroyed()) return;
    window.setFocusable(editing);
    window.setIgnoreMouseEvents(!editing, { forward: true });
    // The viewer shows a dashed frame and a drag region while editing.
    void window.webContents.executeJavaScript(
      `document.body.toggleAttribute('data-edit', ${editing ? 'true' : 'false'})`,
    );
    if (editing) window.focus();
  }
}
