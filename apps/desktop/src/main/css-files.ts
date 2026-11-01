import { ATTRIBUTE_REFERENCE, CLASS_REFERENCE, EVENT_REFERENCE, VARIABLE_REFERENCE } from '@chatto/chat-ui/reference';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { basename, join } from 'node:path';
import type { CssFileOpenResult, EditorLaunch } from '../shared/ipc';

/** Opens the theme folder as a workspace so the editor picks up `.vscode/settings.json`. */
export const DEFAULT_EDITOR_COMMAND = 'code "{folder}" "{file}"';
export const REFERENCE_FILE = 'chatto-reference.css';
const CUSTOM_DATA_FILE = 'chatto.css-data.json';
/** Editors such as VSCode save in several writes; wait for the file to settle before reading it. */
const SETTLE_MS = 120;
/** A command still running after this long is an editor that stays attached (e.g. Notepad++). */
const LAUNCH_GRACE_MS = 4000;

/** Expands `{file}` / `{folder}` in the user's editor command; the file is appended when not mentioned. */
export function editorCommandLine(command: string, folder: string, file: string): string {
  const template = command.trim() || DEFAULT_EDITOR_COMMAND;
  const withFile = template.includes('{file}') ? template : `${template} "{file}"`;
  return withFile.replaceAll('{folder}', folder).replaceAll('{file}', file);
}

/** VSCode custom data (`css.customData`): describes the CSS variables Chatto sets. */
export function cssCustomData(): object {
  return {
    version: 1.1,
    properties: VARIABLE_REFERENCE.map(({ name, description }) => ({ name, description })),
  };
}

export function workspaceSettings(): object {
  return {
    'css.customData': [`.vscode/${CUSTOM_DATA_FILE}`],
    // The reference file lists every selector as an empty rule.
    'css.lint.emptyRules': 'ignore',
  };
}

/** Every public selector as an empty rule with its description, for browsing and copying. */
export function referenceCss(): string {
  const groups = [
    { title: '元件', items: CLASS_REFERENCE, prefix: '' },
    {
      title: '條件（加在 .chatto-message 或 .chatto-notice 後面）',
      items: ATTRIBUTE_REFERENCE,
      prefix: '.chatto-message',
    },
    { title: '平台事件', items: EVENT_REFERENCE, prefix: '.chatto-message' },
  ];
  const lines = [
    '/*',
    ' * Chatto 自訂 CSS 參考，由 Chatto 自動產生，修改不會保留。',
    ' * 每個主題的自訂 CSS 是這個資料夾裡的「主題 id.css」，在主題編輯器開著時會和 Chatto 同步。',
    ' */',
    '',
    '/* CSS 變數 */',
    ...VARIABLE_REFERENCE.map(({ name, description }) => `/* ${name}：${description} */`),
  ];
  for (const group of groups) {
    lines.push('', `/* ── ${group.title} ── */`, '');
    for (const item of group.items) {
      const selector = item.selector.startsWith('.') ? item.selector : `${group.prefix}${item.selector}`;
      lines.push(`/* ${item.label}：${item.description} */`, `${selector} {}`, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Runs a shell command line; resolves with its exit code, or null if it is still running. */
function runShell(commandLine: string): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn(commandLine, { shell: true, detached: true, stdio: 'ignore', windowsHide: true });
    const timer = setTimeout(() => {
      child.unref();
      resolve(null);
    }, LAUNCH_GRACE_MS);
    child.once('error', () => {
      clearTimeout(timer);
      resolve(-1);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve(code ?? -1);
    });
  });
}

export interface CssFilesOptions {
  /** Folder holding one `<theme id>.css` per theme plus the editor workspace files. */
  dir: string;
  /** The open theme's file was changed outside Chatto. */
  onExternalChange: (themeId: string, css: string) => void;
  run?: (commandLine: string) => Promise<number | null>;
  /** Opens a file with the system's default app; resolves false when that fails. */
  openWithSystem: (path: string) => Promise<boolean>;
}

/**
 * Mirrors the custom CSS of the theme being edited to a real file so it can be
 * edited in VSCode. Only one theme syncs at a time, while its editor is open;
 * both sides write through, and the last write wins.
 */
export class CssFiles {
  #watcher: FSWatcher | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #themeId: string | null = null;
  /** The file content as last written or read, so our own writes are not echoed back. */
  #known = '';

  constructor(private readonly options: CssFilesOptions) {}

  get dir(): string {
    return this.options.dir;
  }

  pathFor(themeId: string): string {
    if (!/^[\w-]+$/.test(themeId)) throw new Error(`Invalid theme id ${themeId}`);
    return join(this.dir, `${themeId}.css`);
  }

  /** Starts syncing the theme and opens its file in the user's editor. */
  async open(themeId: string, css: string, editorCommand: string): Promise<CssFileOpenResult> {
    this.sync(themeId, css);
    const path = this.pathFor(themeId);
    const run = this.options.run ?? runShell;
    const code = await run(editorCommandLine(editorCommand, this.dir, path));
    let launched: EditorLaunch = 'editor';
    if (code !== 0 && code !== null) launched = (await this.options.openWithSystem(path)) ? 'system' : 'none';
    return { launched, path };
  }

  /** Writes the workspace files and the theme's CSS, then watches the file for outside edits. */
  sync(themeId: string, css: string): void {
    this.close();
    const path = this.pathFor(themeId);
    mkdirSync(join(this.dir, '.vscode'), { recursive: true });
    writeFileSync(join(this.dir, '.vscode', 'settings.json'), `${JSON.stringify(workspaceSettings(), null, 2)}\n`);
    writeFileSync(join(this.dir, '.vscode', CUSTOM_DATA_FILE), `${JSON.stringify(cssCustomData(), null, 2)}\n`);
    writeFileSync(join(this.dir, REFERENCE_FILE), referenceCss());
    this.#themeId = themeId;
    this.#known = css;
    writeFileSync(path, css);
    const name = basename(path);
    this.#watcher = watch(this.dir, (_event, filename) => {
      if (filename !== name) return;
      if (this.#timer) clearTimeout(this.#timer);
      this.#timer = setTimeout(() => this.#readBack(themeId, path), SETTLE_MS);
    });
  }

  /** Writes the app's latest CSS to the file of the theme being synced. */
  write(themeId: string, css: string): void {
    if (themeId !== this.#themeId || css === this.#known) return;
    this.#known = css;
    writeFileSync(this.pathFor(themeId), css);
  }

  /** Stops syncing; with a theme id, only if that theme is the one syncing. */
  close(themeId?: string): void {
    if (themeId !== undefined && themeId !== this.#themeId) return;
    this.#watcher?.close();
    this.#watcher = null;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#themeId = null;
  }

  /** Deletes a theme's file, e.g. when the theme itself is deleted. */
  remove(themeId: string): void {
    this.close(themeId);
    rmSync(this.pathFor(themeId), { force: true });
  }

  #readBack(themeId: string, path: string): void {
    if (themeId !== this.#themeId) return;
    let css: string;
    try {
      css = readFileSync(path, 'utf8');
    } catch {
      return; // deleted or mid-replace; the next event reads it again
    }
    if (css === this.#known) return;
    this.#known = css;
    this.options.onExternalChange(themeId, css);
  }
}
