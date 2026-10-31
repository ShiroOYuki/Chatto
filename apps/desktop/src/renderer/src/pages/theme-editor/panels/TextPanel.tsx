import { ColorRow, NumberField, SelectRow, ShadowEditor, TextRow } from '../fields';
import { FONTS, WEIGHTS } from '../options';
import type { PanelProps } from './shared';

export function TextPanel({ draft, set }: PanelProps) {
  const { font, text } = draft;
  return (
    <>
      <SelectRow
        label="字型"
        value={FONTS.some((item) => item.value === font.family) ? font.family : 'custom'}
        options={[...FONTS, { value: 'custom', label: '自訂…' }]}
        onChange={(value) => value !== 'custom' && set('font', 'family')(value)}
      />
      <TextRow
        label="font-family"
        hint="可填入已安裝的字型"
        value={font.family}
        onChange={set('font', 'family')}
        mono
      />
      <NumberField label="字級" value={font.size} min={10} max={48} unit="px" onChange={set('font', 'size')} />
      <NumberField
        label="行高"
        value={font.lineHeight}
        min={1}
        max={2.4}
        step={0.05}
        onChange={set('font', 'lineHeight')}
      />
      <NumberField
        label="字距"
        value={font.letterSpacing}
        min={-0.1}
        max={0.3}
        step={0.01}
        unit="em"
        onChange={set('font', 'letterSpacing')}
      />
      <SelectRow
        label="字重"
        value={String(font.weight)}
        options={WEIGHTS}
        onChange={(value) => set('font', 'weight')(Number(value))}
      />
      <ColorRow label="文字顏色" value={text.color} onChange={set('text', 'color')} />
      <ColorRow label="次要文字" value={text.mutedColor} onChange={set('text', 'mutedColor')} />
      <ColorRow label="強調色" value={text.accentColor} onChange={set('text', 'accentColor')} />
      <NumberField
        label="文字描邊"
        value={text.strokeWidth}
        min={0}
        max={10}
        step={0.5}
        unit="px"
        onChange={set('text', 'strokeWidth')}
      />
      {text.strokeWidth > 0 ? (
        <ColorRow label="描邊顏色" value={text.strokeColor} onChange={set('text', 'strokeColor')} />
      ) : null}
      <ShadowEditor label="文字陰影" value={text.shadow} onChange={set('text', 'shadow')} text />
    </>
  );
}
