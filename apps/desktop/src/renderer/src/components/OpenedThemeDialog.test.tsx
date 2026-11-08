import { PRESET_THEMES } from '@chatto/chat-ui';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleState, type FakeApi } from '../../../../../../tests/fake-api';
import type { AppState, OpenedThemeFile } from '../../../shared/ipc';
import { api as mockedApi } from '../api';
import { OpenedThemeDialog } from './OpenedThemeDialog';
import { TooltipProvider } from './ui/tooltip';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

const THEME = { ...PRESET_THEMES[2]!, id: 'shared-bubble', name: '泡泡分享版', builtIn: false };
const OK: OpenedThemeFile = { id: 'opened-1', fileName: 'Bubble.chattotheme', theme: THEME };
const BROKEN: OpenedThemeFile = { id: 'opened-2', fileName: 'broken.chattotheme', error: '不是有效的主題包' };

function show(openedThemeFiles: OpenedThemeFile[], patch: Partial<AppState> = {}) {
  const view = (state: AppState) => (
    <TooltipProvider>
      <OpenedThemeDialog state={state} />
    </TooltipProvider>
  );
  const result = render(view(sampleState({ openedThemeFiles, ...patch })));
  return { rerender: (next: Partial<AppState>) => result.rerender(view(sampleState({ openedThemeFiles, ...next }))) };
}

beforeEach(() => vi.clearAllMocks());

describe('OpenedThemeDialog', () => {
  it('shows the file’s theme and saves a new copy only on Import', async () => {
    const { rerender } = show([OK, BROKEN]);
    const dialog = screen.getByRole('dialog', { name: '匯入主題' });
    expect(within(dialog).getByText('來自 Bubble.chattotheme')).toBeTruthy();
    expect(within(dialog).getByText('泡泡分享版')).toBeTruthy();
    expect(within(dialog).getByText('之後還有 1 個檔案')).toBeTruthy();
    expect(api.saveTheme).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '匯入' }));
    const saved = api.saveTheme.mock.calls[0]![0];
    expect(saved).toMatchObject({ name: '泡泡分享版（匯入）', builtIn: false });
    expect(saved.id).not.toBe(THEME.id);
    expect(api.dismissOpenedThemeFile).toHaveBeenCalledWith('opened-1');

    // Then it offers to put the new theme to use.
    rerender({ openedThemeFiles: [BROKEN], themes: [...sampleState().themes, saved] });
    expect(await screen.findByText('已匯入「泡泡分享版（匯入）」')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'OBS' }));
    expect(api.selectTheme).toHaveBeenCalledWith('embed', saved.id);
    await userEvent.click(screen.getByRole('button', { name: '完成' }));
    // The next file comes up.
    expect(await screen.findByText('來自 broken.chattotheme')).toBeTruthy();
  });

  it('cancels without saving', async () => {
    show([OK]);
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(api.dismissOpenedThemeFile).toHaveBeenCalledWith('opened-1');
    expect(api.saveTheme).not.toHaveBeenCalled();
  });

  it('says why a file cannot be imported', async () => {
    show([BROKEN]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('alert').textContent).toContain('無法匯入這個檔案');
    expect(within(dialog).getByRole('alert').textContent).toContain('不是有效的主題包');
    expect(within(dialog).queryByRole('button', { name: '匯入' })).toBeNull();
    await userEvent.click(within(dialog).getAllByRole('button', { name: '關閉' }).at(-1)!);
    expect(api.dismissOpenedThemeFile).toHaveBeenCalledWith('opened-2');
  });

  it('stays closed when no file is waiting', () => {
    show([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
