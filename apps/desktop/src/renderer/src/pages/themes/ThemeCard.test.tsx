import { PRESET_THEMES } from '@chatto/chat-ui';
import { describe, expect, it } from 'vitest';
import { sameCard, type CardActions, type ThemeCardProps } from './ThemeCard';

const theme = PRESET_THEMES[0]!;
const actions = {} as CardActions;
const props = (overrides: Partial<ThemeCardProps> = {}): ThemeCardProps => ({
  theme,
  selected: { overlay: theme.id, embed: 'other', alerts: 'other' },
  updateAvailable: false,
  moves: { folders: [{ id: 'f1', name: 'Games' }], current: 'f1', up: null, down: null },
  actions,
  ...overrides,
});

describe('sameCard', () => {
  it('ignores new objects that say the same thing', () => {
    expect(
      sameCard(
        props(),
        props({
          selected: { overlay: theme.id, embed: 'another', alerts: 'other' },
          moves: { folders: [{ id: 'f1', name: 'Games' }], current: 'f1', up: null, down: null },
        }),
      ),
    ).toBe(true);
  });

  it('notices what the card shows', () => {
    expect(sameCard(props(), props({ theme: { ...theme } }))).toBe(false);
    expect(sameCard(props(), props({ selected: { overlay: 'other', embed: 'other', alerts: 'other' } }))).toBe(false);
    expect(sameCard(props(), props({ updateAvailable: true }))).toBe(false);
    expect(
      sameCard(
        props(),
        props({ moves: { folders: [{ id: 'f1', name: 'Games!' }], current: 'f1', up: null, down: null } }),
      ),
    ).toBe(false);
  });
});
