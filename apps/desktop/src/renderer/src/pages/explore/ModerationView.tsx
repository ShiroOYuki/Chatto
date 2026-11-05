import { Ban, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ShareErrorCode, ShareReport, ShareReportReason, ShareThemeSummary } from '@chatto/share';
import { Stagger, motion, riseIn } from '../../components/motion';
import { ActionNote, Badge, Button, EmptyState, LoadingSpinner } from '../../components/kit';
import { useMessages } from '../../i18n';
import { shareCall } from '../../services/share';
import { authorName, SharePreview } from './ShareCard';
import { errorText } from '../../components/share/shareText';

/** Reported and hidden themes, for moderators: hide or restore a theme, suspend its author. */
export function ModerationView({ onOpen }: { onOpen: (summary: ShareThemeSummary) => void }) {
  const m = useMessages().share;
  const [reports, setReports] = useState<ShareReport[] | null>(null);
  const [error, setError] = useState<ShareErrorCode | null>(null);
  /** What the last action did, shown above the list. */
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(() => {
    void shareCall('reports').then((result) => {
      if (result.ok) setReports(result.value);
      else setError(result.error);
    });
  }, []);
  useEffect(load, [load]);

  const act = async (action: Promise<{ ok: boolean; error?: ShareErrorCode }>, doneText: string) => {
    setError(null);
    setDone(null);
    const result = await action;
    if (result.ok) setDone(doneText);
    else if (result.error) setError(result.error);
    load();
  };

  if (!reports && !error)
    return (
      <div className="grid place-items-center py-16">
        <LoadingSpinner size={24} />
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {error ? <ActionNote tone="error">{errorText(m, error)}</ActionNote> : null}
      {done ? (
        <ActionNote key={done} tone="ok">
          {done}
        </ActionNote>
      ) : null}
      {reports?.length === 0 ? (
        <EmptyState mood="happy" title={m.moderation.emptyTitle} hint={m.moderation.emptyHint} />
      ) : (
        <Stagger className="flex flex-col gap-2">
          {reports?.map((report) => {
            const { theme } = report;
            return (
              <motion.article
                key={theme.id}
                variants={riseIn}
                className="flex gap-4 rounded-tile border border-line bg-tile p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpen(theme)}
                  aria-label={theme.name}
                  className="h-20 w-32 shrink-0 overflow-hidden rounded-xl"
                >
                  <SharePreview summary={theme} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium">{theme.name}</h3>
                    <span className="text-xs text-ink-faint">{m.byAuthor(authorName(theme, m.anonymous))}</span>
                    {theme.hidden ? <Badge tone="danger">{m.hidden}</Badge> : null}
                    {report.authorBanned ? <Badge tone="danger">{m.moderation.banned}</Badge> : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="sakura">{m.moderation.reports(report.count)}</Badge>
                    {(Object.entries(report.reasons) as [ShareReportReason, number][]).map(([reason, count]) => (
                      <Badge key={reason}>
                        {m.report.reasons[reason]} · {count}
                      </Badge>
                    ))}
                  </div>
                  {report.notes.length ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-ink-soft">
                      {report.notes.slice(0, 3).map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {theme.hidden ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void act(shareCall('setHidden', theme.id, false), m.moderation.done.restored(theme.name))
                      }
                    >
                      <Eye /> {m.moderation.restore}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        void act(shareCall('setHidden', theme.id, true), m.moderation.done.hidden(theme.name))
                      }
                    >
                      <EyeOff /> {m.moderation.hide}
                    </Button>
                  )}
                  {theme.author ? (
                    report.authorBanned ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void act(
                            shareCall('setBanned', theme.author!.id, false),
                            m.moderation.done.unbanned(theme.name),
                          )
                        }
                      >
                        <ShieldCheck /> {m.moderation.unban}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          void act(shareCall('setBanned', theme.author!.id, true), m.moderation.done.banned(theme.name))
                        }
                      >
                        <Ban /> {m.moderation.ban}
                      </Button>
                    )
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
