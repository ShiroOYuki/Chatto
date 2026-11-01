import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleState, type FakeApi } from '../../../../../../tests/fake-api';
import { api as mockedApi } from '../api';
import { TitleBar } from './TitleBar';
import { TooltipProvider } from './ui/tooltip';

vi.mock('../api', async () => {
  const { createFakeApi } = await import('../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

describe('TitleBar', () => {
  it('opens a support link from the tea cup menu', async () => {
    render(
      <TooltipProvider>
        <TitleBar state={sampleState()} />
      </TooltipProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '支持 Chatto' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /綠界/ }));
    expect(api.openExternal).toHaveBeenLastCalledWith('https://p.ecpay.com.tw/C487EF9');
  });
});
