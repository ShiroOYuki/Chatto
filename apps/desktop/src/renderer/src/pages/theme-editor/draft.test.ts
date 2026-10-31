import { PLAIN_PRESET, PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { applyPreset, pathSetter, patchRole, setIn } from './draft';
import { resolveSection } from './sections';

const custom = (): ChatTheme => ({
  ...structuredClone(PRESET_THEMES[0]!),
  id: 'mine',
  name: 'Mine',
  builtIn: false,
  customCss: '.chatto-root { color: red; }',
});

describe('setIn', () => {
  it('copies along the path and leaves the original untouched', () => {
    const source = { a: { b: [1, 2, 3] }, c: { d: 1 } };
    const next = setIn(source, ['a', 'b', 1], 9);
    expect(next.a.b).toEqual([1, 9, 3]);
    expect(source.a.b).toEqual([1, 2, 3]);
    expect(next.c).toBe(source.c);
  });
});

describe('pathSetter', () => {
  it('applies a nested update through the state updater', () => {
    let theme = custom();
    const set = pathSetter<ChatTheme>((apply) => {
      theme = apply(theme);
    });
    set('author', 'prefix')('@');
    set('name')('Renamed');
    expect(theme.author.prefix).toBe('@');
    expect(theme.name).toBe('Renamed');
  });
});

describe('applyPreset', () => {
  it('takes style parameters from the preset but keeps identity, rules and custom CSS', () => {
    const theme = custom();
    theme.options.maxMessages = 7;
    const preset = PRESET_THEMES[1]!;
    const next = applyPreset(theme, preset.id);
    expect(next.font).toEqual(preset.font);
    expect(next).toMatchObject({ id: 'mine', name: 'Mine', builtIn: false, customCss: theme.customCss });
    expect(next.options.maxMessages).toBe(7);
  });

  it('accepts the plain preset', () => {
    expect(applyPreset(custom(), PLAIN_PRESET.id).list).toEqual(PLAIN_PRESET.list);
  });

  it('returns the theme unchanged for an unknown preset', () => {
    const theme = custom();
    expect(applyPreset(theme, 'missing')).toBe(theme);
  });
});

describe('patchRole', () => {
  it('merges fields and drops ones set to undefined', () => {
    let theme = patchRole(custom(), 'vip', { nameColor: '#f00', borderColor: '#0f0' });
    theme = patchRole(theme, 'vip', { borderColor: undefined });
    expect(theme.roles.vip).toEqual({ nameColor: '#f00' });
  });

  it('removes a role once it has no fields left', () => {
    const theme = patchRole(patchRole(custom(), 'vip', { nameColor: '#f00' }), 'vip', { nameColor: undefined });
    expect('vip' in theme.roles).toBe(false);
  });
});

describe('resolveSection', () => {
  it('falls back to the base section when a style section is hidden on the blank base', () => {
    expect(resolveSection('text', true).active).toBe('base');
    expect(resolveSection('text', false).active).toBe('text');
  });

  it('resolves platform event pages, but not on the blank base', () => {
    const styled = resolveSection('event:twitch:cheer', false);
    expect(styled.event?.key).toBe('twitch:cheer');
    expect(resolveSection('event:twitch:cheer', true).active).toBe('base');
  });

  it('hides style-only sections on the blank base', () => {
    const ids = resolveSection('base', true).sections.map((item) => item.id);
    expect(ids).toEqual(['base', 'behavior', 'css']);
  });
});
