import type { ViewerTarget } from '@chatto/core';
import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Stagger } from '../../components/motion';
import { useChatLog } from '../../store';
import { HeroTile } from './HeroTile';
import { EmbedTile, OverlayTile } from './OutputTiles';
import { PreviewTile, ThemeTile } from './ThemeTiles';
import { AccountTile, ChannelTile } from './TwitchTiles';

/** Single-page bento dashboard (compact mode). */
export function CompactDashboard({ state, onOpenThemes }: { state: AppState; onOpenThemes: () => void }) {
  const { stats } = useChatLog();
  const [target, setTarget] = useState<ViewerTarget>('overlay');
  return (
    <Stagger className="mx-auto grid h-full min-h-[680px] w-full max-w-[1280px] auto-rows-[minmax(150px,auto)] grid-cols-4 gap-3 p-4">
      <HeroTile state={state} rate={stats.rate} />
      <AccountTile state={state} />
      <ChannelTile state={state} />
      <OverlayTile state={state} />
      <EmbedTile state={state} />
      <ThemeTile state={state} target={target} onTargetChange={setTarget} onOpenThemes={onOpenThemes} />
      <PreviewTile state={state} target={target} />
    </Stagger>
  );
}
