import { Check, Download, FileDown, Flag, Heart, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  SHARE_REPORT_REASONS,
  type ShareReportReason,
  type ShareThemeDetail,
  type ShareThemeSummary,
  formatShareCode,
  isModifiedInstall,
} from '@chatto/share';
import { LiveThemePreview } from '../../components/ThemePreview';
import { ActionNote, Badge, Button, CopyField, Field, LoadingSpinner, Modal, Select } from '../../components/kit';
import { useLocale, useMessages } from '../../i18n';
import { loadShareDetail, shareCall, useInstalledThemes, useShareAction, useShareSession } from '../../services/share';
import { exportTheme } from '../themeIO';
import { authorName, OfficialBadge } from './ShareCard';
import { errorText, failureText, formatCount } from '../../components/share/shareText';

function ReportDialog({
  summary,
  open,
  onOpenChange,
  onReported,
}: {
  summary: ShareThemeSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported: () => void;
}) {
  const m = useMessages().share;
  const messages = useMessages();
  const [reason, setReason] = useState<ShareReportReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { busy, run } = useShareAction();
  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setError(null);
      setSent(false);
    }
  }, [open]);
  const submit = async () => {
    if (!reason) return;
    setError(null);
    const result = await run(() => shareCall('report', summary.id, reason, note));
    if (!result.ok) return setError(errorText(m, result.error));
    setSent(true);
    onReported();
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={m.report.title}
      description={sent ? undefined : m.report.description}
      className="sm:max-w-md"
    >
      {sent ? (
        <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-matcha-soft/60 text-matcha-strong">
            <Check />
          </span>
          <p className="font-medium">{m.report.sentTitle}</p>
          <p className="text-sm text-ink-soft">{m.report.sentHint}</p>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            {messages.common.close}
          </Button>
        </div>
      ) : (
        <>
          <Field label={m.report.reason}>
            <Select
              value={reason}
              onChange={setReason}
              aria-label={m.report.reason}
              options={SHARE_REPORT_REASONS.map((value) => ({ value, label: m.report.reasons[value] }))}
            />
          </Field>
          <Field label={m.report.note}>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-matcha"
            />
          </Field>
          {error ? <ActionNote tone="error">{error}</ActionNote> : null}
          <div className="flex justify-end">
            <Button
              variant="primary"
              aria-disabled={!reason || busy}
              className={!reason || busy ? 'pointer-events-none opacity-50' : ''}
              onClick={() => void submit()}
            >
              {busy ? <LoadingSpinner /> : <Flag />} {m.report.submit}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * One shared theme: a live preview, its details and code, and installing, updating, liking
 * and reporting it. `onSignIn` asks for an account when liking or reporting needs one.
 */
export function ThemeDetailDialog({
  summary,
  onOpenChange,
  onChanged,
  onSignIn,
}: {
  summary: ShareThemeSummary | null;
  onOpenChange: (open: boolean) => void;
  /** The theme's counts changed (liked, or installed for the first time); lists can show the new summary. */
  onChanged?: (summary: ShareThemeSummary) => void;
  onSignIn: () => void;
}) {
  const m = useMessages().share;
  const locale = useLocale();
  const { session } = useShareSession();
  const installed = useInstalledThemes();
  const [detail, setDetail] = useState<ShareThemeDetail | null>(null);
  const [current, setCurrent] = useState<ShareThemeSummary | null>(summary);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [reporting, setReporting] = useState(false);
  /** Reported in this session; the service takes one report per account, so the button stays done. */
  const [reported, setReported] = useState(false);
  /** This dialog already added this client's download to the count. */
  const [counted, setCounted] = useState(false);
  const { busy, run } = useShareAction();

  useEffect(() => {
    setCurrent(summary);
    setDetail(null);
    setNote(null);
    setReported(false);
    setCounted(false);
    if (!summary) return;
    let active = true;
    void loadShareDetail(summary.id, summary.version).then((result) => {
      if (!active) return;
      if (result.ok) setDetail(result.value);
      else setNote({ text: errorText(m, result.error), tone: 'error' });
    });
    return () => {
      active = false;
    };
  }, [summary, m]);

  if (!current) return null;
  const copies = installed.get(current.id) ?? [];
  // A copy that is behind and unchanged can be updated in place; changed copies are the user's own now.
  const outdated = copies.find((theme) => theme.origin!.version < current.version && !isModifiedInstall(theme));
  const signedIn = session.status === 'signed-in';
  const author = authorName(current, m.anonymous);

  const install = async (replaceId?: string) => {
    if (busy) return;
    setNote(null);
    const result = await run(() => shareCall('install', current.id, replaceId));
    if (!result.ok) return setNote({ text: failureText(m, result) ?? '', tone: 'error' });
    setNote({
      text: replaceId ? m.detail.updated(result.value.name) : m.detail.installedAs(result.value.name),
      tone: 'ok',
    });
    if (!replaceId) countDownload();
  };

  // The service counts one download per client a day, so only the first copy or file adds to the count.
  const countDownload = () => {
    if (counted || copies.length > 0) return;
    setCounted(true);
    const next = { ...current, downloads: current.downloads + 1 };
    setCurrent(next);
    onChanged?.(next);
  };

  /** Saves the theme as a `.chattotheme` file without installing it. */
  const downloadFile = async () => {
    if (busy) return;
    setNote(null);
    const result = await run(() => shareCall('download', current.id));
    if (!result.ok) return setNote({ text: failureText(m, result) ?? '', tone: 'error' });
    countDownload();
    if (await exportTheme(result.value)) setNote({ text: m.detail.downloaded(result.value.name), tone: 'ok' });
  };

  const toggleLike = async () => {
    if (!signedIn) return onSignIn();
    if (busy) return;
    const result = await run(() => shareCall('setLiked', current.id, !current.liked));
    if (!result.ok) return setNote({ text: errorText(m, result.error), tone: 'error' });
    setCurrent(result.value);
    onChanged?.(result.value);
  };

  return (
    <Modal
      open={summary !== null}
      onOpenChange={onOpenChange}
      title={current.name}
      description={m.byAuthor(author)}
      className="sm:max-w-4xl"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="h-80 overflow-hidden rounded-xl border border-line md:h-[26rem]">
          {detail ? (
            <LiveThemePreview theme={detail.theme} />
          ) : (
            <div className="grid size-full place-items-center bg-tile-muted">
              <LoadingSpinner size={20} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {current.description ? (
            <p className="text-sm whitespace-pre-line text-ink-soft">{current.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <OfficialBadge summary={current} />
            <Badge tone="matcha">{m.categories[current.category]}</Badge>
            {current.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {current.autoTags
              .filter((tag) => !current.tags.includes(tag))
              .map((tag) => (
                <Badge key={tag}>
                  <Sparkles className="size-3" aria-label={m.detail.autoTag} />
                  {tag}
                </Badge>
              ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" /> {formatCount(current.likes, locale)} {m.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="size-3.5" /> {formatCount(current.downloads, locale)} {m.downloads}
            </span>
            <span>{m.detail.version(current.version)}</span>
          </div>
          {current.remixOf ? (
            <p className="text-xs text-ink-faint">
              {m.detail.remixOf} {current.remixOf.name} · {current.remixOf.authorName ?? m.anonymous}
            </p>
          ) : null}
          <CopyField label={m.detail.code} value={formatShareCode(current.code)} />

          <div className="flex flex-wrap gap-2">
            {outdated ? (
              <Button variant="primary" onClick={() => void install(outdated.id)} aria-disabled={busy}>
                <Download /> {m.detail.update(current.version)}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void install()} aria-disabled={busy}>
                {busy ? <LoadingSpinner /> : <Download />} {copies.length ? m.detail.installAgain : m.detail.install}
              </Button>
            )}
            <Button onClick={() => void downloadFile()} title={m.detail.downloadHint} aria-disabled={busy}>
              <FileDown /> {m.detail.download}
            </Button>
            <Button onClick={() => void toggleLike()} aria-pressed={Boolean(current.liked)} aria-disabled={busy}>
              <Heart className={current.liked ? 'fill-sakura text-sakura' : ''} />
              {current.liked ? m.detail.liked : m.detail.like}
            </Button>
            {reported ? (
              <Button variant="ghost" aria-disabled className="pointer-events-none text-ink-faint">
                <Check /> {m.detail.reported}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => (signedIn ? setReporting(true) : onSignIn())}>
                <Flag /> {m.detail.report}
              </Button>
            )}
          </div>
          {note ? (
            <ActionNote key={note.text} tone={note.tone}>
              {note.text}
            </ActionNote>
          ) : null}
          {!signedIn ? <p className="text-xs text-ink-faint">{m.detail.signInFirst}</p> : null}
          <p className="mt-auto text-[11px] text-ink-faint">{m.detail.license(author)}</p>
        </div>
      </div>
      <ReportDialog
        summary={current}
        open={reporting}
        onOpenChange={setReporting}
        onReported={() => {
          setReported(true);
          setNote({ text: m.detail.reportedNote, tone: 'ok' });
        }}
      />
    </Modal>
  );
}
