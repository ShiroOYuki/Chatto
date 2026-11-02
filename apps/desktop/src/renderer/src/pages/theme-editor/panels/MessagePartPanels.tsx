import { BoxEditor, ColorRow, NumberField, OptionalColorRow, SelectRow, TextRow, ToggleRow } from '../fields';
import { useMessages } from '../../../i18n';
import { WEIGHTS } from '../options';
import { SubHeading, type PanelProps } from './shared';

export function AuthorPanel({ draft, set }: PanelProps) {
  const { author } = draft;
  const m = useMessages().editorPanels.author;
  return (
    <>
      <ColorRow label={m.color} value={author.color} onChange={set('author', 'color')} />
      <SelectRow
        label={m.weight}
        value={String(author.weight)}
        options={WEIGHTS}
        onChange={(value) => set('author', 'weight')(Number(value))}
      />
      <NumberField
        label={m.size}
        value={author.size}
        min={0.5}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('author', 'size')}
      />
      <SelectRow
        label={m.transform}
        value={author.transform}
        options={[
          { value: 'none', label: m.transforms.none },
          { value: 'uppercase', label: m.transforms.uppercase },
          { value: 'lowercase', label: m.transforms.lowercase },
          { value: 'capitalize', label: m.transforms.capitalize },
        ]}
        onChange={set('author', 'transform')}
      />
      <TextRow
        label={m.prefix}
        value={author.prefix}
        onChange={set('author', 'prefix')}
        placeholder={m.prefixPlaceholder}
      />
      <TextRow label={m.suffix} value={author.suffix} onChange={set('author', 'suffix')} />
      <TextRow
        label={m.separator}
        hint={m.separatorHint}
        value={author.separator}
        onChange={set('author', 'separator')}
        placeholder={m.separatorPlaceholder}
      />
      <SubHeading>{m.box}</SubHeading>
      <BoxEditor value={author.box} onChange={set('author', 'box')} />
    </>
  );
}

export function BodyPanel({ draft, set }: PanelProps) {
  const { body, text } = draft;
  const m = useMessages().editorPanels.body;
  return (
    <>
      <OptionalColorRow
        label={m.color}
        value={body.color || undefined}
        fallback={text.color}
        onChange={(value) => set('body', 'color')(value ?? '')}
      />
      <NumberField
        label={m.size}
        value={body.size}
        min={0.5}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('body', 'size')}
      />
      <SelectRow
        label={m.weight}
        value={String(body.weight)}
        options={WEIGHTS}
        onChange={(value) => set('body', 'weight')(Number(value))}
      />
      <ToggleRow label={m.italic} value={body.italic} onChange={set('body', 'italic')} />
      <SubHeading>{m.box}</SubHeading>
      <BoxEditor value={body.box} onChange={set('body', 'box')} />
    </>
  );
}

export function PartsPanel({ draft, set }: PanelProps) {
  const { avatar, badges, timestamp, emote, mention, reply } = draft;
  const m = useMessages().editorPanels.parts;
  return (
    <>
      <div className="text-xs font-medium text-ink-faint">{m.avatar}</div>
      <NumberField label={m.size} value={avatar.size} min={12} max={64} unit="px" onChange={set('avatar', 'size')} />
      <NumberField
        label={m.radius}
        hint={m.radiusHint}
        value={avatar.radius}
        min={0}
        max={50}
        unit="%"
        onChange={set('avatar', 'radius')}
      />
      <SubHeading>{m.badges}</SubHeading>
      <NumberField
        label={m.size}
        value={badges.size}
        min={0.6}
        max={2}
        step={0.05}
        unit="em"
        onChange={set('badges', 'size')}
      />
      <NumberField label={m.gap} value={badges.gap} min={0} max={12} unit="px" onChange={set('badges', 'gap')} />
      <NumberField
        label={m.radius}
        value={badges.radius}
        min={0}
        max={12}
        unit="px"
        onChange={set('badges', 'radius')}
      />
      <SubHeading>{m.time}</SubHeading>
      <ColorRow label={m.color} value={timestamp.color} onChange={set('timestamp', 'color')} />
      <NumberField
        label={m.textSize}
        value={timestamp.size}
        min={0.5}
        max={1.5}
        step={0.05}
        unit="em"
        onChange={set('timestamp', 'size')}
      />
      <SubHeading>{m.emotes}</SubHeading>
      <NumberField
        label={m.textSize}
        value={emote.size}
        min={1}
        max={4}
        step={0.05}
        unit="em"
        onChange={set('emote', 'size')}
      />
      <SubHeading>{m.mentions}</SubHeading>
      <ColorRow label={m.color} value={mention.color} onChange={set('mention', 'color')} />
      <ColorRow label={m.background} value={mention.background} onChange={set('mention', 'background')} />
      <SelectRow
        label={m.weight}
        value={String(mention.weight)}
        options={WEIGHTS}
        onChange={(value) => set('mention', 'weight')(Number(value))}
      />
      <SubHeading>{m.reply}</SubHeading>
      <ToggleRow label={m.showReply} value={reply.show} onChange={set('reply', 'show')} />
      <ColorRow label={m.color} value={reply.color} onChange={set('reply', 'color')} />
    </>
  );
}
