import { PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useThemeDraft } from './useThemeDraft';

const initial: ChatTheme = { ...structuredClone(PRESET_THEMES[0]!), id: 'custom-a', builtIn: false, customCss: '' };

describe('useThemeDraft', () => {
  it('takes CSS saved elsewhere into the draft without marking it unsaved', () => {
    const { result } = renderHook(() =>
      useThemeDraft(
        initial,
        vi.fn(async () => undefined),
        vi.fn(),
      ),
    );
    act(() => result.current.acceptSavedCss('.chatto-body {}'));
    expect(result.current.draft.customCss).toBe('.chatto-body {}');
    expect(result.current.dirty).toBe(false);
  });

  it('keeps other unsaved edits when CSS arrives', () => {
    const { result } = renderHook(() =>
      useThemeDraft(
        initial,
        vi.fn(async () => undefined),
        vi.fn(),
      ),
    );
    act(() => result.current.set('name')('新名稱'));
    act(() => result.current.acceptSavedCss('a {}'));
    expect(result.current.draft).toMatchObject({ name: '新名稱', customCss: 'a {}' });
    expect(result.current.saved).toMatchObject({ name: initial.name, customCss: 'a {}' });
    expect(result.current.dirty).toBe(true);
  });
});
