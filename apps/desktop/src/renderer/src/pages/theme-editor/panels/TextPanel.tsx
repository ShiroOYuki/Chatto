import { ColorRow, NumberField, SelectRow, ShadowEditor, TextRow } from '../fields';
import { useMessages } from '../../../i18n';
import { fontOptions, WEIGHTS } from '../options';
import type { PanelProps } from './shared';

export function TextPanel({ draft, set }: PanelProps) {
  const { font, text } = draft;
  const m = useMessages().editorPanels.text;
  const fonts = fontOptions(useMessages().editorPanels);
  return (
    <>
      <SelectRow
        label={m.font}
        value={fonts.some((item) => item.value === font.family) ? font.family : 'custom'}
        options={[...fonts, { value: 'custom', label: m.customFont }]}
        onChange={(value) => value !== 'custom' && set('font', 'family')(value)}
      />
      <TextRow label="font-family" hint={m.familyHint} value={font.family} onChange={set('font', 'family')} mono />
      <NumberField label={m.size} value={font.size} min={10} max={48} unit="px" onChange={set('font', 'size')} />
      <NumberField
        label={m.lineHeight}
        value={font.lineHeight}
        min={1}
        max={2.4}
        step={0.05}
        onChange={set('font', 'lineHeight')}
      />
      <NumberField
        label={m.letterSpacing}
        value={font.letterSpacing}
        min={-0.1}
        max={0.3}
        step={0.01}
        unit="em"
        onChange={set('font', 'letterSpacing')}
      />
      <SelectRow
        label={m.weight}
        value={String(font.weight)}
        options={WEIGHTS}
        onChange={(value) => set('font', 'weight')(Number(value))}
      />
      <ColorRow label={m.color} value={text.color} onChange={set('text', 'color')} />
      <ColorRow label={m.muted} value={text.mutedColor} onChange={set('text', 'mutedColor')} />
      <ColorRow label={m.accent} value={text.accentColor} onChange={set('text', 'accentColor')} />
      <NumberField
        label={m.stroke}
        value={text.strokeWidth}
        min={0}
        max={10}
        step={0.5}
        unit="px"
        onChange={set('text', 'strokeWidth')}
      />
      {text.strokeWidth > 0 ? (
        <ColorRow label={m.strokeColor} value={text.strokeColor} onChange={set('text', 'strokeColor')} />
      ) : null}
      <ShadowEditor label={m.shadow} value={text.shadow} onChange={set('text', 'shadow')} text />
    </>
  );
}
