import { describe, expect, it, vi } from 'vitest';
import { emptyShortcuts } from '../shared/shortcuts';
import { GlobalShortcuts, type ShortcutRegistry } from './shortcuts';

/** Stands in for Electron's globalShortcut; `taken` keys belong to another app. */
function fakeRegistry(taken: string[] = []) {
  const callbacks = new Map<string, () => void>();
  const registry: ShortcutRegistry = {
    register: vi.fn((accelerator: string, callback: () => void) => {
      if (accelerator === 'Bogus') throw new Error('invalid accelerator');
      if (taken.includes(accelerator) || callbacks.has(accelerator)) return false;
      callbacks.set(accelerator, callback);
      return true;
    }),
    unregister: vi.fn((accelerator: string) => void callbacks.delete(accelerator)),
  };
  return { registry, callbacks, press: (accelerator: string) => callbacks.get(accelerator)?.() };
}

describe('GlobalShortcuts', () => {
  it('registers saved bindings and runs their action', () => {
    const { registry, press, callbacks } = fakeRegistry();
    const run = vi.fn();
    const shortcuts = new GlobalShortcuts(registry, run);
    shortcuts.apply({ ...emptyShortcuts(), togglePause: 'Ctrl+Alt+P' });
    expect([...callbacks.keys()]).toEqual(['Ctrl+Alt+P']);
    press('Ctrl+Alt+P');
    expect(run).toHaveBeenCalledWith('togglePause');
  });

  it('reports saved bindings another app holds', () => {
    const { registry } = fakeRegistry(['Ctrl+Alt+O']);
    const shortcuts = new GlobalShortcuts(registry, vi.fn());
    shortcuts.apply({ ...emptyShortcuts(), toggleOverlay: 'Ctrl+Alt+O', clearChat: 'Bogus' });
    expect(shortcuts.failed).toEqual(['toggleOverlay', 'clearChat']);
    // Setting a free key fixes it.
    expect(shortcuts.set('toggleOverlay', 'Ctrl+Alt+V')).toBe(true);
    expect(shortcuts.failed).toEqual(['clearChat']);
  });

  it('replaces a binding, and keeps the old one when the new keys are taken', () => {
    const { registry, callbacks } = fakeRegistry(['F8']);
    const shortcuts = new GlobalShortcuts(registry, vi.fn());
    shortcuts.set('togglePause', 'F9');
    expect(shortcuts.set('togglePause', 'F10')).toBe(true);
    expect([...callbacks.keys()]).toEqual(['F10']);
    expect(shortcuts.set('togglePause', 'F8')).toBe(false);
    expect([...callbacks.keys()]).toEqual(['F10']);
    expect(shortcuts.set('togglePause', '')).toBe(true);
    expect(callbacks.size).toBe(0);
  });

  it('lets go of every key on quit', () => {
    const { registry, callbacks } = fakeRegistry();
    const shortcuts = new GlobalShortcuts(registry, vi.fn());
    shortcuts.apply({ ...emptyShortcuts(), togglePause: 'F9', clearChat: 'F10' });
    shortcuts.unregisterAll();
    expect(callbacks.size).toBe(0);
  });
});
