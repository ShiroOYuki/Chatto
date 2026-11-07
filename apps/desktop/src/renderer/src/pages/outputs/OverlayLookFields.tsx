import { useEffect, useRef, useState } from 'react';
import type { OverlayWindowId } from '../../../../shared/ipc';
import { MIN_CHAT_OPACITY, type OverlayLook } from '../../../../shared/overlayLook';
import { ColorField } from '../../components/ColorField';
import { Field, Slider } from '../../components/kit';
import { useMessages } from '../../i18n';
import { overlay } from '../../services/overlay';

/** How often a dragged slider reaches the window, ms. */
const SEND_EVERY_MS = 60;

const percent = (value: number) => Math.round(value * 100);

/**
 * Backdrop colour, backdrop opacity and chat opacity of a desktop window.
 * The sliders move locally and reach the window a few times a second.
 */
export function OverlayLookFields({ window, look }: { window: OverlayWindowId; look: OverlayLook }) {
  const m = useMessages().outputs.look;
  const [draft, setDraft] = useState(look);
  const pending = useRef<OverlayLook | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow changes made elsewhere, but not while a change of ours is still on its way.
  useEffect(() => {
    if (!timer.current) setDraft(look);
  }, [look]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const change = (patch: Partial<OverlayLook>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    pending.current = next;
    if (timer.current) return;
    overlay.setLook(window, next);
    pending.current = null;
    timer.current = setTimeout(function flush() {
      if (pending.current) {
        overlay.setLook(window, pending.current);
        pending.current = null;
        timer.current = setTimeout(flush, SEND_EVERY_MS);
      } else {
        timer.current = null;
      }
    }, SEND_EVERY_MS);
  };

  return (
    <section aria-label={m.title} className="mt-4">
      <h3 className="text-sm font-medium text-ink-soft">{m.title}</h3>
      <p className="mt-1 text-xs text-ink-faint">{m.hint}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={m.backgroundColor}>
          <ColorField
            label={m.backgroundColor}
            value={draft.color.toUpperCase()}
            alpha={false}
            onChange={(color) => change({ color: color.toLowerCase() })}
          />
        </Field>
        <Field label={m.backgroundOpacity}>
          {/* Centred on the colour field beside it. */}
          <div className="flex min-h-[50px] items-center *:flex-1">
            <Slider
              label={m.backgroundOpacity}
              value={percent(draft.backgroundOpacity)}
              min={0}
              max={100}
              unit="%"
              onChange={(value) => change({ backgroundOpacity: value / 100 })}
            />
          </div>
        </Field>
        <Field label={m.chatOpacity}>
          <Slider
            label={m.chatOpacity}
            value={percent(draft.chatOpacity)}
            min={percent(MIN_CHAT_OPACITY)}
            max={100}
            unit="%"
            onChange={(value) => change({ chatOpacity: value / 100 })}
          />
        </Field>
      </div>
    </section>
  );
}
