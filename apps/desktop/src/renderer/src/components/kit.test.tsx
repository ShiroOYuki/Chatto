import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { channelTone, Segmented, Toggle } from './kit';

describe('kit', () => {
  it('Toggle is a labelled switch that reports the new value', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="關閉時縮到系統匣" />);
    const toggle = screen.getByRole('switch', { name: '關閉時縮到系統匣' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Segmented marks the active option and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        value="full"
        onChange={onChange}
        options={[
          { value: 'full', label: '完整' },
          { value: 'compact', label: '精簡' },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: '完整' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: '精簡' }));
    expect(onChange).toHaveBeenCalledWith('compact');
  });

  it('maps connection states to status tones', () => {
    expect(channelTone('connected', true)).toBe('ok');
    expect(channelTone('connecting', false)).toBe('warn');
    expect(channelTone('reconnecting', false)).toBe('warn');
    expect(channelTone('error', false)).toBe('error');
    expect(channelTone('closed', false)).toBe('idle');
  });
});
