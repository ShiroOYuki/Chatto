import { ColorRow, NumberField, SelectRow, TextRow } from '../fields';
import { ATTENTION_EFFECTS } from '../options';
import { PanelIntro, type PanelProps } from './shared';

/** How a message after a quiet spell stands out on the desktop overlay. */
export function AttentionPanel({ draft, set }: PanelProps) {
  const { attention } = draft;
  return (
    <>
      <PanelIntro>
        聊天室安靜一段時間後的第一則留言。只在桌面 Overlay 顯示，OBS 看不到；多久算安靜在「提醒」頁設定。
      </PanelIntro>
      <SelectRow
        label="效果"
        value={attention.effect}
        options={ATTENTION_EFFECTS}
        onChange={set('attention', 'effect')}
      />
      <ColorRow label="效果顏色" value={attention.color} onChange={set('attention', 'color')} />
      <NumberField label="播放次數" value={attention.repeat} min={0} max={10} onChange={set('attention', 'repeat')} />
      <TextRow
        label="標籤文字"
        hint="貼在訊息右上角，留空就不顯示"
        value={attention.label}
        onChange={set('attention', 'label')}
        placeholder="例如 新留言"
      />
      {attention.label ? (
        <ColorRow label="標籤文字顏色" value={attention.labelColor} onChange={set('attention', 'labelColor')} />
      ) : null}
    </>
  );
}
