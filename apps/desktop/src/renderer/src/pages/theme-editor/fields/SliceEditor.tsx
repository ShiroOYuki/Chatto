import type { Sides } from '@chatto/core';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

export interface ImageSize {
  width: number;
  height: number;
}

type Edge = 0 | 1 | 2 | 3;
const EDGES: { edge: Edge; label: string }[] = [
  { edge: 0, label: '上切線' },
  { edge: 1, label: '右切線' },
  { edge: 2, label: '下切線' },
  { edge: 3, label: '左切線' },
];
const vertical = (edge: Edge) => edge === 1 || edge === 3;

/** Keeps each slice inside the image and opposite slices from crossing. */
export function clampSlice(slice: Sides, edge: Edge, value: number, size: ImageSize): Sides {
  const span = vertical(edge) ? size.width : size.height;
  const opposite = slice[((edge + 2) % 4) as Edge];
  const next = [...slice] as Sides;
  next[edge] = Math.round(Math.min(Math.max(0, value), span - opposite));
  return next;
}

/** A first guess for a new image: thirds, the classic nine-slice split. */
export const guessSlice = (size: ImageSize): Sides => {
  const y = Math.floor(size.height / 3);
  const x = Math.floor(size.width / 3);
  return [y, x, y, x];
};

/**
 * Shows the frame image with its four slice lines; drag a line (or focus it and
 * use the arrow keys, Shift for 10 px) to move it. Values are image pixels.
 */
export function SliceEditor({
  url,
  size,
  slice,
  onChange,
}: {
  url: string;
  size: ImageSize;
  slice: Sides;
  onChange: (slice: Sides) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  // Small pixel art is shown larger; big images shrink to fit the panel.
  const zoom = Math.min(4, 220 / size.width, 220 / size.height);
  const shown = { width: size.width * zoom, height: size.height * zoom };
  const set = (edge: Edge, value: number) => onChange(clampSlice(slice, edge, value, size));

  const drag = (edge: Edge) => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const move = (moveEvent: globalThis.PointerEvent) => {
      const rect = frame.current!.getBoundingClientRect();
      const x = (moveEvent.clientX - rect.left) / zoom;
      const y = (moveEvent.clientY - rect.top) / zoom;
      const value = edge === 0 ? y : edge === 1 ? size.width - x : edge === 2 ? size.height - y : x;
      set(edge, value);
    };
    const stop = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const keys = (edge: Edge) => (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    // Arrows move the line on screen: down/right grow the top/left slices and shrink the others.
    const toward = vertical(edge) ? { ArrowRight: 1, ArrowLeft: -1 } : { ArrowDown: 1, ArrowUp: -1 };
    const direction = toward[event.key as keyof typeof toward];
    if (!direction) return;
    event.preventDefault();
    const sign = edge === 0 || edge === 3 ? 1 : -1;
    set(edge, slice[edge] + direction * sign * step);
  };

  const position = (edge: Edge) => {
    const at = slice[edge] * zoom;
    if (edge === 0) return { top: at, left: 0, right: 0 };
    if (edge === 2) return { bottom: at, left: 0, right: 0 };
    if (edge === 3) return { left: at, top: 0, bottom: 0 };
    return { right: at, top: 0, bottom: 0 };
  };

  return (
    <div className="grid place-items-center rounded-xl bg-[repeating-conic-gradient(#d9d9d4_0%_25%,#f4f4f0_0%_50%)] bg-size-[16px_16px] p-4">
      <div ref={frame} className="relative" style={shown}>
        <img
          src={url}
          alt="外框圖片"
          draggable={false}
          // Keep tiny pixel art crisp when it is blown up; smooth everything else.
          className={`block size-full select-none ${zoom >= 3 ? '[image-rendering:pixelated]' : ''}`}
        />
        {EDGES.map(({ edge, label }) => (
          <div
            key={edge}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-orientation={vertical(edge) ? 'horizontal' : 'vertical'}
            aria-valuemin={0}
            aria-valuemax={vertical(edge) ? size.width : size.height}
            aria-valuenow={slice[edge]}
            onPointerDown={drag(edge)}
            onKeyDown={keys(edge)}
            className={`group absolute grid touch-none outline-none ${
              vertical(edge) ? '-mx-1.5 w-3 cursor-ew-resize' : '-my-1.5 h-3 cursor-ns-resize'
            }`}
            style={position(edge)}
          >
            <span
              className={`m-auto border-sakura group-hover:border-sakura group-focus-visible:border-matcha-strong ${
                vertical(edge) ? 'h-full border-l-2 border-dashed' : 'w-full border-t-2 border-dashed'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
