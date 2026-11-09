import { describe, expect, it } from 'vitest';
import { MOCK_USERS } from './mockData';

/** Twitch's preset chat name colors: what most real viewers have (#60). */
const TWITCH_PRESET_COLORS = [
  '#FF0000',
  '#0000FF',
  '#008000',
  '#B22222',
  '#FF7F50',
  '#9ACD32',
  '#FF4500',
  '#2E8B57',
  '#DAA520',
  '#D2691E',
  '#5F9EA0',
  '#1E90FF',
  '#FF69B4',
  '#8A2BE2',
  '#00FF7F',
];

describe('mock users', () => {
  // Pastel colors made previews differ from live chat: a theme brightening avatars turned them white.
  it('use saturated colors like real Twitch viewers', () => {
    for (const user of MOCK_USERS) expect(TWITCH_PRESET_COLORS).toContain(user.color);
  });

  it('use a different color each', () => {
    expect(new Set(MOCK_USERS.map((user) => user.color)).size).toBe(MOCK_USERS.length);
  });
});
