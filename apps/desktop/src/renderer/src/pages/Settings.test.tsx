import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleState, type FakeApi } from '../../../../../../tests/fake-api';
import { api as mockedApi } from '../api';
import { TooltipProvider } from '../components/ui/tooltip';
import { SettingsPage } from './Settings';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

const renderPage = (state = sampleState()) =>
  render(
    <TooltipProvider>
      <SettingsPage state={state} />
    </TooltipProvider>,
  );

describe('SettingsPage', () => {
  it('shows the current preferences', () => {
    renderPage(
      sampleState({
        prefs: { uiMode: 'compact', appearance: 'dark', closeToTray: false, launchAtLogin: true, editorCommand: '' },
      }),
    );
    expect(screen.getByRole('switch', { name: '關閉時縮到系統匣' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: '開機時自動啟動' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('tab', { name: /精簡/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('saves preference changes through the main process', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('switch', { name: '關閉時縮到系統匣' }));
    expect(api.setPrefs).toHaveBeenLastCalledWith({ closeToTray: false });

    await userEvent.click(screen.getByRole('tab', { name: /精簡/ }));
    expect(api.setPrefs).toHaveBeenLastCalledWith({ uiMode: 'compact' });
  });

  it('opens each support link in the browser', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Ko-fi' }));
    expect(api.openExternal).toHaveBeenLastCalledWith('https://ko-fi.com/ciel518');

    await userEvent.click(screen.getByRole('button', { name: '綠界' }));
    expect(api.openExternal).toHaveBeenLastCalledWith('https://p.ecpay.com.tw/C487EF9');
  });

  it('saves the editor command when the field loses focus', async () => {
    renderPage();
    const field = screen.getByRole('textbox', { name: '外部 CSS 編輯器指令' });
    await userEvent.type(field, 'notepad++');
    expect(api.setPrefs).not.toHaveBeenCalledWith({ editorCommand: 'notepad++' });
    await userEvent.tab();
    expect(api.setPrefs).toHaveBeenLastCalledWith({ editorCommand: 'notepad++' });
  });
});
