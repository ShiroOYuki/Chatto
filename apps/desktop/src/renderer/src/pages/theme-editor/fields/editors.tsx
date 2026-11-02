import type { BorderSpec, BorderStyle, BoxStyle, ShadowSpec } from '@chatto/core';
import { useMessages } from '../../../i18n';
import { CornersField, NumberField, SidesField } from './numbers';
import { ImageFrameEditor } from './ImageFrameEditor';
import { ColorRow, SelectRow, ToggleRow } from './rows';

const BORDER_STYLES: BorderStyle[] = ['none', 'solid', 'dashed', 'dotted', 'double'];

export function BorderEditor({ value, onChange }: { value: BorderSpec; onChange: (value: BorderSpec) => void }) {
  const m = useMessages().editorFields;
  return (
    <>
      <SelectRow
        label={m.borderStyle}
        value={value.style}
        options={BORDER_STYLES.map((style) => ({ value: style, label: m.borderStyles[style] }))}
        onChange={(style) => onChange({ ...value, style })}
      />
      {value.style !== 'none' ? (
        <>
          <NumberField
            label={m.borderWidth}
            value={value.width}
            min={0}
            max={8}
            step={0.5}
            unit="px"
            onChange={(width) => onChange({ ...value, width })}
          />
          <ColorRow label={m.borderColor} value={value.color} onChange={(color) => onChange({ ...value, color })} />
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
  const m = useMessages().editorFields;
  const set = (patch: Partial<ShadowSpec>) => value && onChange({ ...value, ...patch });
  return (
    <>
      <ToggleRow label={label} value={value !== null} onChange={(on) => onChange(on ? DEFAULT_SHADOW : null)} />
      {value ? (
        <div className="ml-4 border-l border-line pl-3">
          <NumberField label={m.shadowX} value={value.x} min={-20} max={20} unit="px" onChange={(x) => set({ x })} />
          <NumberField label={m.shadowY} value={value.y} min={-20} max={20} unit="px" onChange={(y) => set({ y })} />
          <NumberField
            label={m.shadowBlur}
            value={value.blur}
            min={0}
            max={40}
            unit="px"
            onChange={(blur) => set({ blur })}
          />
          {!text ? (
            <NumberField
              label={m.shadowSpread}
              value={value.spread}
              min={-10}
              max={20}
              unit="px"
              onChange={(spread) => set({ spread })}
            />
          ) : null}
          <ColorRow label={m.shadowColor} value={value.color} onChange={(color) => set({ color })} />
          {!text ? (
            <ToggleRow label={m.shadowInset} value={Boolean(value.inset)} onChange={(inset) => set({ inset })} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Every property of a box: fill, border, radius, padding, shadow, backdrop blur and image frame. */
export function BoxEditor({ value, onChange }: { value: BoxStyle; onChange: (value: BoxStyle) => void }) {
  const m = useMessages().editorFields;
  const set = (patch: Partial<BoxStyle>) => onChange({ ...value, ...patch });
  return (
    <>
      <ColorRow label={m.background} value={value.background} onChange={(background) => set({ background })} />
      <BorderEditor value={value.border} onChange={(border) => set({ border })} />
      <CornersField label={m.radius} value={value.radius} onChange={(radius) => set({ radius })} />
      <SidesField label={m.padding} value={value.padding} onChange={(padding) => set({ padding })} />
      <ShadowEditor label={m.shadow} value={value.shadow} onChange={(shadow) => set({ shadow })} />
      <NumberField
        label={m.backdropBlur}
        hint={m.backdropBlurHint}
        value={value.backdropBlur}
        min={0}
        max={30}
        unit="px"
        onChange={(backdropBlur) => set({ backdropBlur })}
      />
      <ImageFrameEditor value={value.image} onChange={(image) => set({ image })} />
    </>
  );
}
