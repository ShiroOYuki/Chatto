import { TagsField } from '../../../components/kit';
import { FieldRow, NumberField, SelectRow } from '../fields';
import { useMessages } from '../../../i18n';
import { animationOptions, BOT_SUGGESTIONS, exitAnimationOptions, PREFIX_SUGGESTIONS } from '../options';
import type { PanelProps } from './shared';

export function MotionPanel({ draft, set }: PanelProps) {
  const { animation } = draft;
  const messages = useMessages().editorPanels;
  const m = messages.motion;
  return (
    <>
      <SelectRow
        label={m.enter}
        value={animation.enter}
        options={animationOptions(messages)}
        onChange={set('animation', 'enter')}
      />
      <NumberField
        label={m.duration}
        value={animation.duration}
        min={0}
        max={1500}
        step={10}
        unit="ms"
        onChange={set('animation', 'duration')}
      />
      <SelectRow
        label={m.exit}
        hint={m.exitHint}
        value={animation.exit}
        options={exitAnimationOptions(messages)}
        onChange={set('animation', 'exit')}
      />
    </>
  );
}

export function BehaviorPanel({ draft, set }: PanelProps) {
  const { options } = draft;
  const m = useMessages().editorPanels.behavior;
  return (
    <>
      <NumberField
        label={m.lifetime}
        hint={m.lifetimeHint}
        value={options.messageLifetime}
        min={0}
        max={300}
        unit="s"
        onChange={set('options', 'messageLifetime')}
      />
      <NumberField
        label={m.maxMessages}
        value={options.maxMessages}
        min={1}
        max={200}
        onChange={set('options', 'maxMessages')}
      />
      <FieldRow label={m.hiddenUsers} hint={m.hiddenUsersHint}>
        <TagsField
          value={options.hiddenUsers}
          onChange={set('options', 'hiddenUsers')}
          suggestions={BOT_SUGGESTIONS}
          normalize={(text) => text.trim().toLowerCase().replace(/^@/, '')}
          placeholder={m.addUser}
        />
      </FieldRow>
      <FieldRow label={m.hiddenPrefixes} hint={m.hiddenPrefixesHint}>
        <TagsField
          value={options.hiddenPrefixes}
          onChange={set('options', 'hiddenPrefixes')}
          suggestions={PREFIX_SUGGESTIONS}
          normalize={(text) => text.trim()}
          placeholder={m.addPrefix}
        />
      </FieldRow>
    </>
  );
}
