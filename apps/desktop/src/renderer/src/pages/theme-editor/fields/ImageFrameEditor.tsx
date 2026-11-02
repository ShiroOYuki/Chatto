import { DEFAULT_BOX_IMAGE } from '@chatto/chat-ui';
import { assetFileOf, type BoxImage, type BoxImageRepeat } from '@chatto/core';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/kit';
import { useMessages } from '../../../i18n';
import { themes, useThemeAssetUrl } from '../../../services/themes';
import { NumberField, SidesField } from './numbers';
import { FieldRow, SelectRow, ToggleRow } from './rows';
import { guessSlice, SliceEditor, type ImageSize } from './SliceEditor';

const REPEATS: BoxImageRepeat[] = ['stretch', 'repeat', 'round', 'space'];

/** The URL a frame image loads from in the control panel. */
function useFrameUrl(src: string): string {
  const assetUrl = useThemeAssetUrl();
  const file = assetFileOf(src);
  return file ? assetUrl(file) : src;
}

/** Natural size of an image, or null until it has loaded. */
function useImageSize(url: string): ImageSize | null {
  const [size, setSize] = useState<{ url: string; size: ImageSize } | null>(null);
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => alive && setSize({ url, size: { width: image.naturalWidth, height: image.naturalHeight } });
    image.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return size?.url === url ? size.size : null;
}

/**
 * Picks a nine-slice frame image for a box (or a role) and tunes how it is cut
 * and drawn. `null` means no frame.
 */
export function ImageFrameEditor({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: BoxImage | null | undefined;
  onChange: (value: BoxImage | null) => void;
}) {
  const messages = useMessages();
  const m = messages.editorFields.frame;
  const [error, setError] = useState<string | null>(null);
  // A freshly picked image gets its slice lines guessed once its size is known.
  const [guessFor, setGuessFor] = useState<string | null>(null);
  const pick = async () => {
    setError(null);
    try {
      const src = await themes.importAsset();
      if (!src) return;
      setGuessFor(src);
      onChange({ ...DEFAULT_BOX_IMAGE, ...value, src, slice: value?.slice ?? DEFAULT_BOX_IMAGE.slice });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <>
      <FieldRow label={label ?? m.label} hint={m.hint}>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void pick()}>
            <ImagePlus /> {value ? m.change : m.choose}
          </Button>
          {value ? (
            <Button size="sm" variant="danger" onClick={() => onChange(null)}>
              <Trash2 /> {messages.common.remove}
            </Button>
          ) : null}
          {error ? (
            <span role="alert" className="text-xs text-danger">
              {error}
            </span>
          ) : null}
        </div>
      </FieldRow>
      {value ? (
        <FrameSettings value={value} onChange={onChange} guessFor={guessFor} onGuessed={() => setGuessFor(null)} />
      ) : null}
    </>
  );
}

function FrameSettings({
  value,
  onChange,
  guessFor,
  onGuessed,
}: {
  value: BoxImage;
  onChange: (value: BoxImage) => void;
  /** Source whose slice lines should be guessed when its size is known. */
  guessFor: string | null;
  onGuessed: () => void;
}) {
  const m = useMessages().editorFields.frame;
  const url = useFrameUrl(value.src);
  const size = useImageSize(url);
  const set = (patch: Partial<BoxImage>) => onChange({ ...value, ...patch });

  // A freshly picked image starts from thirds instead of the previous image's lines.
  useEffect(() => {
    if (!size || guessFor !== value.src) return;
    onGuessed();
    onChange({ ...value, slice: guessSlice(size) });
  }, [size, guessFor, value, onChange, onGuessed]);

  return (
    <div className="ml-4 border-l border-line pl-3">
      {size ? (
        <>
          <SliceEditor url={url} size={size} slice={value.slice} onChange={(slice) => set({ slice })} />
          <p className="mt-1 mb-2 text-center text-[11px] text-ink-faint">
            {size.width} × {size.height} px · {m.sliceHelp}
          </p>
        </>
      ) : (
        <p className="py-3 text-center text-xs text-ink-faint">{m.loading}</p>
      )}
      <SidesField
        label={m.slice}
        value={value.slice}
        max={Math.max(40, size ? Math.max(size.width, size.height) : 0)}
        onChange={(slice) => set({ slice })}
      />
      <NumberField
        label={m.scale}
        hint={m.scaleHint}
        value={value.scale}
        min={0.25}
        max={4}
        step={0.25}
        unit="×"
        onChange={(scale) => set({ scale })}
      />
      <SelectRow
        label={m.edges}
        value={value.repeat}
        options={REPEATS.map((repeat) => ({ value: repeat, label: m.repeats[repeat] }))}
        onChange={(repeat) => set({ repeat })}
      />
      <ToggleRow label={m.fill} value={value.fill} onChange={(fill) => set({ fill })} />
      <SidesField label={m.outset} value={value.outset} onChange={(outset) => set({ outset })} />
      <p className="py-1.5 text-[11px] leading-relaxed text-ink-faint">{m.note}</p>
    </div>
  );
}
