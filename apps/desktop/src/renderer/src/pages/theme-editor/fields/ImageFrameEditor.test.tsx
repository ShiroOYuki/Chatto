import { DEFAULT_BOX_IMAGE } from '@chatto/chat-ui';
import type { BoxImage, Sides } from '@chatto/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../../../../tests/fake-api';
import { api as mockedApi } from '../../../api';
import { TooltipProvider } from '../../../components/ui/tooltip';
import { ImageFrameEditor } from './ImageFrameEditor';
import { clampSlice, guessSlice, SliceEditor } from './SliceEditor';

vi.mock('../../../api', async () => {
  const { createFakeApi } = await import('../../../../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;
const SRC = `asset:${'a'.repeat(64)}.png`;

describe('slice lines', () => {
  const size = { width: 90, height: 60 };

  it('stay inside the image and never cross the opposite line', () => {
    expect(clampSlice([10, 10, 10, 10], 0, -5, size)).toEqual([0, 10, 10, 10]);
    expect(clampSlice([10, 10, 30, 10], 0, 45, size)).toEqual([30, 10, 30, 10]);
    expect(clampSlice([10, 50, 10, 10], 3, 70.6, size)).toEqual([10, 50, 10, 40]);
  });

  it('start from thirds for a new image', () => {
    expect(guessSlice(size)).toEqual([20, 30, 20, 30]);
  });

  it('move with the arrow keys, Shift for bigger steps', async () => {
    function Harness() {
      const [slice, setSlice] = useState<Sides>([10, 10, 10, 10]);
      return <SliceEditor url="data:image/png;base64,AAAA" size={size} slice={slice} onChange={setSlice} />;
    }
    render(<Harness />);
    const top = screen.getByRole('slider', { name: '上切線' });
    const right = screen.getByRole('slider', { name: '右切線' });
    top.focus();
    await userEvent.keyboard('{ArrowDown}{Shift>}{ArrowDown}{/Shift}');
    expect(top.getAttribute('aria-valuenow')).toBe('21');
    right.focus();
    // Moving the right line to the right makes its slice smaller.
    await userEvent.keyboard('{ArrowRight}');
    expect(right.getAttribute('aria-valuenow')).toBe('9');
  });
});

describe('ImageFrameEditor', () => {
  function Harness({ initial = null }: { initial?: BoxImage | null }) {
    const [value, setValue] = useState<BoxImage | null>(initial);
    return (
      <TooltipProvider>
        <ImageFrameEditor value={value} onChange={setValue} />
        <output data-testid="value">{JSON.stringify(value)}</output>
      </TooltipProvider>
    );
  }
  const current = () => JSON.parse(screen.getByTestId('value').textContent!) as BoxImage | null;

  it('adds a frame from the picked image and removes it again', async () => {
    api.importThemeAsset.mockResolvedValueOnce(SRC);
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '選擇圖片' }));
    expect(current()).toEqual({ ...DEFAULT_BOX_IMAGE, src: SRC });
    expect(screen.getByRole('button', { name: '更換圖片' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: '移除' }));
    expect(current()).toBeNull();
  });

  it('keeps the frame when the picker is cancelled and shows why an image was refused', async () => {
    const frame = { ...DEFAULT_BOX_IMAGE, src: SRC, scale: 2 };
    render(<Harness initial={frame} />);
    api.importThemeAsset.mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole('button', { name: '更換圖片' }));
    expect(current()).toEqual(frame);

    api.importThemeAsset.mockRejectedValueOnce(new Error('只支援 PNG、WebP、GIF 圖片'));
    await userEvent.click(screen.getByRole('button', { name: '更換圖片' }));
    expect(screen.getByRole('alert').textContent).toContain('只支援 PNG');
    expect(current()).toEqual(frame);
  });
});
