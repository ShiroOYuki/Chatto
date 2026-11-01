import { editEventStyle, linkEvent, resolveEventStyle, type EventDefinition } from '@chatto/chat-ui';
import type { ChatTheme, EventMessageFrame, EventStyle } from '@chatto/core';
import { Link2 } from 'lucide-react';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Badge, Button, Segmented } from '../../../components/kit';
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
  return (
    <>
      <PanelIntro>
        所有平台事件（訂閱、揪團、小奇點…）共用的樣式。各事件預設跟隨這裡，個別調整後會改用自己的樣式。
      </PanelIntro>
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
  const override = draft.events[key];
  const linked = !override || override.linked;
  return (
    <>
      <PanelIntro>
        {event.description}・{event.category === 'message' ? '保留聊天訊息結構，並加上事件標題與外框。' : '系統通知。'}
      </PanelIntro>
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-tile-muted px-3 py-2">
        <Badge tone={linked ? 'matcha' : 'sakura'}>{linked ? '跟隨通用事件訊息' : '獨立樣式'}</Badge>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-faint">
          {linked ? '修改任一項會改為獨立樣式。' : '通用事件訊息的變更不會影響這裡。'}
        </span>
        <Button size="sm" disabled={linked} onClick={() => setDraft((current) => linkEvent(current, key))}>
          <Link2 /> 與通用事件訊息同步
        </Button>
      </div>
      <EventStyleFields style={resolveEventStyle(draft, key)} fallbackBody={draft.text.color} set={set} />
    </>
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
  return (
    <>
      <ColorRow label="標題顏色" value={style.titleColor} onChange={set('titleColor')} />
      <TextRow
        label="標題圖示"
        hint="顯示在標題前，可用 emoji"
        value={style.icon}
        onChange={set('icon')}
        placeholder="例如 ✨"
      />
      <OptionalColorRow
        label="內容顏色"
        value={style.bodyColor || undefined}
        fallback={fallbackBody}
        onChange={(value) => set('bodyColor')(value ?? '')}
      />
      <NumberField
        label="左側色條"
        value={style.accentWidth}
        min={0}
        max={12}
        unit="px"
        onChange={set('accentWidth')}
      />
      {style.accentWidth > 0 ? (
        <ColorRow label="色條顏色" value={style.accentColor} onChange={set('accentColor')} />
      ) : null}
      <SubHeading>事件外框</SubHeading>
      <FieldRow label="聊天訊息事件" hint="小奇點、強調訊息。套在訊息框只換顏色，不多包一層。">
        <Segmented
          size="sm"
          value={style.messageFrame}
          onChange={(value: EventMessageFrame) => set('messageFrame')(value)}
          options={[
            { value: 'wrap', label: '包住整則' },
            { value: 'surface', label: '套在訊息框' },
          ]}
        />
      </FieldRow>
      <BoxEditor value={style.box} onChange={set('box')} />
    </>
  );
}
