import { DEFAULT_BOX_IMAGE } from '@chatto/chat-ui';
import { assetFileOf, type BoxImage, type BoxImageRepeat } from '@chatto/core';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/kit';
import { themes, useThemeAssetUrl } from '../../../services/themes';
import { NumberField, SidesField } from './numbers';
import { FieldRow, SelectRow, ToggleRow } from './rows';
import { guessSlice, SliceEditor, type ImageSize } from './SliceEditor';

const REPEATS: { value: BoxImageRepeat; label: string }[] = [
  { value: 'stretch', label: '拉伸' },
  { value: 'repeat', label: '重複' },
  { value: 'round', label: '重複（整數）' },
  { value: 'space', label: '重複（留間距）' },
];

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
  label = '圖片外框',
  value,
  onChange,
}: {
  label?: string;
  value: BoxImage | null | undefined;
  onChange: (value: BoxImage | null) => void;
}) {
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
      <FieldRow label={label} hint="九宮格：四角固定，四邊延伸">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void pick()}>
            <ImagePlus /> {value ? '更換圖片' : '選擇圖片'}
          </Button>
          {value ? (
            <Button size="sm" variant="danger" onClick={() => onChange(null)}>
              <Trash2 /> 移除
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
            {size.width} × {size.height} px · 拖曳虛線調整切線，或聚焦後用方向鍵
          </p>
        </>
      ) : (
        <p className="py-3 text-center text-xs text-ink-faint">載入圖片中…</p>
      )}
      <SidesField
        label="切線"
        value={value.slice}
        max={Math.max(40, size ? Math.max(size.width, size.height) : 0)}
        onChange={(slice) => set({ slice })}
      />
      <NumberField
        label="縮放"
        hint="高解析度圖片用 0.5"
        value={value.scale}
        min={0.25}
        max={4}
        step={0.25}
        unit="×"
        onChange={(scale) => set({ scale })}
      />
      <SelectRow label="邊緣" value={value.repeat} options={REPEATS} onChange={(repeat) => set({ repeat })} />
      <ToggleRow label="填滿中間" value={value.fill} onChange={(fill) => set({ fill })} />
      <SidesField label="外擴" value={value.outset} onChange={(outset) => set({ outset })} />
      <p className="py-1.5 text-[11px] leading-relaxed text-ink-faint">
        有圖片時框線設定不作用；圓角只影響背景，陰影會沿著圖片（連文字一起）投影。內距建議不小於外框寬度。
      </p>
    </div>
  );
}
