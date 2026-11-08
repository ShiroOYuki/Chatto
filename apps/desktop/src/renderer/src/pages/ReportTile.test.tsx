import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../../tests/fake-api';
import { api as mockedApi } from '../api';
import { ReportTile } from './ReportTile';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

describe('ReportTile', () => {
  it('lists what the export holds and leaves the channel out by default', async () => {
    render(<ReportTile version="0.3.0" />);
    await userEvent.click(screen.getByRole('button', { name: '匯出' }));
    const dialog = await screen.findByRole('dialog', { name: '匯出診斷資訊' });
    expect(dialog.textContent).toContain('聊天訊息');
    expect(screen.getByRole('switch', { name: '包含頻道名稱' }).getAttribute('aria-checked')).toBe('false');

    const buttons = screen.getAllByRole('button', { name: '匯出' });
    await userEvent.click(buttons[buttons.length - 1]!);
    expect(api.exportDiagnostics).toHaveBeenLastCalledWith({ includeChannel: false });
    expect(await screen.findByText('已儲存診斷資訊')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '在資料夾中顯示' }));
    expect(api.revealDiagnostics).toHaveBeenCalled();
  });

  it('includes the channel when ticked', async () => {
    render(<ReportTile version="0.3.0" />);
    await userEvent.click(screen.getByRole('button', { name: '匯出' }));
    await userEvent.click(await screen.findByRole('switch', { name: '包含頻道名稱' }));
    const buttons = screen.getAllByRole('button', { name: '匯出' });
    await userEvent.click(buttons[buttons.length - 1]!);
    expect(api.exportDiagnostics).toHaveBeenLastCalledWith({ includeChannel: true });
  });

  it('keeps the dialog open when the save dialog is cancelled', async () => {
    api.exportDiagnostics.mockResolvedValueOnce(false);
    render(<ReportTile version="0.3.0" />);
    await userEvent.click(screen.getByRole('button', { name: '匯出' }));
    await screen.findByRole('dialog');
    const buttons = screen.getAllByRole('button', { name: '匯出' });
    await userEvent.click(buttons[buttons.length - 1]!);
    await waitFor(() => expect(api.exportDiagnostics).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByText('已儲存診斷資訊')).toBeNull();
  });

  it('opens a bug report with the version filled in', async () => {
    render(<ReportTile version="0.3.0" />);
    await userEvent.click(screen.getByRole('button', { name: '開啟 GitHub' }));
    expect(api.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('issues/new?template=bug_report.yml&version=0.3.0'),
    );
  });
});
