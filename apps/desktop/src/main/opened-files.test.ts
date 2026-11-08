import { describe, expect, it, vi } from 'vitest';
import { join, resolve } from 'node:path';
import type { ChatTheme } from '@chatto/core';
import { MAX_OPENED_FILE_BYTES, OpenedThemeFiles, themeFilesFromArgv } from './opened-files';

// Absolute on every system the tests run on.
const CWD = resolve('/users/ciel/downloads');
const THEME = resolve('/themes/Matcha.chattotheme');

describe('themeFilesFromArgv', () => {
  const exists = (path: string) => !path.includes('missing');

  it('finds the theme file of an installed app launch', () => {
    expect(themeFilesFromArgv(['C:\\Chatto\\Chatto.exe', THEME], CWD, exists)).toEqual([THEME]);
  });

  it('skips the program, Electron switches, the app folder and other files', () => {
    const argv = [
      'electron.exe',
      '--allow-file-access-from-files',
      '.',
      resolve('/notes.txt'),
      THEME,
      '--inspect=9229',
    ];
    expect(themeFilesFromArgv(argv, CWD, exists)).toEqual([THEME]);
  });

  it('accepts any letter case, resolves relative paths and drops duplicates and missing files', () => {
    const argv = ['Chatto.exe', 'Bubble.CHATTOTHEME', join(CWD, 'Bubble.CHATTOTHEME'), 'missing.chattotheme'];
    expect(themeFilesFromArgv(argv, CWD, exists)).toEqual([join(CWD, 'Bubble.CHATTOTHEME')]);
  });

  it('is empty for a plain launch', () => {
    expect(themeFilesFromArgv(['Chatto.exe'], CWD, exists)).toEqual([]);
    expect(themeFilesFromArgv([], CWD, exists)).toEqual([]);
  });
});

describe('OpenedThemeFiles', () => {
  const theme = { id: 'from-file', name: 'Matcha' } as ChatTheme;

  function setup(read: (path: string) => Uint8Array = () => new Uint8Array([1])) {
    const onChange = vi.fn();
    const unpack = vi.fn((bytes: Uint8Array) => {
      if (bytes[0] === 0) throw new Error('Not a valid theme package');
      return theme;
    });
    const files = new OpenedThemeFiles({
      read,
      unpack,
      unreadable: () => 'unreadable',
      tooLarge: () => 'too large',
      onChange,
    });
    return { files, onChange, unpack };
  }

  it('queues each file with its theme, in order, and tells once per batch', () => {
    const { files, onChange } = setup();
    files.add([THEME, resolve('/themes/Washi.chattotheme')]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(files.list.map((file) => file.fileName)).toEqual(['Matcha.chattotheme', 'Washi.chattotheme']);
    expect(files.list[0]!.theme).toBe(theme);
    expect(new Set(files.list.map((file) => file.id)).size).toBe(2);
  });

  it('keeps a broken file with its error instead of the theme', () => {
    const { files } = setup((path) => {
      if (path.includes('gone')) throw new Error('ENOENT');
      if (path.includes('huge')) return new Uint8Array(MAX_OPENED_FILE_BYTES + 1);
      return new Uint8Array([0]);
    });
    files.add(['gone.chattotheme', 'huge.chattotheme', 'bad.chattotheme']);
    expect(files.list.map((file) => [file.theme, file.error])).toEqual([
      [undefined, 'unreadable'],
      [undefined, 'too large'],
      [undefined, 'Not a valid theme package'],
    ]);
  });

  it('removes a file once it is answered', () => {
    const { files, onChange } = setup();
    files.add([THEME]);
    files.dismiss(files.list[0]!.id);
    expect(files.list).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
    files.dismiss('unknown');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
