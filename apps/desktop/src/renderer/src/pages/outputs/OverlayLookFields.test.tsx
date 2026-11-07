import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../../../tests/fake-api';
import { DEFAULT_OVERLAY_LOOK } from '../../../../shared/overlayLook';
import { api as mockedApi } from '../../api';
import { OverlayLookFields } from './OverlayLookFields';

vi.mock('../../api', async () => {
  const { createFakeApi } = await import('../../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

beforeEach(() => api.setOverlayLook.mockClear());

describe('OverlayLookFields', () => {
  it('shows the saved look', () => {
    render(
      <OverlayLookFields window="overlay" look={{ color: '#1b2230', backgroundOpacity: 0.4, chatOpacity: 0.8 }} />,
    );
    expect(screen.getByRole('slider', { name: '背景不透明度' }).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByRole('slider', { name: '聊天室不透明度' }).getAttribute('aria-valuenow')).toBe('80');
    expect((screen.getByRole('textbox', { name: '背景顏色' }) as HTMLInputElement).value).toBe('#1B2230');
    // Only an opaque colour: opacity has its own slider.
    expect(screen.queryByRole('slider', { name: /背景顏色/ })).toBeNull();
  });

  it('sends slider changes for its own window, at most a few times a second', async () => {
    render(<OverlayLookFields window="alerts" look={DEFAULT_OVERLAY_LOOK} />);
    const slider = screen.getByRole('slider', { name: '背景不透明度' });
    // Five steps in one go, like a fast drag.
    for (let i = 0; i < 5; i++) fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('5');
    // The first change goes at once; the rest are folded into the latest value.
    expect(api.setOverlayLook).toHaveBeenCalledTimes(1);
    expect(api.setOverlayLook).toHaveBeenCalledWith('alerts', { ...DEFAULT_OVERLAY_LOOK, backgroundOpacity: 0.01 });
    await waitFor(() =>
      expect(api.setOverlayLook).toHaveBeenLastCalledWith('alerts', {
        ...DEFAULT_OVERLAY_LOOK,
        backgroundOpacity: 0.05,
      }),
    );
    expect(api.setOverlayLook).toHaveBeenCalledTimes(2);
  });

  it('keeps the chat from fading out completely', async () => {
    render(<OverlayLookFields window="overlay" look={{ ...DEFAULT_OVERLAY_LOOK, chatOpacity: 0.1 }} />);
    const slider = screen.getByRole('slider', { name: '聊天室不透明度' });
    expect(slider.getAttribute('aria-valuemin')).toBe('10');
  });

  it('takes a typed colour as an opaque hex', async () => {
    render(<OverlayLookFields window="overlay" look={DEFAULT_OVERLAY_LOOK} />);
    const input = screen.getByRole('textbox', { name: '背景顏色' });
    await userEvent.clear(input);
    await userEvent.type(input, 'rgba(255, 0, 0, 0.5)');
    await userEvent.tab();
    await waitFor(() =>
      expect(api.setOverlayLook).toHaveBeenLastCalledWith('overlay', { ...DEFAULT_OVERLAY_LOOK, color: '#ff0000' }),
    );
  });
});
