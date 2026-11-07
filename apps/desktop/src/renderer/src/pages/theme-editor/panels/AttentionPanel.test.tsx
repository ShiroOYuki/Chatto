import { PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '../../../components/ui/tooltip';
import { pathSetter } from '../draft';
import { AttentionPanel } from './AttentionPanel';

const initial: ChatTheme = { ...structuredClone(PRESET_THEMES[0]!), id: 'custom-a', builtIn: false };

function Harness() {
  const [draft, setDraft] = useState<ChatTheme>(initial);
  const set = useMemo(() => pathSetter<ChatTheme>(setDraft), []);
  return (
    <TooltipProvider>
      <AttentionPanel draft={draft} set={set} />
      <output data-testid="labels">{JSON.stringify(draft.attention.labels ?? null)}</output>
    </TooltipProvider>
  );
}
const labels = () => JSON.parse(screen.getByTestId('labels').textContent!) as Record<string, string> | null;

describe('quiet-spell label fields', () => {
  it('stores a text per language and drops the ones cleared', () => {
    render(<Harness />);
    const english = screen.getByRole('textbox', { name: '標籤文字：English' }) as HTMLInputElement;
    // An empty language field shows the label it falls back to.
    expect(english.placeholder).toBe(initial.attention.label);

    fireEvent.change(english, { target: { value: 'New' } });
    expect(labels()).toEqual({ en: 'New' });
    fireEvent.change(screen.getByRole('textbox', { name: '標籤文字：繁體中文' }), { target: { value: '來了' } });
    expect(labels()).toEqual({ en: 'New', 'zh-TW': '來了' });

    fireEvent.change(english, { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: '標籤文字：繁體中文' }), { target: { value: '' } });
    expect(labels()).toBeNull();
  });

  it('hides the language fields when the label is off', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('textbox', { name: '標籤文字' }), { target: { value: '' } });
    expect(screen.queryByRole('textbox', { name: '標籤文字：English' })).toBeNull();
  });
});
