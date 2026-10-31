import type { BorderSpec, BorderStyle, BoxStyle, ShadowSpec } from '@chatto/core';
import { CornersField, NumberField, SidesField } from './numbers';
import { ColorRow, SelectRow, ToggleRow } from './rows';

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'solid', label: '實線' },
  { value: 'dashed', label: '虛線' },
  { value: 'dotted', label: '點線' },
  { value: 'double', label: '雙線' },
];

export function BorderEditor({ value, onChange }: { value: BorderSpec; onChange: (value: BorderSpec) => void }) {
  return (
    <>
      <SelectRow
        label="框線樣式"
        value={value.style}
        options={BORDER_STYLES}
        onChange={(style) => onChange({ ...value, style })}
      />
      {value.style !== 'none' ? (
        <>
          <NumberField
            label="框線粗細"
            value={value.width}
            min={0}
            max={8}
            step={0.5}
            unit="px"
            onChange={(width) => onChange({ ...value, width })}
          />
          <ColorRow label="框線顏色" value={value.color} onChange={(color) => onChange({ ...value, color })} />
        </>
      ) : null}
    </>
  );
}

const DEFAULT_SHADOW: ShadowSpec = { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0, 0, 0, 0.35)' };

export function ShadowEditor({
  label,
  value,
  onChange,
  text = false,
}: {
  label: string;
  value: ShadowSpec | null;
  onChange: (value: ShadowSpec | null) => void;
  /** Text shadows have no spread or inset. */
  text?: boolean;
}) {
  const set = (patch: Partial<ShadowSpec>) => value && onChange({ ...value, ...patch });
  return (
    <>
      <ToggleRow label={label} value={value !== null} onChange={(on) => onChange(on ? DEFAULT_SHADOW : null)} />
      {value ? (
        <div className="ml-4 border-l border-line pl-3">
          <NumberField label="水平位移" value={value.x} min={-20} max={20} unit="px" onChange={(x) => set({ x })} />
          <NumberField label="垂直位移" value={value.y} min={-20} max={20} unit="px" onChange={(y) => set({ y })} />
          <NumberField label="模糊" value={value.blur} min={0} max={40} unit="px" onChange={(blur) => set({ blur })} />
          {!text ? (
            <NumberField
              label="擴散"
              value={value.spread}
              min={-10}
              max={20}
              unit="px"
              onChange={(spread) => set({ spread })}
            />
          ) : null}
          <ColorRow label="陰影顏色" value={value.color} onChange={(color) => set({ color })} />
          {!text ? (
            <ToggleRow label="內陰影" value={Boolean(value.inset)} onChange={(inset) => set({ inset })} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Every property of a box: fill, border, radius, padding, shadow and backdrop blur. */
export function BoxEditor({ value, onChange }: { value: BoxStyle; onChange: (value: BoxStyle) => void }) {
  const set = (patch: Partial<BoxStyle>) => onChange({ ...value, ...patch });
  return (
    <>
      <ColorRow label="背景" value={value.background} onChange={(background) => set({ background })} />
      <BorderEditor value={value.border} onChange={(border) => set({ border })} />
      <CornersField label="圓角" value={value.radius} onChange={(radius) => set({ radius })} />
      <SidesField label="內距" value={value.padding} onChange={(padding) => set({ padding })} />
      <ShadowEditor label="陰影" value={value.shadow} onChange={(shadow) => set({ shadow })} />
      <NumberField
        label="背景模糊"
        hint="霧面玻璃效果"
        value={value.backdropBlur}
        min={0}
        max={30}
        unit="px"
        onChange={(backdropBlur) => set({ backdropBlur })}
      />
    </>
  );
}
