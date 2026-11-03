import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, Tile, Toggle } from '../../components/kit';
import { useMessages } from '../../i18n';
import { overlay } from '../../services/overlay';

export function OverlayTile({ state }: { state: AppState }) {
  const m = useMessages().compact;
  const { enabled, editing } = state.overlay;
  return (
    <Tile
      title={m.desktopOverlay}
      action={<Toggle checked={enabled} label={m.desktopOverlay} onChange={(v) => overlay.setEnabled(v)} />}
    >
      <p className="text-sm text-ink-soft">{m.overlayIntro}</p>
      <Button className="mt-auto" disabled={!enabled} onClick={() => overlay.setEditing(!editing)}>
        {editing ? m.finishAdjusting : m.adjustPosition}
      </Button>
    </Tile>
  );
}

export function EmbedTile({ state }: { state: AppState }) {
  const m = useMessages().compact;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(state.server.embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Tile title={m.obsSource} className="col-span-2">
      <div className="flex items-center gap-2 rounded-xl bg-tile-muted p-2 pl-4">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-matcha-strong">{state.server.embedUrl}</code>
        <Button variant="primary" onClick={() => void copy()}>
          {copied ? m.copiedUrl : m.copyUrl}
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-faint">{m.obsHint}</p>
    </Tile>
  );
}
