import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../../../tests/fake-api';
import { api as mockedApi } from '../../api';
import { useExternalCss } from './useExternalCss';

vi.mock('../../api', async () => {
  const { createFakeApi } = await import('../../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

const setup = () => {
  const onSaved = vi.fn();
  const hook = renderHook(() => useExternalCss('custom-a', onSaved));
  return { ...hook, onSaved };
};

describe('useExternalCss', () => {
  it('opens the theme file and reports how it opened', async () => {
    const { result } = setup();
    await act(() => result.current.open());
    expect(api.openCssFile).toHaveBeenLastCalledWith('custom-a');
    expect(result.current.opened?.launched).toBe('editor');
  });

  it('takes in CSS saved outside Chatto for this theme only, even before opening', () => {
    const { onSaved } = setup();
    act(() => api.pushCssFile({ themeId: 'custom-b', css: 'x' }));
    act(() => api.pushCssFile({ themeId: 'custom-a', css: 'from vscode' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith('from vscode');
  });

  it('stops listening when the editor closes', () => {
    const { onSaved, unmount } = setup();
    unmount();
    act(() => api.pushCssFile({ themeId: 'custom-a', css: 'late' }));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the error when the file cannot be opened', async () => {
    api.openCssFile.mockRejectedValueOnce(new Error('EPERM'));
    const { result } = setup();
    await act(() => result.current.open());
    expect(result.current.error).toBe('EPERM');
    expect(result.current.opened).toBeNull();
  });
});
