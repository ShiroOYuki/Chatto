import { THEME_SCHEMA_VERSION, type ChatTheme, type ChatThemeOptions } from '@chatto/core';

const defaultOptions: ChatThemeOptions = {
  showBadges: true,
  showAvatars: false,
  showTimestamps: false,
  useUserColors: true,
  direction: 'bottom-up',
  messageLifetime: 0,
  maxMessages: 50,
  enterAnimation: 'slide-up',
  hiddenUsers: ['nightbot', 'streamelements', 'moobot'],
  hiddenPrefixes: ['!'],
};

const sans = "'Noto Sans TC', 'Inter', system-ui, sans-serif";

function preset(
  theme: Omit<ChatTheme, 'schemaVersion' | 'builtIn' | 'customCss' | 'options'> & {
    options?: Partial<ChatThemeOptions>;
  },
): ChatTheme {
  return {
    ...theme,
    schemaVersion: THEME_SCHEMA_VERSION,
    builtIn: true,
    customCss: '',
    options: { ...defaultOptions, ...theme.options },
  };
}

/** Built-in presets. Users duplicate one to start a custom theme. */
export const PRESET_THEMES: ChatTheme[] = [
  preset({
    id: 'matcha-glass',
    name: '抹茶玻璃',
    layout: 'card',
    palette: {
      surface: 'rgba(30, 70, 50, 0.72)',
      border: 'rgba(159, 225, 203, 0.35)',
      text: '#EAF3DE',
      mutedText: '#9FE1CB',
      accent: '#C0DD97',
      nameSurface: 'transparent',
      name: '#9FE1CB',
      textStroke: 'transparent',
    },
    typography: { fontFamily: sans, fontSize: 16, nameWeight: 700, textStrokeWidth: 0 },
    shape: { radius: 12, borderWidth: 1, padding: [6, 12], gap: 6 },
  }),
  preset({
    id: 'washi',
    name: '和紙',
    layout: 'card',
    palette: {
      surface: '#F6F0E2',
      border: 'transparent',
      text: '#2C2C2A',
      mutedText: '#5F5E5A',
      accent: '#A32D2D',
      nameSurface: 'transparent',
      name: '#712B13',
      textStroke: 'transparent',
    },
    typography: {
      fontFamily: "'Noto Serif TC', 'Noto Serif JP', serif",
      fontSize: 16,
      nameWeight: 700,
      textStrokeWidth: 0,
    },
    shape: { radius: 2, borderWidth: 0, padding: [6, 12], gap: 6 },
    options: { useUserColors: false, enterAnimation: 'fade' },
  }),
  preset({
    id: 'bubble',
    name: '泡泡',
    layout: 'bubble',
    palette: {
      surface: '#FAECE7',
      border: 'transparent',
      text: '#712B13',
      mutedText: '#F5C4B3',
      accent: '#D85A30',
      nameSurface: 'transparent',
      name: '#F5C4B3',
      textStroke: 'transparent',
    },
    typography: { fontFamily: sans, fontSize: 16, nameWeight: 600, textStrokeWidth: 0 },
    shape: { radius: 16, borderWidth: 0, padding: [6, 12], gap: 8 },
    options: { showAvatars: true, enterAnimation: 'pop' },
  }),
  preset({
    id: 'outline',
    name: '極簡描邊',
    layout: 'inline',
    palette: {
      surface: 'transparent',
      border: 'transparent',
      text: '#FFFFFF',
      mutedText: '#D3D1C7',
      accent: '#FAC775',
      nameSurface: 'transparent',
      name: '#9FE1CB',
      textStroke: '#000000',
    },
    typography: { fontFamily: sans, fontSize: 18, nameWeight: 800, textStrokeWidth: 4 },
    shape: { radius: 0, borderWidth: 0, padding: [2, 0], gap: 4 },
  }),
  preset({
    id: 'noren',
    name: '暖簾',
    layout: 'tag',
    palette: {
      surface: 'rgba(4, 44, 83, 0.8)',
      border: 'transparent',
      text: '#E6F1FB',
      mutedText: '#B5D4F4',
      accent: '#FAC775',
      nameSurface: '#0C447C',
      name: '#E6F1FB',
      textStroke: 'transparent',
    },
    typography: { fontFamily: sans, fontSize: 16, nameWeight: 700, textStrokeWidth: 0 },
    shape: { radius: 6, borderWidth: 0, padding: [6, 10], gap: 6 },
    options: { enterAnimation: 'slide-left' },
  }),
  preset({
    id: 'terminal',
    name: '終端機',
    layout: 'terminal',
    palette: {
      surface: 'rgba(10, 14, 20, 0.78)',
      border: 'transparent',
      text: '#D3D1C7',
      mutedText: '#888780',
      accent: '#5DCAA5',
      nameSurface: 'transparent',
      name: '#5DCAA5',
      textStroke: 'transparent',
    },
    typography: {
      fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
      fontSize: 14,
      nameWeight: 600,
      textStrokeWidth: 0,
    },
    shape: { radius: 6, borderWidth: 0, padding: [2, 10], gap: 0 },
    options: { showTimestamps: true, showBadges: false, enterAnimation: 'none' },
  }),
];

export const DEFAULT_THEME_ID = 'matcha-glass';

export function getPresetTheme(id: string): ChatTheme | undefined {
  return PRESET_THEMES.find((theme) => theme.id === id);
}

/** Creates an editable copy of a theme with a new id. */
export function duplicateTheme(theme: ChatTheme, name: string): ChatTheme {
  return {
    ...structuredClone(theme),
    id: `custom-${Date.now().toString(36)}`,
    name,
    builtIn: false,
  };
}

/** CSS custom properties for a theme, applied on `.chatto-root`. */
export function themeToCssVariables(theme: ChatTheme): Record<string, string> {
  const { palette, typography, shape } = theme;
  return {
    '--chatto-surface': palette.surface,
    '--chatto-border': palette.border,
    '--chatto-text': palette.text,
    '--chatto-muted': palette.mutedText,
    '--chatto-accent': palette.accent,
    '--chatto-name-surface': palette.nameSurface,
    '--chatto-name': palette.name,
    '--chatto-stroke': palette.textStroke,
    '--chatto-font': typography.fontFamily,
    '--chatto-font-size': `${typography.fontSize}px`,
    '--chatto-name-weight': String(typography.nameWeight),
    '--chatto-stroke-width': `${typography.textStrokeWidth}px`,
    '--chatto-radius': `${shape.radius}px`,
    '--chatto-border-width': `${shape.borderWidth}px`,
    '--chatto-pad-y': `${shape.padding[0]}px`,
    '--chatto-pad-x': `${shape.padding[1]}px`,
    '--chatto-gap': `${shape.gap}px`,
  };
}
