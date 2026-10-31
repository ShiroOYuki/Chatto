import { PLAIN_PRESET, PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme, RoleKey, RoleStyle } from '@chatto/core';

type Path = (string | number)[];

/** Immutable update of a nested field by path. */
export function setIn<T>(target: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const source = target as Record<string | number, unknown>;
  const copy = (Array.isArray(target) ? [...target] : { ...source }) as Record<string | number, unknown>;
  copy[head!] = setIn(source[head!], rest, value);
  return copy as T;
}

/**
 * Type-checked field setter: `set('author', 'box')(value)` only accepts a `BoxStyle`.
 * Overloads stop at depth 3 because no theme field the editor edits is nested deeper.
 */
export interface PathSetter<T> {
  <K1 extends keyof T>(k1: K1): (value: T[K1]) => void;
  <K1 extends keyof T, K2 extends keyof T[K1]>(k1: K1, k2: K2): (value: T[K1][K2]) => void;
  <K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(
    k1: K1,
    k2: K2,
    k3: K3,
  ): (value: T[K1][K2][K3]) => void;
}

/** Builds a `PathSetter` on top of a functional state updater. */
export function pathSetter<T>(update: (apply: (current: T) => T) => void): PathSetter<T> {
  return (...path: PropertyKey[]) =>
    (value: unknown) =>
      update((current) => setIn(current, path as Path, value));
}

/** Presets offered by "load preset parameters": the all-zero start plus every styled built-in. */
export const PRESET_CHOICES: ChatTheme[] = [PLAIN_PRESET, ...PRESET_THEMES.filter((item) => item.base === 'styled')];

/**
 * Copies every style parameter from a preset, keeping this theme's identity.
 * Display rules and custom CSS belong to the theme, not to its look, so they are kept too.
 * Returns the theme unchanged when the preset does not exist.
 */
export function applyPreset(current: ChatTheme, presetId: string): ChatTheme {
  const preset = [PLAIN_PRESET, ...PRESET_THEMES].find((item) => item.id === presetId);
  if (!preset) return current;
  return {
    ...structuredClone(preset),
    id: current.id,
    name: current.name,
    builtIn: false,
    options: current.options,
    customCss: current.customCss,
  };
}

/**
 * Merges a patch into one role's style. Fields set to `undefined` are removed, and a role
 * left with no fields is removed entirely so the saved theme stays minimal.
 */
export function patchRole(theme: ChatTheme, key: RoleKey, patch: Partial<RoleStyle>): ChatTheme {
  const next: RoleStyle = { ...theme.roles[key], ...patch };
  for (const field of Object.keys(next) as (keyof RoleStyle)[]) if (next[field] === undefined) delete next[field];
  const roles = { ...theme.roles };
  if (Object.keys(next).length) roles[key] = next;
  else delete roles[key];
  return { ...theme, roles };
}
