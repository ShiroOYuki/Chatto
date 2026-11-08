import { describe, expect, it } from 'vitest';
import {
  acceleratorFromKeyPress,
  duplicateOf,
  emptyShortcuts,
  normalizeShortcuts,
  shortcutLabel,
  type KeyPress,
} from './shortcuts';

const press = (code: string, mods: Partial<KeyPress> = {}, key = code): KeyPress => ({
  key,
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe('acceleratorFromKeyPress', () => {
  it('builds accelerators in a fixed modifier order from the physical key', () => {
    expect(acceleratorFromKeyPress(press('KeyC', { altKey: true, ctrlKey: true }, 'ç'))).toEqual({
      accelerator: 'Ctrl+Alt+C',
    });
    expect(acceleratorFromKeyPress(press('Digit1', { ctrlKey: true, shiftKey: true }, '!'))).toEqual({
      accelerator: 'Ctrl+Shift+1',
    });
    expect(acceleratorFromKeyPress(press('Numpad5', { altKey: true }))).toEqual({ accelerator: 'Alt+num5' });
    expect(acceleratorFromKeyPress(press('ArrowUp', { metaKey: true, altKey: true }))).toEqual({
      accelerator: 'Alt+Super+Up',
    });
    expect(acceleratorFromKeyPress(press('Slash', { ctrlKey: true }))).toEqual({ accelerator: 'Ctrl+/' });
  });

  it('allows function keys alone but nothing else without Ctrl, Alt or Win', () => {
    expect(acceleratorFromKeyPress(press('F9'))).toEqual({ accelerator: 'F9' });
    expect(acceleratorFromKeyPress(press('F9', { shiftKey: true }))).toEqual({ accelerator: 'Shift+F9' });
    expect(acceleratorFromKeyPress(press('KeyA'))).toEqual({ error: 'needs-modifier' });
    expect(acceleratorFromKeyPress(press('KeyA', { shiftKey: true }))).toEqual({ error: 'needs-modifier' });
  });

  it('waits while only modifiers are down and refuses keys it cannot name', () => {
    expect(acceleratorFromKeyPress(press('ControlLeft', { ctrlKey: true }, 'Control'))).toEqual({ pending: true });
    expect(acceleratorFromKeyPress(press('IntlRo', { ctrlKey: true }))).toEqual({ error: 'unsupported' });
  });
});

describe('duplicateOf and normalizeShortcuts', () => {
  it('finds another action with the same keys in any case or order', () => {
    const bindings = { ...emptyShortcuts(), togglePause: 'Ctrl+Alt+P' };
    expect(duplicateOf(bindings, 'clearChat', 'alt+ctrl+p')).toBe('togglePause');
    expect(duplicateOf(bindings, 'togglePause', 'Ctrl+Alt+P')).toBeNull();
    expect(duplicateOf(bindings, 'clearChat', '')).toBeNull();
  });

  it('keeps valid saved bindings only, each key once', () => {
    expect(
      normalizeShortcuts({ toggleOverlay: 'Ctrl+Alt+O', togglePause: 'ctrl+alt+o', clearChat: 42, other: 'F1' }),
    ).toEqual({ ...emptyShortcuts(), toggleOverlay: 'Ctrl+Alt+O' });
    expect(normalizeShortcuts(undefined)).toEqual(emptyShortcuts());
  });
});

describe('shortcutLabel', () => {
  it('reads like the keyboard', () => {
    expect(shortcutLabel('Ctrl+Super+num5')).toBe('Ctrl + Win + Num 5');
    expect(shortcutLabel('Alt+Return')).toBe('Alt + Enter');
  });
});
