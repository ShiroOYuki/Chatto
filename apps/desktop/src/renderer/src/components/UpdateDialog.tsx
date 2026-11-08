import { Download, ExternalLink } from 'lucide-react';
import type { AppState } from '../../../shared/ipc';
import { changelogPageUrl, noteTextParts, type UpdateNote } from '../../../shared/updateNotes';
import { useLocale, useMessages } from '../i18n';
import { openExternal } from '../services/app';
import { updater } from '../services/updater';
import { Button, Hint, Modal } from './kit';

/** A changelog sentence; backticks are its only formatting (#39). */
function NoteText({ text }: { text: string }) {
  return noteTextParts(text).map((part, index) =>
    part.code ? (
      <code key={index} className="rounded bg-tile-muted px-1 font-mono text-[0.85em]">
        {part.text}
      </code>
    ) : (
      part.text
    ),
  );
}

function VersionNotes({ note, showVersion }: { note: UpdateNote; showVersion: boolean }) {
  const m = useMessages().appDialogs.update;
  const locale = useLocale();
  return (
    <section aria-label={note.version} className="flex flex-col gap-3">
      {showVersion ? (
        <h3 className="flex items-baseline gap-2 text-sm font-semibold">
          {note.version}
          {note.date ? <span className="text-xs font-normal text-ink-faint">{note.date}</span> : null}
        </h3>
      ) : null}
      {note.summary ? (
        <p className="text-sm">
          <NoteText text={note.summary[locale]} />
        </p>
      ) : null}
      {note.sections.map((section) => (
        <div key={section.kind}>
          <h4 className="mb-1 text-xs font-medium text-ink-faint">{m.kinds[section.kind]}</h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {section.items.map((item, index) => (
              <li key={index}>
                <NoteText text={item[locale]} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Opens once when the check at startup finds a new version (#39): what changed in every
 * version up to it, then close (asks again next launch), skip this version, or update.
 */
export function UpdateDialog({ state }: { state: AppState }) {
  const m = useMessages().appDialogs.update;
  const locale = useLocale();
  const { update } = state;
  const open = update.prompt === true && update.status === 'available' && Boolean(update.version);
  const notes = update.notes ?? null;
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && updater.dismissPrompt(false)}
      title={m.title(update.version ?? '')}
      description={m.current(state.appInfo.version)}
      className="sm:max-w-xl"
    >
      <div className="-mx-6 max-h-[min(50vh,420px)] overflow-y-auto px-6" data-testid="update-notes">
        {notes?.length ? (
          <div className="flex flex-col gap-5">
            {notes.map((note) => (
              <VersionNotes key={note.version} note={note} showVersion={notes.length > 1} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 text-sm text-ink-soft">
            <p>{m.noNotes}</p>
            <Button
              size="sm"
              variant="ghost"
              className="-ml-2.5"
              onClick={() => openExternal(changelogPageUrl(locale))}
            >
              <ExternalLink /> {m.viewChangelog}
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => updater.dismissPrompt(false)}>
          {m.close}
        </Button>
        <Hint label={m.skipHint}>
          <Button onClick={() => updater.dismissPrompt(true)}>{m.skip}</Button>
        </Hint>
        <Hint label={m.updateHint}>
          <Button variant="primary" onClick={() => updater.download()}>
            <Download /> {m.update}
          </Button>
        </Hint>
      </div>
    </Modal>
  );
}
