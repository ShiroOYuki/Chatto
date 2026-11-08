import { Bug, ExternalLink, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { reportIssueUrl } from '../../../shared/reportIssue';
import { ActionNote, Button, Modal, Tile, Toggle } from '../components/kit';
import { useMessages } from '../i18n';
import { openExternal } from '../services/app';
import { diagnostics } from '../services/diagnostics';

type Result = 'saved' | 'failed' | null;

/** Settings › About: export diagnostics and report a problem on GitHub (#56). */
export function ReportTile({ version }: { version: string }) {
  const messages = useMessages();
  const m = messages.settings;
  const [open, setOpen] = useState(false);
  const [includeChannel, setIncludeChannel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const exportNow = async () => {
    setBusy(true);
    try {
      const saved = await diagnostics.export({ includeChannel });
      // Cancelling the save dialog keeps this dialog open to try again.
      if (!saved) return;
      setResult('saved');
      setOpen(false);
    } catch (error) {
      console.error('[chatto] exportDiagnostics failed', error);
      setResult('failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tile title={m.report}>
      <div className="flex items-center justify-between gap-6 border-b border-line py-4 first:pt-0">
        <div>
          <div className="text-sm font-medium">{m.diagnostics}</div>
          <div className="mt-0.5 text-xs text-ink-faint">{m.diagnosticsHint}</div>
          {result === 'saved' ? (
            <ActionNote tone="ok" className="mt-2">
              {m.diagnosticsSaved}
            </ActionNote>
          ) : null}
          {result === 'failed' ? (
            <ActionNote tone="error" className="mt-2">
              {m.diagnosticsFailed}
            </ActionNote>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {result === 'saved' ? (
            <Button size="sm" variant="ghost" onClick={diagnostics.reveal}>
              <FolderOpen /> {m.showInFolder}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              setResult(null);
              setOpen(true);
            }}
          >
            <Bug /> {m.exportDiagnostics}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-6 pt-4">
        <div>
          <div className="text-sm font-medium">{m.reportOnGitHub}</div>
          <div className="mt-0.5 text-xs text-ink-faint">{m.reportOnGitHubHint}</div>
        </div>
        <Button size="sm" onClick={() => openExternal(reportIssueUrl(version))}>
          <ExternalLink /> {m.openGitHub}
        </Button>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={m.diagnosticsTitle}
        description={m.diagnosticsDescription}
        className="sm:max-w-xl"
      >
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-ink-soft">{m.diagnosticsIncludes}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {m.diagnosticsIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-ink-soft">{m.diagnosticsExcludes}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {m.diagnosticsExcluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex items-center justify-between gap-6 rounded-xl bg-tile-muted px-4 py-3">
          <div>
            <div className="text-sm font-medium">{m.includeChannel}</div>
            <div className="mt-0.5 text-xs text-ink-faint">{m.includeChannelHint}</div>
          </div>
          <Toggle checked={includeChannel} label={m.includeChannel} onChange={setIncludeChannel} />
        </div>
        {result === 'failed' ? <ActionNote tone="error">{m.diagnosticsFailed}</ActionNote> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {messages.common.cancel}
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void exportNow()}>
            {m.exportDiagnostics}
          </Button>
        </div>
      </Modal>
    </Tile>
  );
}
