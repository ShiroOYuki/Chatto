import {
  BoxEditor,
  ColorRow,
  NumberField,
  OptionalColorRow,
  SelectRow,
  TextRow,
  ToggleRow,
} from '../../../components/themeFields';
import { WEIGHTS } from '../options';
import { SubHeading, type PanelProps } from './shared';

export function AuthorPanel({ draft, set }: PanelProps) {
  const { author } = draft;
  return (
    <>
      <ColorRow label="名稱顏色" value={author.color} onChange={set('author', 'color')} />
      <SelectRow
        label="字重"
        value={String(author.weight)}
        options={WEIGHTS}
        onChange={(value) => set('author', 'weight')(Number(value))}
      />
      <NumberField
        label="大小"
        value={author.size}
        min={0.5}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('author', 'size')}
      />
      <SelectRow
        label="大小寫"
        value={author.transform}
        options={[
          { value: 'none', label: '原樣' },
          { value: 'uppercase', label: '全部大寫' },
          { value: 'lowercase', label: '全部小寫' },
          { value: 'capitalize', label: '字首大寫' },
        ]}
        onChange={set('author', 'transform')}
      />
      <TextRow label="前綴" value={author.prefix} onChange={set('author', 'prefix')} placeholder="例如 @" />
      <TextRow label="後綴" value={author.suffix} onChange={set('author', 'suffix')} />
      <TextRow
        label="分隔符號"
        hint="名稱與內容之間"
        value={author.separator}
        onChange={set('author', 'separator')}
        placeholder="例如 :"
      />
      <SubHeading>名稱框（時間、徽章、名稱的外框）</SubHeading>
      <BoxEditor value={author.box} onChange={set('author', 'box')} />
    </>
  );
}

export function BodyPanel({ draft, set }: PanelProps) {
  const { body, text } = draft;
  return (
    <>
      <OptionalColorRow
        label="內容顏色"
        value={body.color || undefined}
        fallback={text.color}
        onChange={(value) => set('body', 'color')(value ?? '')}
      />
      <NumberField
        label="大小"
        value={body.size}
        min={0.5}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('body', 'size')}
      />
      <SelectRow
        label="字重"
        value={String(body.weight)}
        options={WEIGHTS}
        onChange={(value) => set('body', 'weight')(Number(value))}
      />
      <ToggleRow label="斜體" value={body.italic} onChange={set('body', 'italic')} />
      <SubHeading>內容框（例如對話泡泡）</SubHeading>
      <BoxEditor value={body.box} onChange={set('body', 'box')} />
    </>
  );
}

export function PartsPanel({ draft, set }: PanelProps) {
  const { avatar, badges, timestamp, emote, mention, reply } = draft;
  return (
    <>
      <div className="text-xs font-medium text-ink-faint">頭像</div>
      <NumberField label="尺寸" value={avatar.size} min={12} max={64} unit="px" onChange={set('avatar', 'size')} />
      <NumberField
        label="圓角"
        hint="50% 為圓形"
        value={avatar.radius}
        min={0}
        max={50}
        unit="%"
        onChange={set('avatar', 'radius')}
      />
      <SubHeading>徽章</SubHeading>
      <NumberField
        label="尺寸"
        value={badges.size}
        min={0.6}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('badges', 'size')}
      />
      <NumberField label="間距" value={badges.gap} min={0} max={12} unit="px" onChange={set('badges', 'gap')} />
      <NumberField label="圓角" value={badges.radius} min={0} max={12} unit="px" onChange={set('badges', 'radius')} />
      <SubHeading>時間</SubHeading>
      <ColorRow label="顏色" value={timestamp.color} onChange={set('timestamp', 'color')} />
      <NumberField
        label="大小"
        value={timestamp.size}
        min={0.5}
        max={1.5}
        step={0.05}
        unit="em"
        onChange={set('timestamp', 'size')}
      />
      <SubHeading>表情符號</SubHeading>
      <NumberField
        label="大小"
        value={emote.size}
        min={1}
        max={4}
        step={0.05}
        unit="em"
        onChange={set('emote', 'size')}
      />
      <SubHeading>提及與連結</SubHeading>
      <ColorRow label="顏色" value={mention.color} onChange={set('mention', 'color')} />
      <ColorRow label="底色" value={mention.background} onChange={set('mention', 'background')} />
      <SelectRow
        label="字重"
        value={String(mention.weight)}
        options={WEIGHTS}
        onChange={(value) => set('mention', 'weight')(Number(value))}
      />
      <SubHeading>回覆引用</SubHeading>
      <ToggleRow label="顯示回覆" value={reply.show} onChange={set('reply', 'show')} />
      <ColorRow label="顏色" value={reply.color} onChange={set('reply', 'color')} />
    </>
  );
}
