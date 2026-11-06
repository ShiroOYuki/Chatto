import { LOCALE_NAMES, LOCALES, type Locale } from '@chatto/core';
import { ColorRow, NumberField, SelectRow, TextRow } from '../fields';
import { useMessages } from '../../../i18n';
import { attentionEffectOptions } from '../options';
import { PanelIntro, type PanelProps } from './shared';

/** How a message after a quiet spell stands out on the desktop overlay. */
export function AttentionPanel({ draft, set }: PanelProps) {
  const { attention } = draft;
  const labels = attention.labels ?? {};
  const messages = useMessages().editorPanels;
  const m = messages.attention;
  const shown = Boolean(attention.label || Object.values(labels).some(Boolean));
  const setLabel = (locale: Locale) => (text: string) => {
    const next = { ...labels, [locale]: text };
    for (const key of LOCALES) if (!next[key]) delete next[key];
    set('attention', 'labels')(Object.keys(next).length > 0 ? next : undefined);
  };
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
      {shown
        ? LOCALES.map((locale) => (
            <TextRow
              key={locale}
              label={m.labelIn(LOCALE_NAMES[locale])}
              hint={m.labelInHint}
              value={labels[locale] ?? ''}
              onChange={setLabel(locale)}
              placeholder={attention.label}
            />
          ))
        : null}
      {shown ? (
        <ColorRow label={m.labelColor} value={attention.labelColor} onChange={set('attention', 'labelColor')} />
      ) : null}
    </>
  );
}
