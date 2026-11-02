import {
  ChatView,
  createSpecimenEvents,
  describeClass,
  emptyFeed,
  findEvent,
  reduceFeed,
  startMockStream,
  useChatFeed,
} from '@chatto/chat-ui';
import type { ChatTheme, Locale } from '@chatto/core';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useChatLocale, useLocale, useMessages, useOutputTheme, type Messages } from '../i18n';
import { inspectElement, queryInRoot, type InspectedElement } from '../lib/cssSelector';
import { pillAtTop, type Box } from '../lib/matchPill';
import { useThemeAssetUrl } from '../services/themes';
import { BACKDROPS, type Backdrop } from './ThemePreview';

export type PreviewMode = 'specimen' | 'live';

const sameBoxes = (a: Box[], b: Box[]) =>
  a.length === b.length &&
  a.every((box, i) => box.x === b[i]!.x && box.y === b[i]!.y && box.w === b[i]!.w && box.h === b[i]!.h);

/** Human label for an inspected element: its class plus the row it sits in, in the interface language. */
export function describeInspected(
  info: InspectedElement,
  messages: Messages,
  locale: Locale,
): { title: string; detail: string } {
  const m = messages.editor.inspector;
  const ref = describeClass(info.part);
  const detail = [
    info.event ? (findEvent(info.event)?.label[locale] ?? info.event) : null,
    ...info.roles,
    ...info.highlights,
    info.user,
    info.badge ? m.badge(info.badge) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return { title: m.title(info.part, ref?.label[locale]), detail };
}

/**
 * Chat preview for the theme editor. "specimen" shows a fixed sample that uses
 * every part of the markup; "live" streams mock chat. In inspect mode hovering
 * outlines the part under the cursor and clicking picks it. `highlight`
 * outlines everything a selector matches.
 */
export function InspectablePreview({
  theme,
  backdrop,
  mode,
  inspect,
  highlight,
  onPick,
}: {
  theme: ChatTheme;
  backdrop: Backdrop;
  mode: PreviewMode;
  inspect: boolean;
  highlight: string | null;
  onPick: (info: InspectedElement) => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const hovered = useRef<{ element: Element; info: InspectedElement } | null>(null);
  const [hoverBox, setHoverBox] = useState<{ box: Box; info: InspectedElement } | null>(null);
  const [matches, setMatches] = useState<Box[]>([]);
  const pill = useRef<HTMLDivElement>(null);
  const [pillTop, setPillTop] = useState(false);

  const messages = useMessages();
  const locale = useLocale();
  const chatLocale = useChatLocale();
  const outputTheme = useOutputTheme();
  const feed = useChatFeed(theme.options);
  const { push } = feed;
  useEffect(() => (mode === 'live' ? startMockStream(push, 1500) : undefined), [mode, push]);
  const assetUrl = useThemeAssetUrl();

  const specimen = useMemo(() => {
    const options = { ...theme.options, hiddenPrefixes: [], hiddenUsers: [], maxMessages: 100, messageLifetime: 0 };
    return createSpecimenEvents().reduce((state, event) => reduceFeed(state, event, options, 0), emptyFeed).items;
    // Built once: the specimen does not depend on styling.
  }, []);
  const shownTheme = useMemo(() => {
    const output = outputTheme(theme);
    return mode === 'specimen' ? { ...output, animation: { ...output.animation, enter: 'none' as const } } : output;
  }, [mode, theme, outputTheme]);

  // Keep overlay boxes in sync with layout (theme edits, streaming, animations).
  useEffect(() => {
    if (!highlight && !inspect) {
      setMatches([]);
      setHoverBox(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      const host = content.current;
      const root = host?.querySelector('.chatto-root');
      if (host && root) {
        const origin = host.getBoundingClientRect();
        const toBox = (element: Element): Box => {
          const rect = element.getBoundingClientRect();
          return {
            x: Math.round(rect.left - origin.left),
            y: Math.round(rect.top - origin.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        };
        const next = highlight ? queryInRoot(root, highlight).map(toBox) : [];
        setMatches((current) => (sameBoxes(current, next) ? current : next));
        const view = scroller.current;
        if (view && pill.current) {
          setPillTop(
            pillAtTop(
              next,
              view.scrollTop,
              { w: view.clientWidth, h: view.clientHeight },
              { w: pill.current.offsetWidth, h: pill.current.offsetHeight },
            ),
          );
        }
        if (!inspect) hovered.current = null;
        const target = hovered.current;
        if (target && target.element.isConnected) {
          const box = toBox(target.element);
          setHoverBox((current) =>
            current && current.info === target.info && sameBoxes([current.box], [box])
              ? current
              : { box, info: target.info },
          );
        } else {
          hovered.current = null;
          setHoverBox(null);
        }
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [highlight, inspect]);

  const onMove = (event: MouseEvent) => {
    if (!inspect) return;
    const root = content.current?.querySelector('.chatto-root');
    const found = root ? inspectElement(event.target as Element, root) : null;
    hovered.current = found ? { element: found.target, info: found.info } : null;
  };
  const onClick = (event: MouseEvent) => {
    if (!inspect || !hovered.current) return;
    event.preventDefault();
    onPick(hovered.current.info);
  };

  // Scroll the first match into view when a new selector is highlighted.
  useEffect(() => {
    if (!highlight) return;
    const root = content.current?.querySelector('.chatto-root');
    const first = root ? queryInRoot(root, highlight)[0] : undefined;
    if (first && first !== root) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);

  const label = hoverBox ? describeInspected(hoverBox.info, messages, locale) : null;

  return (
    <div className="relative h-full overflow-hidden" style={{ background: BACKDROPS[backdrop] }}>
      <div
        ref={scroller}
        className={`h-full overflow-y-auto ${inspect ? 'cursor-crosshair' : ''}`}
        onMouseMove={onMove}
        onMouseLeave={() => (hovered.current = null)}
        onClickCapture={onClick}
      >
        <div ref={content} className={`relative p-3 ${mode === 'live' ? 'h-full' : ''}`}>
          <ChatView
            theme={shownTheme}
            items={mode === 'specimen' ? specimen : feed.items}
            assetUrl={assetUrl}
            locale={chatLocale}
          />
          <div className="pointer-events-none absolute inset-0">
            {matches.map((box, index) => (
              <div
                key={index}
                className="absolute rounded-[3px] bg-sakura/20 outline-2 outline-sakura"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
              />
            ))}
            {hoverBox ? (
              <>
                <div
                  className="absolute rounded-[3px] bg-matcha/15 outline-2 outline-matcha"
                  style={{ left: hoverBox.box.x, top: hoverBox.box.y, width: hoverBox.box.w, height: hoverBox.box.h }}
                />
                <div
                  className="absolute z-10 max-w-[260px] rounded-lg bg-ink px-2 py-1 font-mono text-[11px] leading-snug text-canvas shadow-lg"
                  style={{
                    left: Math.max(0, hoverBox.box.x),
                    top: hoverBox.box.y > 44 ? hoverBox.box.y - 6 : hoverBox.box.y + hoverBox.box.h + 6,
                    transform: hoverBox.box.y > 44 ? 'translateY(-100%)' : undefined,
                  }}
                >
                  <div className="truncate">{label?.title}</div>
                  {label?.detail ? <div className="truncate font-sans opacity-70">{label.detail}</div> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {highlight ? (
        <div
          ref={pill}
          className={`pointer-events-none absolute right-2 rounded-full bg-ink/80 px-2.5 py-0.5 text-[11px] text-canvas ${
            pillTop ? 'top-2' : 'bottom-2'
          }`}
        >
          {matches.length > 0 ? messages.editor.preview.matches(matches.length) : messages.editor.preview.noMatches}
        </div>
      ) : null}
    </div>
  );
}
