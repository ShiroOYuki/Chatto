import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleState, type FakeApi } from '../../../../../../tests/fake-api';
import type { UpdateState } from '../../../shared/ipc';
import { api as mockedApi } from '../api';
import { UpdateDialog } from './UpdateDialog';
import { TooltipProvider } from './ui/tooltip';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

const text = (zh: string) => ({ en: zh, 'zh-TW': zh });
const NOTES = [
  {
    version: 'v0.4.0',
    date: '2026-11-20',
    sections: [
      { kind: 'new' as const, items: [text('雙擊 `.chattotheme` 檔就能匯入')] },
      { kind: 'fixed' as const, items: [text('預覽和 OBS 一致')] },
    ],
  },
  { version: 'v0.3.2', date: '2026-11-12', sections: [{ kind: 'improved' as const, items: [text('啟動更快')] }] },
];

function show(update: UpdateState) {
  render(
    <TooltipProvider>
      <UpdateDialog state={sampleState({ appInfo: { version: '0.3.1', platform: 'test' }, update })} />
    </TooltipProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('UpdateDialog', () => {
  it('lists what changed in every version up to the new one', () => {
    show({ status: 'available', version: '0.4.0', prompt: true, notes: NOTES });
    const dialog = screen.getByRole('dialog', { name: '有新版本 0.4.0' });
    expect(within(dialog).getByText('目前是 0.3.1')).toBeTruthy();
    const latest = within(dialog).getByRole('region', { name: 'v0.4.0' });
    expect(within(latest).getByRole('heading', { name: '新功能' })).toBeTruthy();
    expect(within(latest).getByText('.chattotheme').tagName).toBe('CODE');
    expect(within(dialog).getByRole('region', { name: 'v0.3.2' }).textContent).toContain('啟動更快');
  });

  it('offers the changelog page when the notes could not be read', async () => {
    show({ status: 'available', version: '0.4.0', prompt: true, notes: null });
    expect(screen.getByText('讀不到這一版的更新內容')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '查看更新內容' }));
    expect(api.openExternal).toHaveBeenCalledWith('https://chattolive.com/zh-tw/changelog');
  });

  it('closes, skips or updates', async () => {
    show({ status: 'available', version: '0.4.0', prompt: true, notes: NOTES });
    const dialog = screen.getByRole('dialog');
    const footer = within(dialog).getAllByRole('button', { name: '關閉' }).at(-1)!;
    await userEvent.click(footer);
    expect(api.dismissUpdatePrompt).toHaveBeenLastCalledWith(false);
    await userEvent.click(within(dialog).getByRole('button', { name: '略過此版本' }));
    expect(api.dismissUpdatePrompt).toHaveBeenLastCalledWith(true);
    await userEvent.click(within(dialog).getByRole('button', { name: '更新' }));
    expect(api.downloadUpdate).toHaveBeenCalled();
  });

  it('stays closed unless the startup check asked for it', () => {
    show({ status: 'available', version: '0.4.0' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
