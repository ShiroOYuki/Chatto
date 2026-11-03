import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CssFiles, editorCommandLine, referenceCss, REFERENCE_FILE, themeIdOf, workspaceSettings } from './css-files';

let dir = '';
let files: CssFiles;
const onExternalChange = vi.fn();
const run = vi.fn(async (_commandLine: string): Promise<number | null> => 0);
const openWithSystem = vi.fn(async (_path: string) => true);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'chatto-css-'));
  files = new CssFiles({ dir, onExternalChange, run, openWithSystem });
});
afterEach(() => {
  files.stop();
  rmSync(dir, { recursive: true, force: true });
});

/** Gives the watcher time to deliver (or not deliver) events. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 400));

describe('editorCommandLine', () => {
  it('opens the folder and the file in VSCode by default', () => {
    expect(editorCommandLine('', 'C:\\css', 'C:\\css\\a.css')).toBe('code "C:\\css" "C:\\css\\a.css"');
  });

  it('fills in placeholders, or appends the file when none is given', () => {
    expect(editorCommandLine('cursor -r "{file}"', 'D', 'D\\a.css')).toBe('cursor -r "D\\a.css"');
    expect(editorCommandLine('notepad++', 'D', 'D\\a.css')).toBe('notepad++ "D\\a.css"');
  });
});

describe('workspace files', () => {
  it('points VSCode at the generated custom data', () => {
    expect(workspaceSettings()).toMatchObject({ 'css.customData': ['.vscode/chatto.css-data.json'] });
  });

  it('lists every public selector in the reference', () => {
    const css = referenceCss();
    expect(css).toContain('.chatto-author {}');
    expect(css).toContain('.chatto-message[data-roles~="moderator"] {}');
    expect(css).toContain('.chatto-message[data-event="twitch:cheer"] {}');
    expect(css).toContain('--chatto-user-color');
  });

  it('writes the reference in the interface language', () => {
    expect(referenceCss('zh-TW')).toContain('/* CSS 變數 */');
    const css = referenceCss();
    expect(css).toContain('/* CSS variables */');
    expect(css).not.toContain('[object Object]');
    expect(css).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('maps theme files to theme ids and skips everything else', () => {
    expect(themeIdOf('custom-a.css')).toBe('custom-a');
    expect(themeIdOf(REFERENCE_FILE)).toBeNull();
    expect(themeIdOf('notes.txt')).toBeNull();
    expect(themeIdOf('custom-a.css~')).toBeNull();
  });
});

describe('CssFiles', () => {
  it('writes the theme file and the workspace, then opens the editor', async () => {
    const result = await files.open('custom-a', '.chatto-root { color: red; }', '');
    const path = join(dir, 'custom-a.css');
    expect(result).toEqual({ launched: 'editor', path });
    expect(readFileSync(path, 'utf8')).toBe('.chatto-root { color: red; }');
    expect(existsSync(join(dir, '.vscode', 'settings.json'))).toBe(true);
    expect(existsSync(join(dir, '.vscode', 'chatto.css-data.json'))).toBe(true);
    expect(existsSync(join(dir, REFERENCE_FILE))).toBe(true);
    expect(run).toHaveBeenCalledWith(`code "${dir}" "${path}"`);
    expect(openWithSystem).not.toHaveBeenCalled();
  });

  it('treats an editor that keeps running as opened', async () => {
    run.mockResolvedValueOnce(null);
    expect((await files.open('custom-a', '', '')).launched).toBe('editor');
  });

  it('falls back to the system app when the editor command fails', async () => {
    run.mockResolvedValueOnce(1);
    expect((await files.open('custom-a', '', '')).launched).toBe('system');
    run.mockResolvedValueOnce(9009);
    openWithSystem.mockResolvedValueOnce(false);
    expect((await files.open('custom-a', '', '')).launched).toBe('none');
  });

  it('rejects theme ids that are not plain file names', () => {
    expect(() => files.pathFor('../settings')).toThrow();
  });

  it('writes saved CSS only to themes that already have a file', async () => {
    await files.open('custom-a', 'a', '');
    files.write('custom-a', 'b');
    files.write('custom-b', 'x');
    expect(readFileSync(join(dir, 'custom-a.css'), 'utf8')).toBe('b');
    expect(existsSync(join(dir, 'custom-b.css'))).toBe(false);
  });

  it('reports outside saves of any theme file, but not its own writes', async () => {
    files.start();
    await files.open('custom-a', 'a', '');
    files.write('custom-a', 'b');
    writeFileSync(join(dir, 'custom-c.css'), '.chatto-body { color: blue; }');
    await vi.waitFor(() => expect(onExternalChange).toHaveBeenCalledWith('custom-c', '.chatto-body { color: blue; }'));
    await settle();
    expect(onExternalChange).toHaveBeenCalledTimes(1);
  });

  it('ignores the reference file and stops after stop()', async () => {
    files.start();
    writeFileSync(join(dir, REFERENCE_FILE), '/* edited */');
    await settle();
    files.stop();
    writeFileSync(join(dir, 'custom-a.css'), 'changed');
    await settle();
    expect(onExternalChange).not.toHaveBeenCalled();
  });

  it('deletes the file with its theme', async () => {
    await files.open('custom-a', 'a', '');
    files.remove('custom-a');
    expect(existsSync(join(dir, 'custom-a.css'))).toBe(false);
  });
});
