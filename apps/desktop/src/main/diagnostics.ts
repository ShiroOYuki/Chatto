import { strToU8, zipSync } from 'fflate';
import type { AppPrefs, AppState, DiagnosticsOptions } from '../shared/ipc';
import type { Settings } from './settings';

/**
 * Diagnostics export (#56): a zip the user attaches to a bug report. It
 * holds versions, a connection summary, the settings without anything
 * private, and the main process log. Never: tokens, the sharing session,
 * chat messages. The channel name only when the user ticks it.
 */

export type { DiagnosticsOptions };

/** Placeholder for a channel or account name left out of the export. */
export const HIDDEN_CHANNEL = '<channel>';

type Field<T, K extends keyof T> = 'keep' | 'omit' | ((value: T[K], options: DiagnosticsOptions) => unknown);

/**
 * What each field becomes in the export. Every field must be listed: a new
 * setting does not compile until someone decides whether it may leave the
 * computer (`diagnostics.test.ts` also checks the real defaults).
 */
export type FieldPolicy<T> = { [K in keyof Required<T>]: Field<T, K> };

export const PREFS_POLICY: FieldPolicy<AppPrefs> = {
  uiMode: 'keep',
  appearance: 'keep',
  closeToTray: 'keep',
  launchAtLogin: 'keep',
  // May hold a path with the Windows user name.
  editorCommand: (command) => (command.trim() ? '<set>' : ''),
  locale: 'keep',
  chatLocale: 'keep',
  obsPluginPromptDismissed: 'keep',
  skippedUpdateVersion: 'keep',
};

export const SETTINGS_POLICY: FieldPolicy<Settings> = {
  // A public client (Device Code Flow, no secret); tells which app registration is used.
  twitchClientId: 'keep',
  channelLogin: (login, options) => (options.includeChannel || !login ? login : HIDDEN_CHANNEL),
  serverPort: 'keep',
  overlay: 'keep',
  alertsOverlay: 'keep',
  alerts: 'keep',
  selectedThemes: 'keep',
  // Themes can be large and personal; only what helps tell them apart.
  customThemes: (themes) =>
    themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      base: theme.base,
      fromSharing: Boolean(theme.origin),
      customCssLength: theme.customCss.length,
    })),
  prefs: (prefs, options) => applyPolicy(prefs, PREFS_POLICY, options),
  windowBounds: 'keep',
  // The anonymous download-counting id stays on this computer.
  share: (share) => ({ termsAccepted: share.termsAccepted }),
};

export function applyPolicy<T extends object>(
  value: T,
  policy: FieldPolicy<T>,
  options: DiagnosticsOptions,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(policy) as (keyof T & string)[]) {
    const rule = policy[key] as Field<T, typeof key>;
    if (rule === 'omit' || value[key] === undefined) continue;
    out[key] = rule === 'keep' ? value[key] : rule(value[key], options);
  }
  return out;
}

export function sanitizeSettings(settings: Settings, options: DiagnosticsOptions): Record<string, unknown> {
  return applyPolicy(settings, SETTINGS_POLICY, options);
}

/** Connections at the moment of export, without names unless asked. */
export function connectionSummary(state: AppState, options: DiagnosticsOptions): Record<string, unknown> {
  const name = (login: string | undefined) => (login && !options.includeChannel ? HIDDEN_CHANNEL : login);
  return {
    twitch: {
      clientId: state.clientId.source,
      auth: state.auth.status,
      account: name(state.auth.login),
      redemptionScope: state.auth.redemptionScope,
      error: state.auth.error,
    },
    channel: { state: state.channel.state, login: name(state.channel.login), detail: state.channel.detail },
    localServer: { port: state.server.port },
    overlay: { enabled: state.overlay.enabled },
    alertsOverlay: { enabled: state.alertsOverlay.enabled },
    sharing: { session: state.share.session.status },
    update: state.update,
  };
}

/** Replaces the channel and account names wherever they appear (logs, error texts). */
export function hideNames(text: string, names: (string | undefined)[]): string {
  return names
    .filter((name): name is string => Boolean(name && name.length >= 3))
    .reduce(
      (out, name) => out.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), HIDDEN_CHANNEL),
      text,
    );
}

/** Lines for the log when the app state changes in ways worth knowing later. Names stay out. */
export function describeStateChanges(prev: AppState | null, next: AppState): string[] {
  const lines: string[] = [];
  const changed = <T>(pick: (state: AppState) => T) => !prev || pick(prev) !== pick(next);
  if (changed((s) => s.auth.status)) lines.push(`twitch sign-in: ${next.auth.status}`);
  if (next.auth.error && changed((s) => s.auth.error)) lines.push(`twitch sign-in error: ${next.auth.error}`);
  if (changed((s) => s.channel.state))
    lines.push(`chat: ${next.channel.state}${next.channel.detail ? ` (${next.channel.detail})` : ''}`);
  if (changed((s) => s.overlay.enabled)) lines.push(`desktop overlay: ${next.overlay.enabled ? 'on' : 'off'}`);
  if (changed((s) => s.alertsOverlay.enabled))
    lines.push(`alert overlay: ${next.alertsOverlay.enabled ? 'on' : 'off'}`);
  if (changed((s) => s.update.status))
    lines.push(
      `update: ${next.update.status}${next.update.version ? ` ${next.update.version}` : ''}${next.update.error ? ` (${next.update.error})` : ''}`,
    );
  if (changed((s) => s.share.session.status)) lines.push(`theme sharing: ${next.share.session.status}`);
  return lines;
}

/** `chatto-diagnostics-20261108-1330.zip`, in local time. */
export function diagnosticsFileName(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  return `chatto-diagnostics-${date}-${pad(at.getHours())}${pad(at.getMinutes())}.zip`;
}

export function buildDiagnosticsZip(contents: {
  info: unknown;
  settings: unknown;
  logs: { name: string; text: string }[];
}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'info.json': strToU8(JSON.stringify(contents.info, null, 2)),
    'settings.json': strToU8(JSON.stringify(contents.settings, null, 2)),
  };
  for (const log of contents.logs) files[`logs/${log.name}`] = strToU8(log.text);
  return zipSync(files);
}
