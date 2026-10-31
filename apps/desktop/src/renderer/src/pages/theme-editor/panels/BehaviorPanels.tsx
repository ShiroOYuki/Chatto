import { TagsField } from '../../../components/kit';
import { FieldRow, NumberField, SelectRow } from '../../../components/themeFields';
import { ANIMATIONS, BOT_SUGGESTIONS, PREFIX_SUGGESTIONS } from '../options';
import type { PanelProps } from './shared';

export function MotionPanel({ draft, set }: PanelProps) {
  const { animation } = draft;
  return (
    <>
      <SelectRow label="進場動畫" value={animation.enter} options={ANIMATIONS} onChange={set('animation', 'enter')} />
      <NumberField
        label="動畫時間"
        value={animation.duration}
        min={0}
        max={1500}
        step={10}
        unit="ms"
        onChange={set('animation', 'duration')}
      />
    </>
  );
}

export function BehaviorPanel({ draft, set }: PanelProps) {
  const { options } = draft;
  return (
    <>
      <NumberField
        label="停留時間"
        hint="0 代表一直顯示"
        value={options.messageLifetime}
        min={0}
        max={300}
        unit="s"
        onChange={set('options', 'messageLifetime')}
      />
      <NumberField
        label="最多則數"
        value={options.maxMessages}
        min={1}
        max={200}
        onChange={set('options', 'maxMessages')}
      />
      <FieldRow label="隱藏的使用者" hint="這些帳號的訊息不會顯示">
        <TagsField
          value={options.hiddenUsers}
          onChange={set('options', 'hiddenUsers')}
          suggestions={BOT_SUGGESTIONS}
          normalize={(text) => text.trim().toLowerCase().replace(/^@/, '')}
          placeholder="新增使用者…"
        />
      </FieldRow>
      <FieldRow label="隱藏的指令前綴" hint="以這些字元開頭的訊息不會顯示">
        <TagsField
          value={options.hiddenPrefixes}
          onChange={set('options', 'hiddenPrefixes')}
          suggestions={PREFIX_SUGGESTIONS}
          normalize={(text) => text.trim()}
          placeholder="新增前綴…"
        />
      </FieldRow>
    </>
  );
}
