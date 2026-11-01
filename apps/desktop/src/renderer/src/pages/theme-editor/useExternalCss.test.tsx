import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../../../tests/fake-api';
import { api as mockedApi } from '../../api';
import { useExternalCss, WRITE_DELAY_MS } from './useExternalCss';

vi.mock('../../api', async () => {
  const { createFakeApi } = await import('../../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => {
  const setCss = vi.fn();
  const hook = renderHook(({ css }) => useExternalCss('custom-a', css, setCss), { initialProps: { css: 'a' } });
  return { ...hook, setCss };
};

describe('useExternalCss', () => {
  it('does nothing until the file is opened', async () => {
    const { rerender } = setup();
    rerender({ css: 'b' });
    await act(() => vi.advanceTimersByTimeAsync(WRITE_DELAY_MS));
    expect(api.writeCssFile).not.toHaveBeenCalled();
  });

  it('opens the file with the current CSS and reports how it opened', async () => {
    const { result } = setup();
    await act(() => result.current.open());
    expect(api.openCssFile).toHaveBeenLastCalledWith('custom-a', 'a');
    expect(result.current.synced?.launched).toBe('editor');
  });

  it('writes app edits after typing pauses', async () => {
    const { result, rerender } = setup();
    await act(() => result.current.open());
    rerender({ css: 'ab' });
    rerender({ css: 'abc' });
    await act(() => vi.advanceTimersByTimeAsync(WRITE_DELAY_MS));
    expect(api.writeCssFile).toHaveBeenLastCalledWith('custom-a', 'abc');
    expect(api.writeCssFile).not.toHaveBeenCalledWith('custom-a', 'ab');
  });

  it('applies outside edits of this theme only', async () => {
    const { result, setCss } = setup();
    await act(() => result.current.open());
    act(() => api.pushCssFile({ themeId: 'custom-b', css: 'x' }));
    act(() => api.pushCssFile({ themeId: 'custom-a', css: 'from vscode' }));
    expect(setCss).toHaveBeenCalledTimes(1);
    expect(setCss).toHaveBeenCalledWith('from vscode');
  });

  it('stops syncing when the editor closes', async () => {
    const { result, unmount } = setup();
    await act(() => result.current.open());
    unmount();
    expect(api.closeCssFile).toHaveBeenLastCalledWith('custom-a');
  });

  it('shows the error when the file cannot be opened', async () => {
    api.openCssFile.mockRejectedValueOnce(new Error('EPERM'));
    const { result } = setup();
    await act(() => result.current.open());
    expect(result.current.error).toBe('EPERM');
    expect(result.current.synced).toBeNull();
  });
});
