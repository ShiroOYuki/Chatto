import { Check, Move } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { Button, Tile, Toggle } from '../../components/kit';
import { useMessages } from '../../i18n';
import { alerts } from '../../services/alerts';
import { overlay } from '../../services/overlay';

/** One desktop window: name, position button and on/off switch on a single line. */
function WindowRow({
  label,
  switchLabel,
  adjustLabel,
  enabled,
  editing,
  onToggle,
  onEdit,
}: {
  label: string;
  switchLabel: string;
  adjustLabel: string;
  enabled: boolean;
  editing: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: (editing: boolean) => void;
}) {
  const m = useMessages().compact;
  const editLabel = editing ? m.finishAdjusting : adjustLabel;
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Button
        size="sm"
        variant={editing ? 'primary' : 'ghost'}
        className="size-8 px-0"
        disabled={!enabled}
        aria-label={editLabel}
        title={editLabel}
        onClick={() => onEdit(!editing)}
      >
        {editing ? <Check /> : <Move />}
      </Button>
      <Toggle checked={enabled} label={switchLabel} onChange={onToggle} />
    </div>
  );
}

export function OverlayTile({ state }: { state: AppState }) {
  const m = useMessages().compact;
  return (
    <Tile title={m.desktopOverlay}>
      <div className="flex flex-col gap-2">
        <WindowRow
          label={m.chatWindow}
          switchLabel={m.desktopOverlay}
          adjustLabel={m.adjustChatPosition}
          enabled={state.overlay.enabled}
          editing={state.overlay.editing}
          onToggle={(v) => overlay.setEnabled(v)}
          onEdit={(next) => overlay.setEditing(next)}
        />
        <WindowRow
          label={m.alertsWindow}
          switchLabel={m.alertsOverlay}
          adjustLabel={m.adjustAlertsPosition}
          enabled={state.alertsOverlay.enabled}
          editing={state.alertsOverlay.editing}
          onToggle={(v) => alerts.setOverlayEnabled(v)}
          onEdit={(next) => alerts.setOverlayEditing(next)}
        />
      </div>
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
