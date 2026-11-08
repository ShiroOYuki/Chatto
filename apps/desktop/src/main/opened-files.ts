import { basename, isAbsolute, resolve } from 'node:path';
import type { ChatTheme } from '@chatto/core';
import type { OpenedThemeFile } from '../shared/ipc';
import { THEME_PACKAGE_EXTENSION } from './theme-package';

/** A package holds at most 64 entries of a few MB; anything this big is not one. */
export const MAX_OPENED_FILE_BYTES = 64 * 1024 * 1024;

/**
 * The `.chattotheme` files in a command line: what Windows passes when the user opens such
 * a file with Chatto (#40), on first launch (`process.argv`) or to the running copy
 * (`second-instance`). The program itself, switches Electron or Chromium add, other files
 * and files that do not exist are left out; relative paths count from `cwd`.
 */
export function themeFilesFromArgv(argv: readonly string[], cwd: string, exists: (path: string) => boolean): string[] {
  const files: string[] = [];
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    if (!arg.toLowerCase().endsWith(`.${THEME_PACKAGE_EXTENSION}`)) continue;
    const path = isAbsolute(arg) ? arg : resolve(cwd, arg);
    if (!files.includes(path) && exists(path)) files.push(path);
  }
  return files;
}

export interface OpenedThemeFilesOptions {
  /** The file's bytes; throws when it cannot be read. */
  read: (path: string) => Uint8Array;
  /** Stores the package's images and returns its theme (`AppController.importThemePackage`). */
  unpack: (bytes: Uint8Array) => ChatTheme;
  /** Text for a file that could not be read at all. */
  unreadable: () => string;
  /** Text for a file too large to be a theme package. */
  tooLarge: () => string;
  onChange: () => void;
}

/**
 * Theme files opened from Windows, waiting in the control panel for the user to import or
 * cancel them, one at a time. Each file is read once, when it arrives: a broken one waits with
 * its error, so the dialog can say what went wrong.
 */
export class OpenedThemeFiles {
  #files: OpenedThemeFile[] = [];
  #next = 1;

  constructor(private readonly options: OpenedThemeFilesOptions) {}

  get list(): OpenedThemeFile[] {
    return this.#files;
  }

  add(paths: readonly string[]): void {
    if (!paths.length) return;
    for (const path of paths) this.#files.push(this.#open(path));
    this.options.onChange();
  }

  dismiss(id: string): void {
    const before = this.#files.length;
    this.#files = this.#files.filter((file) => file.id !== id);
    if (this.#files.length !== before) this.options.onChange();
  }

  #open(path: string): OpenedThemeFile {
    const file = { id: `opened-${this.#next++}`, fileName: basename(path) };
    let bytes: Uint8Array;
    try {
      bytes = this.options.read(path);
    } catch {
      return { ...file, error: this.options.unreadable() };
    }
    if (bytes.byteLength > MAX_OPENED_FILE_BYTES) return { ...file, error: this.options.tooLarge() };
    try {
      return { ...file, theme: this.options.unpack(bytes) };
    } catch (error) {
      return { ...file, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
