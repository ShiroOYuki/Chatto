import type { ChatTheme } from '@chatto/core';
import { getPresetTheme, mergeDeep, type ThemeOverrides } from '@chatto/chat-ui/themes';
import type { ShareCategory } from './model';

/** One theme the fake sharing service starts with. */
export interface SeedTheme {
  name: string;
  description: string;
  category: ShareCategory;
  tags: string[];
  author: string;
  /** The author is an official account (shown with a badge). */
  official?: boolean;
  likes: number;
  downloads: number;
  /** How long ago it was published. */
  daysAgo: number;
  theme: ChatTheme;
  /** Reports from other accounts (enough to hide it), for trying the moderation view. */
  reports?: number;
}

/** A preset with a few values changed, as a custom theme someone could have shared. */
function variant(presetId: string, overrides: ThemeOverrides = {}): ChatTheme {
  const preset = getPresetTheme(presetId);
  if (!preset) throw new Error(`Unknown preset ${presetId}`);
  return { ...mergeDeep(structuredClone(preset), overrides), builtIn: false };
}

/**
 * Sample themes for the fake service: a few per category, built from the presets so they
 * render like real themes. Placeholder data for development and tests, not the real
 * category starters (GitHub #23).
 */
export const FAKE_SEED: SeedTheme[] = [
  {
    name: 'Quiet Outline',
    description: 'White text with a thin outline, readable on any game without covering it.',
    category: 'minimal',
    tags: ['outline', 'borderless', 'gaming'],
    author: 'stillwater',
    likes: 128,
    downloads: 940,
    daysAgo: 40,
    theme: variant('outline'),
  },
  {
    name: 'Soda Bubbles',
    description: '對話框像手機訊息，名字在上、訊息在下。',
    category: 'cute',
    tags: ['bubble', 'pastel', 'chatting'],
    author: 'mochi_mochi',
    likes: 342,
    downloads: 2210,
    daysAgo: 12,
    theme: variant('bubble'),
  },
  {
    name: 'Sakura Letters',
    description: 'Pink paper notes for spring streams.',
    category: 'seasonal',
    tags: ['pastel', 'paper', 'vtuber'],
    author: 'mochi_mochi',
    likes: 97,
    downloads: 410,
    daysAgo: 3,
    theme: variant('washi', {
      text: { color: '#4A2B33', accentColor: '#C2185B' },
      message: { box: { background: '#FCE4EC' } },
      author: { color: '#AD1457' },
    }),
  },
  {
    name: '和紙便箋',
    description: '米色和紙底、明朝體，適合雜談與歌回。',
    category: 'japanese',
    tags: ['paper', 'light', 'chatting'],
    author: 'kotoha',
    likes: 210,
    downloads: 1503,
    daysAgo: 25,
    theme: variant('washi'),
  },
  {
    name: 'Tea Garden',
    description: 'Leafy frames around every message.',
    category: 'nature',
    tags: ['frame', 'colorful'],
    author: 'Chatto',
    official: true,
    likes: 64,
    downloads: 288,
    daysAgo: 8,
    theme: variant('tea-leaf'),
  },
  {
    name: 'Neon Arcade',
    description: 'Glowing cyan and magenta for late-night gaming.',
    category: 'gaming',
    tags: ['neon', 'glass', 'gaming'],
    author: 'pixelfox',
    likes: 175,
    downloads: 1320,
    daysAgo: 18,
    theme: variant('matcha-glass', {
      text: { accentColor: '#FF4FD8' },
      message: { box: { background: 'rgba(20, 10, 40, 0.75)', border: { color: 'rgba(0, 240, 255, 0.6)' } } },
      author: { color: '#00F0FF' },
    }),
  },
  {
    name: 'Green Phosphor',
    description: 'An old terminal with a blinking cursor feel.',
    category: 'retro',
    tags: ['monochrome', 'pixel', 'compact'],
    author: 'pixelfox',
    likes: 88,
    downloads: 530,
    daysAgo: 60,
    theme: variant('terminal'),
  },
  {
    name: 'Frosted Glass',
    description: 'Blurred glass cards with a soft border.',
    category: 'tech',
    tags: ['glass', 'dark'],
    author: 'kotoha',
    likes: 150,
    downloads: 1102,
    daysAgo: 30,
    theme: variant('matcha-glass'),
  },
  {
    name: 'Midnight Noren',
    description: '深色布簾，夜晚的直播間。',
    category: 'dark',
    tags: ['dark', 'large-text'],
    author: 'yoru',
    likes: 73,
    downloads: 360,
    daysAgo: 5,
    theme: variant('noren', { text: { color: '#E8E6E1' } }),
  },
  {
    name: 'Shop Curtain',
    description: 'A noren curtain over each message.',
    category: 'other',
    tags: ['card', 'colorful'],
    author: 'yoru',
    likes: 41,
    downloads: 150,
    daysAgo: 1,
    theme: variant('noren'),
  },
  {
    name: 'Copied Bubbles',
    description: 'Reported several times, so it starts hidden.',
    category: 'cute',
    tags: ['bubble'],
    author: 'copycat',
    likes: 2,
    downloads: 20,
    daysAgo: 2,
    theme: variant('bubble'),
    reports: 4,
  },
];
