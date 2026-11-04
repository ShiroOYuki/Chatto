import { useCallback, useEffect, useState } from 'react';
import type { ObsPluginResult, ObsPluginStatus } from '../../../../shared/ipc';
import { Badge, Button } from '../../components/kit';
import { useMessages } from '../../i18n';
import { obsPlugin } from '../../services/obsPlugin';

type Notice = 'installed' | 'obs-running' | 'failed' | null;

const BADGE_TONE = {
  installed: 'matcha',
  outdated: 'sakura',
  'not-installed': 'neutral',
  unavailable: 'neutral',
} as const;

/** The one note under the description: the last action's result, else a missing-OBS hint. */
function PanelNote({ notice, obsFound }: { notice: Notice; obsFound: boolean }) {
  const m = useMessages().outputs;
  if (notice === 'obs-running' || notice === 'failed') {
    return (
      <p role="alert" className="mt-1 text-xs text-danger">
        {notice === 'obs-running' ? m.closeObsFirst : m.pluginFailed}
      </p>
    );
  }
  if (notice === 'installed') return <p className="mt-1 text-xs text-matcha-strong">{m.pluginInstalled}</p>;
  return obsFound ? null : <p className="mt-1 text-xs text-ink-faint">{m.obsNotFound}</p>;
}

/** Installs, updates or removes the "Chatto Chat" OBS plugin from the OBS tile. */
export function ObsPluginPanel() {
  const m = useMessages().outputs;
  const [status, setStatus] = useState<ObsPluginStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const refresh = useCallback(() => {
    obsPlugin
      .status()
      .then(setStatus)
      .catch((error: unknown) => console.error('[chatto] obs plugin status failed', error));
  }, []);

  // OBS may be installed, closed or changed while Chatto runs: look again when the window regains focus.
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const run = async (action: () => Promise<ObsPluginResult>, done: Notice) => {
    setBusy(true);
    try {
      const result = await action();
      setStatus(result.status);
      setNotice(result.ok ? done : result.reason);
    } catch {
      setNotice('failed');
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  const { state, obsFound } = status;
  const installed = state === 'installed' || state === 'outdated';

  return (
    // Title, status and actions share one row; below it one line explains, then at most one note.
    <section className="rounded-xl border border-line p-4" aria-label={m.obsPlugin}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{m.obsPlugin}</h3>
        <Badge tone={BADGE_TONE[state]}>{m.obsPluginState[state]}</Badge>
        {state !== 'unavailable' ? (
          <div className="ml-auto flex shrink-0 gap-1">
            {installed ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(obsPlugin.uninstall, null)}>
                {m.uninstallPlugin}
              </Button>
            ) : null}
            {state !== 'installed' ? (
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => void run(obsPlugin.install, 'installed')}
              >
                {state === 'outdated' ? m.updatePlugin : m.installPlugin}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{state === 'unavailable' ? m.pluginUnavailable : m.obsPluginIntro}</p>
      <PanelNote notice={notice} obsFound={obsFound || state === 'unavailable'} />
    </section>
  );
}
