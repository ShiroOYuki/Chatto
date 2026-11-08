import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrayRelease } from './tray-release';

describe('TrayRelease', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const create = () => {
    const release = vi.fn();
    return { release, tray: new TrayRelease({ delayMs: 1000, release }) };
  };

  it('releases the window after it stays hidden', () => {
    const { release, tray } = create();
    tray.hidden();
    vi.advanceTimersByTime(999);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(release).toHaveBeenCalledOnce();
  });

  it('keeps the window when it is shown again in time', () => {
    const { release, tray } = create();
    tray.hidden();
    vi.advanceTimersByTime(500);
    tray.shown();
    vi.advanceTimersByTime(5000);
    expect(release).not.toHaveBeenCalled();
  });

  it('never releases unsaved work, and starts over once it is saved', () => {
    const { release, tray } = create();
    tray.setUnsaved(true);
    tray.hidden();
    vi.advanceTimersByTime(5000);
    expect(release).not.toHaveBeenCalled();
    tray.setUnsaved(false);
    vi.advanceTimersByTime(1000);
    expect(release).toHaveBeenCalledOnce();
  });

  it('does nothing when work is saved while the window is showing', () => {
    const { release, tray } = create();
    tray.setUnsaved(true);
    tray.setUnsaved(false);
    vi.advanceTimersByTime(5000);
    expect(release).not.toHaveBeenCalled();
  });
});
