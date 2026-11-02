import {
  editEventStyle,
  linkEvent,
  resolveEventStyle,
  TEMPLATE_VARIABLES,
  type EventDefinition,
} from '@chatto/chat-ui';
import type { ChatTheme, EventMessageFrame, EventStyle, EventTitlePlacement } from '@chatto/core';
import { Link2 } from 'lucide-react';
import { useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { Badge, Button, Hint, Segmented } from '../../../components/kit';
import { Input } from '../../../components/ui/input';
import { useChatLocale, useLocale, useMessages } from '../../../i18n';
import { BoxEditor, ColorRow, FieldRow, NumberField, OptionalColorRow, TextRow } from '../fields';
import { pathSetter, type PathSetter } from '../draft';
import { PanelIntro, SubHeading } from './shared';

type SetDraft = Dispatch<SetStateAction<ChatTheme>>;

/** The generic event style every platform event follows until it is edited on its own. */
export function NoticePanel({ draft, setDraft }: { draft: ChatTheme; setDraft: SetDraft }) {
  const set = useMemo(
    () => pathSetter<EventStyle>((apply) => setDraft((current) => ({ ...current, notice: apply(current.notice) }))),
    [setDraft],
  );
  const m = useMessages().editorPanels.notice;
  return (
    <>
      <PanelIntro>{m.intro}</PanelIntro>
      <EventStyleFields style={draft.notice} fallbackBody={draft.text.color} set={set} />
    </>
  );
}

/** One platform event: linked to the generic style, or with its own. */
export function EventPanel({
  draft,
  setDraft,
  event,
}: {
  draft: ChatTheme;
  setDraft: SetDraft;
  event: EventDefinition;
}) {
  const { key } = event;
  // Editing any field goes through editEventStyle, which also unlinks the event.
  const set = useMemo(
    () => pathSetter<EventStyle>((apply) => setDraft((current) => editEventStyle(current, key, apply))),
    [setDraft, key],
  );
  const m = useMessages().editorPanels.event;
  const locale = useLocale();
  const override = draft.events[key];
  const linked = !override || override.linked;
  // An empty template drops the key so the built-in text shows again.
  const setText = (text: string) =>
    setDraft((current) => {
      const eventText = { ...current.eventText };
      if (text === '') delete eventText[key];
      else eventText[key] = text;
      return { ...current, eventText };
    });
  return (
    <>
      <PanelIntro>{m.intro(event.description[locale], event.category === 'message')}</PanelIntro>
      <EventTextField event={event} value={draft.eventText[key] ?? ''} onChange={setText} />
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-tile-muted px-3 py-2">
        <Badge tone={linked ? 'matcha' : 'sakura'}>{linked ? m.linked : m.own}</Badge>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-faint">{linked ? m.linkedHint : m.ownHint}</span>
        <Button size="sm" disabled={linked} onClick={() => setDraft((current) => linkEvent(current, key))}>
          <Link2 /> {m.relink}
        </Button>
      </div>
      <EventStyleFields style={resolveEventStyle(draft, key)} fallbackBody={draft.text.color} set={set} />
    </>
  );
}

/**
 * The event's own text template. The placeholder shows the built-in template in
 * the chat language; events without one show the platform's own text.
 */
function EventTextField({
  event,
  value,
  onChange,
}: {
  event: EventDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const m = useMessages().editorPanels.event;
  const chatLocale = useChatLocale();
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  // Puts `{name}` where the caret is (at the end when the field was never focused), then keeps typing after it.
  const insert = (name: string) => {
    const field = input.current;
    const token = `{${name}}`;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <FieldRow label={m.text}>
      <Input
        ref={input}
        value={value}
        aria-label={m.text}
        placeholder={event.text?.[chatLocale] ?? m.platformText}
        onChange={(change) => onChange(change.target.value)}
        className="h-8 rounded-lg border-line bg-canvas px-2 text-sm shadow-none placeholder:text-ink-faint focus-visible:border-matcha focus-visible:ring-matcha/20 md:text-sm"
      />
      {event.variables?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {event.variables.map((name) => (
            <Hint key={name} label={TEMPLATE_VARIABLES[name]?.[locale] ?? name} side="top">
              <button
                type="button"
                aria-label={m.insertVariable(name)}
                // Keep the caret in the field: a mousedown on the chip would blur it first.
                onMouseDown={(click) => click.preventDefault()}
                onClick={() => insert(name)}
                className="rounded-md bg-tile-muted px-1.5 py-0.5 font-mono text-[11px] text-ink-soft transition-colors hover:bg-matcha-soft/60 hover:text-matcha-strong focus-visible:outline-2 focus-visible:outline-matcha"
              >
                {`{${name}}`}
              </button>
            </Hint>
          ))}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-ink-faint">{m.textSyntax}</p>
    </FieldRow>
  );
}

/** Fields shared by the generic event style and every platform event. */
function EventStyleFields({
  style,
  fallbackBody,
  set,
}: {
  style: EventStyle;
  fallbackBody: string;
  set: PathSetter<EventStyle>;
}) {
  const m = useMessages().editorPanels.event;
  return (
    <>
      <ColorRow label={m.titleColor} value={style.titleColor} onChange={set('titleColor')} />
      <TextRow
        label={m.icon}
        hint={m.iconHint}
        value={style.icon}
        onChange={set('icon')}
        placeholder={m.iconPlaceholder}
      />
      <FieldRow label={m.titlePlacement} hint={m.titlePlacementHint}>
        <Segmented
          size="sm"
          value={style.titlePlacement}
          onChange={(value: EventTitlePlacement) => set('titlePlacement')(value)}
          options={[
            { value: 'line', label: m.line },
            { value: 'sticker', label: m.sticker },
          ]}
        />
      </FieldRow>
      {style.titlePlacement === 'sticker' ? (
        <>
          <ColorRow
            label={m.stickerBackground}
            value={style.sticker.background}
            onChange={set('sticker', 'background')}
          />
          <ColorRow label={m.stickerColor} value={style.sticker.color} onChange={set('sticker', 'color')} />
          <NumberField
            label={m.stickerRotate}
            value={style.sticker.rotate}
            min={-15}
            max={15}
            unit="°"
            onChange={set('sticker', 'rotate')}
          />
        </>
      ) : null}
      <OptionalColorRow
        label={m.bodyColor}
        value={style.bodyColor || undefined}
        fallback={fallbackBody}
        onChange={(value) => set('bodyColor')(value ?? '')}
      />
      <NumberField
        label={m.accentWidth}
        value={style.accentWidth}
        min={0}
        max={12}
        unit="px"
        onChange={set('accentWidth')}
      />
      {style.accentWidth > 0 ? (
        <ColorRow label={m.accentColor} value={style.accentColor} onChange={set('accentColor')} />
      ) : null}
      <SubHeading>{m.frame}</SubHeading>
      <FieldRow label={m.messageFrame} hint={m.messageFrameHint}>
        <Segmented
          size="sm"
          value={style.messageFrame}
          onChange={(value: EventMessageFrame) => set('messageFrame')(value)}
          options={[
            { value: 'wrap', label: m.wrap },
            { value: 'surface', label: m.surface },
          ]}
        />
      </FieldRow>
      <BoxEditor value={style.box} onChange={set('box')} />
    </>
  );
}
