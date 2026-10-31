import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, Tile, Toggle } from '../../components/kit';
import { overlay } from '../../services/overlay';

export function OverlayTile({ state }: { state: AppState }) {
  const { enabled, editing } = state.overlay;
  return (
    <Tile
      title="桌面 Overlay"
      action={<Toggle checked={enabled} label="桌面 Overlay" onChange={(v) => overlay.setEnabled(v)} />}
    >
      <p className="text-sm text-ink-soft">透明聊天室浮在所有視窗上方，滑鼠可以直接穿過。</p>
      <Button className="mt-auto" disabled={!enabled} onClick={() => overlay.setEditing(!editing)}>
        {editing ? '完成調整' : '調整位置與大小'}
      </Button>
    </Tile>
  );
}

export function EmbedTile({ state }: { state: AppState }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(state.server.embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Tile title="OBS 瀏覽器來源" className="col-span-2">
      <div className="flex items-center gap-2 rounded-2xl bg-tile-muted p-2 pl-4">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-matcha-strong">{state.server.embedUrl}</code>
        <Button variant="primary" onClick={() => void copy()}>
          {copied ? '複製好了 ✓' : '複製網址'}
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        在 OBS 新增「瀏覽器」來源並貼上網址，建議寬 420、高 600。背景會自動透明。
      </p>
    </Tile>
  );
}
