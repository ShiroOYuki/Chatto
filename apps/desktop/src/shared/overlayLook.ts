/**
 * How a desktop overlay window looks around its chat: a backdrop filling the
 * window and the chat's opacity. Window settings, not theme parameters, and
 * never sent to OBS (OBS has its own filters).
 */
export interface OverlayLook {
  /** Backdrop colour, `#rrggbb`. */
  color: string;
  /** Backdrop opacity, 0–1; 0 keeps the window fully transparent. */
  backgroundOpacity: number;
  /** Opacity of the whole chat, text included, 0.1–1. */
  chatOpacity: number;
}

export const DEFAULT_OVERLAY_LOOK: OverlayLook = { color: '#000000', backgroundOpacity: 0, chatOpacity: 1 };

/** Lowest chat opacity: below it the chat would vanish and look broken. */
export const MIN_CHAT_OPACITY = 0.1;

const HEX = /^#[0-9a-f]{6}$/i;

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value * 100) / 100))
    : fallback;

/** Fills settings saved by older versions and repairs hand edits. */
export function normalizeOverlayLook(raw: Partial<OverlayLook> | undefined): OverlayLook {
  const base = DEFAULT_OVERLAY_LOOK;
  return {
    color: typeof raw?.color === 'string' && HEX.test(raw.color) ? raw.color.toLowerCase() : base.color,
    backgroundOpacity: clamp(raw?.backgroundOpacity, 0, 1, base.backgroundOpacity),
    chatOpacity: clamp(raw?.chatOpacity, MIN_CHAT_OPACITY, 1, base.chatOpacity),
  };
}

/** The backdrop as a CSS colour. */
export function backdropColor(look: OverlayLook): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(look.color.slice(i, i + 2), 16));
  return look.backgroundOpacity <= 0 ? 'transparent' : `rgba(${r}, ${g}, ${b}, ${look.backgroundOpacity})`;
}

/** CSS custom properties the viewer page reads (see apps/viewer/src/viewer.css). */
export function overlayLookVars(look: OverlayLook): Record<string, string> {
  const safe = normalizeOverlayLook(look);
  return {
    '--chatto-backdrop': backdropColor(safe),
    '--chatto-chat-opacity': String(safe.chatOpacity),
  };
}

/** A script that sets the look on an overlay page; every value goes through `normalizeOverlayLook`. */
export function overlayLookScript(look: OverlayLook): string {
  const vars = JSON.stringify(overlayLookVars(look));
  return `for (const [k, v] of Object.entries(${vars})) document.documentElement.style.setProperty(k, v)`;
}
