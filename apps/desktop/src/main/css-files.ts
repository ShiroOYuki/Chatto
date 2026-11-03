import { DEFAULT_LOCALE, type Locale } from '@chatto/core';
import { ATTRIBUTE_REFERENCE, CLASS_REFERENCE, EVENT_REFERENCE, VARIABLE_REFERENCE } from '@chatto/chat-ui/reference';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import type { CssFileOpenResult, EditorLaunch } from '../shared/ipc';
import { mainMessages } from './messages';

/** Opens the theme folder as a workspace so the editor picks up `.vscode/settings.json`. */
export const DEFAULT_EDITOR_COMMAND = 'code "{folder}" "{file}"';
export const REFERENCE_FILE = 'chatto-reference.css';
const CUSTOM_DATA_FILE = 'chatto.css-data.json';
/** Editors such as VSCode save in several writes; wait for the file to settle before reading it. */
const SETTLE_MS = 120;
/** A command still running after this long is an editor that stays attached (e.g. Notepad++). */
const LAUNCH_GRACE_MS = 4000;
const THEME_ID = /^[\w-]+$/;

/** The theme a file in the folder belongs to; null for the reference and other files. */
export function themeIdOf(filename: string): string | null {
  const match = /^([\w-]+)\.css$/.exec(filename);
  return match && filename !== REFERENCE_FILE ? match[1]! : null;
}

/** Expands `{file}` / `{folder}` in the user's editor command; the file is appended when not mentioned. */
export function editorCommandLine(command: string, folder: string, file: string): string {
  const template = command.trim() || DEFAULT_EDITOR_COMMAND;
  const withFile = template.includes('{file}') ? template : `${template} "{file}"`;
  return withFile.replaceAll('{folder}', folder).replaceAll('{file}', file);
}

/** VSCode custom data (`css.customData`): describes the CSS variables Chatto sets. */
export function cssCustomData(locale: Locale = DEFAULT_LOCALE): object {
  return {
    version: 1.1,
    properties: VARIABLE_REFERENCE.map(({ name, description }) => ({ name, description: description[locale] })),
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
export function referenceCss(locale: Locale = DEFAULT_LOCALE): string {
  const m = mainMessages(locale).reference;
  const groups = [
    { title: m.classes, items: CLASS_REFERENCE, prefix: '' },
    { title: m.attributes, items: ATTRIBUTE_REFERENCE, prefix: '.chatto-message' },
    { title: m.events, items: EVENT_REFERENCE, prefix: '.chatto-message' },
  ];
  const lines = [
    '/*',
    ...m.header.map((line) => ` * ${line}`),
    ' */',
    '',
    `/* ${m.variables} */`,
    ...VARIABLE_REFERENCE.map(({ name, description }) => `/* ${name}${m.separator}${description[locale]} */`),
  ];
  for (const group of groups) {
    lines.push('', `/* ── ${group.title} ── */`, '');
    for (const item of group.items) {
      const selector = item.selector.startsWith('.') ? item.selector : `${group.prefix}${item.selector}`;
      lines.push(`/* ${item.label[locale]}${m.separator}${item.description[locale]} */`, `${selector} {}`, '');
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
  /** A theme's file was changed outside Chatto. */
  onExternalChange: (themeId: string, css: string) => void;
  run?: (commandLine: string) => Promise<number | null>;
  /** Opens a file with the system's default app; resolves false when that fails. */
  openWithSystem: (path: string) => Promise<boolean>;
  /** Language of the reference files (the interface language); Traditional Chinese by default. */
  locale?: () => Locale;
}

/**
 * Keeps each custom theme's CSS in a real file so it can be edited in VSCode.
 * The folder is watched for as long as Chatto runs: saving a file outside
 * Chatto reports it right away (the controller saves the theme), and Chatto
 * writes its own changes back. Both sides write through; the last write wins.
 */
export class CssFiles {
  #watcher: FSWatcher | null = null;
  #timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Each file's content as last written or read, so our own writes are not echoed back. */
  #known = new Map<string, string>();

  constructor(private readonly options: CssFilesOptions) {}

  get dir(): string {
    return this.options.dir;
  }

  pathFor(themeId: string): string {
    if (!THEME_ID.test(themeId)) throw new Error(`Invalid theme id ${themeId}`);
    return join(this.dir, `${themeId}.css`);
  }

  /** Watches the folder for outside edits. */
  start(): void {
    if (this.#watcher) return;
    mkdirSync(this.dir, { recursive: true });
    this.#watcher = watch(this.dir, (_event, filename) => {
      const themeId = filename ? themeIdOf(filename) : null;
      if (!themeId) return;
      clearTimeout(this.#timers.get(themeId));
      this.#timers.set(
        themeId,
        setTimeout(() => this.#readBack(themeId), SETTLE_MS),
      );
    });
  }

  stop(): void {
    this.#watcher?.close();
    this.#watcher = null;
    for (const timer of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }

  /** Writes the workspace files and the theme's CSS, then opens it in the user's editor. */
  async open(themeId: string, css: string, editorCommand: string): Promise<CssFileOpenResult> {
    this.#writeWorkspace();
    const path = this.pathFor(themeId);
    this.#write(themeId, css);
    const run = this.options.run ?? runShell;
    const code = await run(editorCommandLine(editorCommand, this.dir, path));
    let launched: EditorLaunch = 'editor';
    if (code !== 0 && code !== null) launched = (await this.options.openWithSystem(path)) ? 'system' : 'none';
    return { launched, path };
  }

  /**
   * Writes Chatto's CSS to the theme's file, if the theme has one (it was opened
   * in an editor before). Unchanged content is not rewritten.
   */
  write(themeId: string, css: string): void {
    if (existsSync(this.pathFor(themeId))) this.#write(themeId, css);
  }

  /**
   * Rewrites the editor reference files in the current interface language, if
   * they were written before (a theme was opened in an editor); call after the
   * interface language changes.
   */
  refreshReference(): void {
    if (existsSync(join(this.dir, REFERENCE_FILE))) this.#writeWorkspace();
  }

  /** Deletes a theme's file, e.g. when the theme itself is deleted. */
  remove(themeId: string): void {
    clearTimeout(this.#timers.get(themeId));
    this.#known.delete(themeId);
    rmSync(this.pathFor(themeId), { force: true });
  }

  #write(themeId: string, css: string): void {
    const path = this.pathFor(themeId);
    if (this.#known.get(themeId) === css && existsSync(path)) return;
    this.#known.set(themeId, css);
    writeFileSync(path, css);
  }

  #writeWorkspace(): void {
    mkdirSync(join(this.dir, '.vscode'), { recursive: true });
    writeFileSync(join(this.dir, '.vscode', 'settings.json'), `${JSON.stringify(workspaceSettings(), null, 2)}\n`);
    const locale = this.options.locale?.() ?? DEFAULT_LOCALE;
    writeFileSync(join(this.dir, '.vscode', CUSTOM_DATA_FILE), `${JSON.stringify(cssCustomData(locale), null, 2)}\n`);
    writeFileSync(join(this.dir, REFERENCE_FILE), referenceCss(locale));
  }

  #readBack(themeId: string): void {
    this.#timers.delete(themeId);
    let css: string;
    try {
      css = readFileSync(this.pathFor(themeId), 'utf8');
    } catch {
      return; // deleted or mid-replace; the next event reads it again
    }
    if (css === this.#known.get(themeId)) return;
    this.#known.set(themeId, css);
    this.options.onExternalChange(themeId, css);
  }
}
