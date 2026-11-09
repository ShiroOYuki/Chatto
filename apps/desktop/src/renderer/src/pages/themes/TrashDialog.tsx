import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocale, useMessages } from '../../i18n';
import { themes } from '../../services/themes';
import { ActionNote, Button, EmptyState, Hint, Modal } from '../../components/kit';
import { trashDaysLeft, type TrashEntry } from '../../../../shared/themeLibrary';
import { ConfirmDialog } from './ConfirmDialog';

type Pending = { kind: 'purge'; entry: TrashEntry } | { kind: 'empty' };

/** The theme trash (#41): restore, delete forever, or empty it. */
export function TrashDialog({
  open,
  onOpenChange,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: TrashEntry[];
}) {
  const m = useMessages().themes.trash;
  const locale = useLocale();
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState<{ key: number; tone: 'ok' | 'error'; text: string } | null>(null);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const now = Date.now();

  const restore = async (entry: TrashEntry) => {
    try {
      await themes.restore(entry.id);
      setNote({ key: now, tone: 'ok', text: m.restored(entry.name) });
    } catch (reason) {
      setNote({ key: now, tone: 'error', text: reason instanceof Error ? reason.message : String(reason) });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote(null);
        onOpenChange(next);
      }}
      title={m.title}
      description={m.description}
    >
      {note ? (
        <ActionNote key={note.key} tone={note.tone}>
          {note.text}
        </ActionNote>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState compact title={m.empty} hint={m.emptyHint} />
      ) : (
        <>
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto" aria-label={m.title}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-tile-muted/50 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.name}</p>
                  <p className="text-xs text-ink-faint">
                    {(entry.reason === 'overwritten' ? m.overwritten : m.deleted)(date.format(entry.deletedAt))} ·{' '}
                    {m.daysLeft(trashDaysLeft(entry, now))}
                  </p>
                </div>
                <Button size="sm" onClick={() => void restore(entry)} aria-label={`${m.restore} ${entry.name}`}>
                  <RotateCcw /> {m.restore}
                </Button>
                <Hint label={m.purge}>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`${m.purge} ${entry.name}`}
                    onClick={() => setPending({ kind: 'purge', entry })}
                  >
                    <Trash2 />
                  </Button>
                </Hint>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button variant="danger" onClick={() => setPending({ kind: 'empty' })}>
              <Trash2 /> {m.emptyTrash}
            </Button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'purge' ? m.purgeTitle(pending.entry.name) : m.emptyTitle}
        description={pending?.kind === 'purge' ? m.purgeDescription : m.emptyDescription(entries.length)}
        confirmLabel={pending?.kind === 'purge' ? m.purge : m.emptyTrash}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind === 'purge') themes.purge(pending.entry.id);
          else themes.emptyTrash();
          setPending(null);
        }}
      />
    </Modal>
  );
}
