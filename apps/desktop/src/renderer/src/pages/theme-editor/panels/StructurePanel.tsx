import { BLANK_STARTER_CSS } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import type { Dispatch, SetStateAction } from 'react';
import { ChoiceCards, Segmented, Select } from '../../../components/kit';
import { FieldRow, ToggleRow } from '../../../components/themeFields';
import { applyPreset, PRESET_CHOICES } from '../draft';
import { SubHeading, type PanelProps } from './shared';

export function StructurePanel({
  draft,
  set,
  setDraft,
}: PanelProps & { setDraft: Dispatch<SetStateAction<ChatTheme>> }) {
  const { avatar, badges, timestamp, author, list } = draft;
  const blank = draft.base === 'blank';
  return (
    <>
      <div className="pb-2">
        <div className="pb-2 text-xs font-medium text-ink-soft">基底</div>
        <ChoiceCards
          value={draft.base}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              base: value,
              // Going blank with no CSS yet: start from a readable minimum instead of raw markup.
              customCss: value === 'blank' && !current.customCss.trim() ? BLANK_STARTER_CSS : current.customCss,
            }))
          }
          options={[
            { value: 'styled', title: '參數樣式', description: '用下方各項參數調整外觀，也可以再加自訂 CSS。' },
            {
              value: 'blank',
              title: '空白（Blank）',
              description: '不產生任何樣式，只保留結構，外觀完全由自訂 CSS 決定。',
            },
          ]}
        />
      </div>
      {!blank ? (
        <FieldRow
          label="載入預設參數"
          hint="套用內建主題的樣式參數再微調；選「空白」會把所有參數歸零。顯示規則與自訂 CSS 不受影響。"
        >
          <Select
            value=""
            placeholder="選擇預設…"
            options={PRESET_CHOICES.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(presetId) => setDraft((current) => applyPreset(current, presetId))}
          />
        </FieldRow>
      ) : null}
      <SubHeading>要輸出的結構</SubHeading>
      <ToggleRow label="頭像" value={avatar.show} onChange={set('avatar', 'show')} />
      <ToggleRow label="徽章" value={badges.show} onChange={set('badges', 'show')} />
      <ToggleRow label="時間" value={timestamp.show} onChange={set('timestamp', 'show')} />
      {timestamp.show ? (
        <ToggleRow label="12 小時制" value={timestamp.hour12} onChange={set('timestamp', 'hour12')} />
      ) : null}
      <ToggleRow
        label="使用者名稱顏色"
        hint="使用平台上的名稱顏色"
        value={author.useUserColor}
        onChange={set('author', 'useUserColor')}
      />
      <FieldRow label="新訊息位置">
        <Segmented
          size="sm"
          value={list.direction}
          onChange={set('list', 'direction')}
          options={[
            { value: 'bottom-up', label: '最新在下' },
            { value: 'top-down', label: '最新在上' },
          ]}
        />
      </FieldRow>
    </>
  );
}
