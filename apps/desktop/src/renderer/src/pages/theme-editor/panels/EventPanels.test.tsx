import { findEvent, PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '../../../components/ui/tooltip';
import { EventPanel } from './EventPanels';

const initial: ChatTheme = { ...structuredClone(PRESET_THEMES[0]!), id: 'custom-a', builtIn: false, eventText: {} };

function Harness({ eventKey }: { eventKey: string }) {
  const [draft, setDraft] = useState<ChatTheme>(initial);
  return (
    <TooltipProvider>
      <EventPanel draft={draft} setDraft={setDraft} event={findEvent(eventKey)!} />
      <output data-testid="text">{JSON.stringify(draft.eventText)}</output>
    </TooltipProvider>
  );
}
const eventText = () => JSON.parse(screen.getByTestId('text').textContent!) as Record<string, string>;

describe('event text field', () => {
  it('shows the built-in template and the variables, and stores a custom template', () => {
    render(<Harness eventKey="twitch:resub" />);
    const input = screen.getByRole('textbox', { name: '文字' }) as HTMLInputElement;
    expect(input.placeholder).toBe(findEvent('twitch:resub')!.text!['zh-TW']);
    expect(screen.getByText('{months}')).toBeTruthy();

    fireEvent.change(input, { target: { value: '{user} 續訂 {months} 個月' } });
    expect(eventText()).toEqual({ 'twitch:resub': '{user} 續訂 {months} 個月' });
  });

  it('removes the template when the field is cleared', () => {
    render(<Harness eventKey="twitch:resub" />);
    const input = screen.getByRole('textbox', { name: '文字' });
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(eventText()).toEqual({});
  });

  it('says the platform text is used for events without a built-in template', () => {
    render(<Harness eventKey="twitch:watch-streak" />);
    expect((screen.getByRole('textbox', { name: '文字' }) as HTMLInputElement).placeholder).toBe('使用平台原文');
  });

  it('inserts a variable at the caret when its chip is clicked', async () => {
    render(<Harness eventKey="twitch:resub" />);
    const input = screen.getByRole('textbox', { name: '文字' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '感謝 的支持' } });
    input.setSelectionRange(3, 3);
    await userEvent.click(screen.getByRole('button', { name: '插入 {user}' }));
    expect(eventText()).toEqual({ 'twitch:resub': '感謝 {user}的支持' });
  });

  it('adds the variable at the end of an empty field', async () => {
    render(<Harness eventKey="twitch:resub" />);
    await userEvent.click(screen.getByRole('button', { name: '插入 {months}' }));
    expect(eventText()).toEqual({ 'twitch:resub': '{months}' });
  });

  it('explains a variable on hover', async () => {
    render(<Harness eventKey="twitch:resub" />);
    await userEvent.hover(screen.getByRole('button', { name: '插入 {streak}' }));
    expect((await screen.findAllByText('連續訂閱月數（觀眾選擇不公開時沒有）')).length).toBeGreaterThan(0);
  });
});
