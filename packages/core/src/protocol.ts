import { SCHEMA_VERSION, type ChatEvent } from './message';
import type { SoundSetting } from './alerts';
import { isLocale, type Locale } from './i18n';
import type { ChatTheme } from './theme';

/**
 * Wire protocol between the desktop app (server) and viewers
 * (the desktop overlay window and OBS browser sources), over WebSocket.
 * Every frame is a JSON object with a `v` version and a `type`.
 */

export const PROTOCOL_VERSION = SCHEMA_VERSION;

/** Which output a viewer renders: the desktop chat overlay, OBS, or the desktop event alert overlay. */
export type ViewerTarget = 'overlay' | 'embed' | 'alerts';

export const VIEWER_TARGETS: ViewerTarget[] = ['overlay', 'embed', 'alerts'];

/** Sent with events to the alerts viewer: how long the card stays and what it plays. */
export interface AlertCue {
  durationMs: number;
  /** Omitted when the event plays no sound. */
  sound?: SoundSetting;
}

export type ServerFrame =
  | {
      v: typeof PROTOCOL_VERSION;
      type: 'hello';
      target: ViewerTarget;
      theme: ChatTheme;
      /** Recent events so a freshly opened viewer is not empty. */
      backlog: ChatEvent[];
      /** Language of event texts; older servers leave it out (viewers use the default). */
      locale?: Locale;
    }
  | { v: typeof PROTOCOL_VERSION; type: 'event'; event: ChatEvent; alert?: AlertCue }
  | { v: typeof PROTOCOL_VERSION; type: 'theme'; theme: ChatTheme }
  /** The chat language changed. */
  | { v: typeof PROTOCOL_VERSION; type: 'locale'; locale: Locale };

export type ClientFrame = { v: typeof PROTOCOL_VERSION; type: 'subscribe'; target: ViewerTarget };

export function encodeFrame(frame: ServerFrame | ClientFrame): string {
  return JSON.stringify(frame);
}

export function decodeServerFrame(data: string): ServerFrame | null {
  try {
    const frame = JSON.parse(data) as Partial<ServerFrame>;
    if (frame?.v !== PROTOCOL_VERSION) return null;
    if (frame.type === 'hello' || frame.type === 'event' || frame.type === 'theme') {
      return frame as ServerFrame;
    }
    if (frame.type === 'locale')
      return isLocale((frame as { locale?: unknown }).locale) ? (frame as ServerFrame) : null;
    return null;
  } catch {
    return null;
  }
}

export function decodeClientFrame(data: string): ClientFrame | null {
  try {
    const frame = JSON.parse(data) as Partial<ClientFrame>;
    if (frame?.v !== PROTOCOL_VERSION || frame.type !== 'subscribe') return null;
    if (!VIEWER_TARGETS.includes(frame.target as ViewerTarget)) return null;
    return frame as ClientFrame;
  } catch {
    return null;
  }
}
