import type { ViewerTarget } from '@chatto/core';
import { useState } from 'react';
import { TeaCup } from './components/TeaCup';
import { useAppState, useMessageRate } from './hooks';
import { AccountTile, ChannelTile, EmbedTile, HeroTile, OverlayTile, PreviewTile, ThemeTile } from './tiles';

export function App() {
  const state = useAppState();
  const rate = useMessageRate();
  const [target, setTarget] = useState<ViewerTarget>('overlay');

  if (!state) {
    return (
      <div className="grid h-full place-items-center text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <TeaCup mood="happy" size={72} />
          泡茶中…
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto grid h-full max-w-[1280px] auto-rows-[minmax(150px,auto)] grid-cols-4 gap-3 p-4">
      <HeroTile state={state} rate={rate} />
      <AccountTile state={state} />
      <ChannelTile state={state} />
      <OverlayTile state={state} />
      <EmbedTile state={state} />
      <ThemeTile state={state} target={target} onTargetChange={setTarget} />
      <PreviewTile state={state} target={target} />
    </main>
  );
}
