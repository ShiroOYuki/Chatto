import { describe, expect, it } from 'vitest';
import {
  backdropColor,
  DEFAULT_OVERLAY_LOOK,
  normalizeOverlayLook,
  overlayLookScript,
  overlayLookVars,
} from './overlayLook';

describe('normalizeOverlayLook', () => {
  it('gives settings from older versions a transparent backdrop and a fully visible chat', () => {
    expect(normalizeOverlayLook(undefined)).toEqual(DEFAULT_OVERLAY_LOOK);
    expect(normalizeOverlayLook({})).toEqual({ color: '#000000', backgroundOpacity: 0, chatOpacity: 1 });
  });

  it('keeps valid values', () => {
    expect(normalizeOverlayLook({ color: '#1B2230', backgroundOpacity: 0.4, chatOpacity: 0.75 })).toEqual({
      color: '#1b2230',
      backgroundOpacity: 0.4,
      chatOpacity: 0.75,
    });
  });

  it('repairs hand edits', () => {
    expect(
      normalizeOverlayLook({
        color: 'red; } body { display: none',
        backgroundOpacity: 7,
        chatOpacity: 0,
      } as never),
    ).toEqual({ color: '#000000', backgroundOpacity: 1, chatOpacity: 0.1 });
    expect(normalizeOverlayLook({ backgroundOpacity: Number.NaN, chatOpacity: '1' } as never)).toEqual(
      DEFAULT_OVERLAY_LOOK,
    );
  });
});

describe('overlay look CSS', () => {
  it('turns the backdrop into a colour, transparent at zero opacity', () => {
    expect(backdropColor({ color: '#1b2230', backgroundOpacity: 0.5, chatOpacity: 1 })).toBe('rgba(27, 34, 48, 0.5)');
    expect(backdropColor({ color: '#1b2230', backgroundOpacity: 0, chatOpacity: 1 })).toBe('transparent');
  });

  it('sets the variables the viewer reads', () => {
    expect(overlayLookVars({ color: '#ffffff', backgroundOpacity: 1, chatOpacity: 0.6 })).toEqual({
      '--chatto-backdrop': 'rgba(255, 255, 255, 1)',
      '--chatto-chat-opacity': '0.6',
    });
  });

  it('never puts unchecked text into the page script', () => {
    const script = overlayLookScript({ color: '"); alert(1); ("', backgroundOpacity: 1, chatOpacity: 1 });
    expect(script).not.toContain('alert');
    expect(script).toContain('rgba(0, 0, 0, 1)');
  });
});
