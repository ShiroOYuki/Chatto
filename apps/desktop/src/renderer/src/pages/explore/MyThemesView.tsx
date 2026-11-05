import { Download, Heart, LogIn, Plus, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type ShareAccount, type ShareErrorCode, type ShareThemeSummary, formatShareCode } from '@chatto/share';
import { Stagger, motion, riseIn } from '../../components/motion';
import { ActionNote, Badge, Button, EmptyState, LoadingSpinner } from '../../components/kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useLocale, useMessages } from '../../i18n';
import { shareCall } from '../../services/share';
import { PublishDialog } from './PublishDialog';
import { SharePreview } from './ShareCard';
import { errorText, formatCount } from '../../components/share/shareText';

/** The account's published themes: publish, update, unpublish. */
export function MyThemesView({
  account,
  onSignIn,
  onOpen,
}: {
  account: ShareAccount | null;
  onSignIn: () => void;
  onOpen: (summary: ShareThemeSummary) => void;
}) {
  const messages = useMessages();
  const m = messages.share;
  const locale = useLocale();
  const [items, setItems] = useState<ShareThemeSummary[] | null>(null);
  const [error, setError] = useState<ShareErrorCode | null>(null);
  const [publishing, setPublishing] = useState<{ target?: ShareThemeSummary } | null>(null);
  const [removing, setRemoving] = useState<ShareThemeSummary | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const accountId = account?.id;

  const load = useCallback(() => {
    if (!accountId) return;
    setError(null);
    void shareCall('mine').then((result) => {
      if (result.ok) setItems(result.value);
      else setError(result.error);
    });
  }, [accountId]);
  useEffect(load, [load]);

  if (!account)
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <EmptyState title={m.mine.emptyTitle} hint={m.mine.signInHint} />
        <Button variant="primary" onClick={onSignIn}>
          <LogIn /> {m.signIn}
        </Button>
      </div>
    );

  const unpublish = async (summary: ShareThemeSummary) => {
    setError(null);
    setDone(null);
    const result = await shareCall('unpublish', summary.id);
    if (!result.ok) return setError(result.error);
    setItems((value) => value?.filter((item) => item.id !== summary.id) ?? null);
    setDone(m.mine.unpublished(summary.name));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => setPublishing({})}>
          <Plus /> {m.mine.publish}
        </Button>
        <span className="text-xs text-ink-faint">{m.account.publishesLeft(account.publishesLeft)}</span>
      </div>
      {error ? <ActionNote tone="error">{errorText(m, error)}</ActionNote> : null}
      {done ? (
        <ActionNote key={done} tone="ok">
          {done}
        </ActionNote>
      ) : null}

      {!items ? (
        <div className="grid place-items-center py-16">
          <LoadingSpinner size={24} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState mood="happy" title={m.mine.emptyTitle} hint={m.mine.emptyHint} />
      ) : (
        <Stagger className="flex flex-col gap-2">
          {items.map((summary) => (
            <motion.article
              key={summary.id}
              variants={riseIn}
              className="flex items-center gap-4 rounded-tile border border-line bg-tile p-3"
            >
              <button
                type="button"
                onClick={() => onOpen(summary)}
                aria-label={summary.name}
                className="h-20 w-32 shrink-0 overflow-hidden rounded-xl"
              >
                <SharePreview summary={summary} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">{summary.name}</h3>
                  {summary.hidden ? (
                    <Badge tone="danger">{m.hidden}</Badge>
                  ) : (
                    <Badge tone="matcha">{m.mine.visible}</Badge>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  <span className="font-mono">{formatShareCode(summary.code)}</span>
                  <span>{m.detail.version(summary.version)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5" /> {formatCount(summary.likes, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download className="size-3.5" /> {formatCount(summary.downloads, locale)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" onClick={() => setPublishing({ target: summary })}>
                  <Upload /> {m.mine.update}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRemoving(summary)}>
                  <Trash2 /> {m.mine.unpublish}
                </Button>
              </div>
            </motion.article>
          ))}
        </Stagger>
      )}

      <PublishDialog
        open={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        target={publishing?.target}
        onPublished={load}
      />
      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent className="rounded-tile">
          <AlertDialogHeader>
            <AlertDialogTitle>{removing ? m.mine.unpublishTitle(removing.name) : null}</AlertDialogTitle>
            <AlertDialogDescription>{m.mine.unpublishDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-xl"
              onClick={() => removing && void unpublish(removing)}
            >
              {m.mine.unpublish}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
