import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleState, type FakeApi } from '../../../../../../tests/fake-api';
import { emptyShortcuts } from '../../../shared/shortcuts';
import { api as mockedApi } from '../api';
import { TooltipProvider } from '../components/ui/tooltip';
import { ShortcutsTile } from './ShortcutsTile';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

function show(bindings = emptyShortcuts(), failed: (keyof typeof bindings)[] = []) {
  render(
    <TooltipProvider>
      <ShortcutsTile state={sampleState({ shortcuts: { bindings, failed } })} />
    </TooltipProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ShortcutsTile', () => {
  it('records the keys pressed and saves them', async () => {
    show();
    const field = screen.getByRole('button', { name: '設定「暫停／恢復新訊息」的快捷鍵' });
    expect(field.textContent).toBe('未設定');
    await userEvent.click(field);
    expect(field.textContent).toBe('按下按鍵…');
    await userEvent.keyboard('{Control>}{Alt>}p{/Alt}{/Control}');
    expect(api.setShortcut).toHaveBeenCalledWith('togglePause', 'Ctrl+Alt+P');
  });

  it('refuses a key without a modifier, and Escape cancels', async () => {
    show();
    const field = screen.getByRole('button', { name: '設定「清空畫面上的聊天」的快捷鍵' });
    await userEvent.click(field);
    await userEvent.keyboard('a');
    expect(screen.getByRole('alert').textContent).toContain('要搭配 Ctrl、Alt 或 Win');
    await userEvent.click(field);
    await userEvent.keyboard('{Escape}');
    expect(field.textContent).toBe('未設定');
    expect(api.setShortcut).not.toHaveBeenCalled();
  });

  it('says which action already has the keys, or that another program holds them', async () => {
    show({ ...emptyShortcuts(), togglePause: 'Ctrl+Alt+P' }, ['togglePause']);
    expect(screen.getByRole('button', { name: '設定「暫停／恢復新訊息」的快捷鍵' }).textContent).toBe('Ctrl + Alt + P');
    expect(screen.getByRole('alert').textContent).toContain('被其他程式使用中');

    api.setShortcut.mockResolvedValueOnce({ ok: false, reason: 'duplicate', action: 'togglePause' });
    await userEvent.click(screen.getByRole('button', { name: '設定「清空畫面上的聊天」的快捷鍵' }));
    await userEvent.keyboard('{Control>}{Alt>}p{/Alt}{/Control}');
    expect(await screen.findByText('已經用在「暫停／恢復新訊息」')).toBeTruthy();
  });

  it('clears a shortcut', async () => {
    show({ ...emptyShortcuts(), toggleOverlay: 'F9' });
    await userEvent.click(screen.getByRole('button', { name: '清除「顯示／隱藏桌面 Overlay」的快捷鍵' }));
    expect(api.setShortcut).toHaveBeenCalledWith('toggleOverlay', '');
  });
});
