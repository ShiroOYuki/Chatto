import { ColorRow, NumberField, SelectRow, TextRow } from '../fields';
import { useMessages } from '../../../i18n';
import { attentionEffectOptions } from '../options';
import { PanelIntro, type PanelProps } from './shared';

/** How a message after a quiet spell stands out on the desktop overlay. */
export function AttentionPanel({ draft, set }: PanelProps) {
  const { attention } = draft;
  const messages = useMessages().editorPanels;
  const m = messages.attention;
  return (
    <>
      <PanelIntro>{m.intro}</PanelIntro>
      <SelectRow
        label={m.effect}
        value={attention.effect}
        options={attentionEffectOptions(messages)}
        onChange={set('attention', 'effect')}
      />
      <ColorRow label={m.color} value={attention.color} onChange={set('attention', 'color')} />
      <NumberField label={m.repeat} value={attention.repeat} min={0} max={10} onChange={set('attention', 'repeat')} />
      <TextRow
        label={m.label}
        hint={m.labelHint}
        value={attention.label}
        onChange={set('attention', 'label')}
        placeholder={m.labelPlaceholder}
      />
      {attention.label ? (
        <ColorRow label={m.labelColor} value={attention.labelColor} onChange={set('attention', 'labelColor')} />
      ) : null}
    </>
  );
}
