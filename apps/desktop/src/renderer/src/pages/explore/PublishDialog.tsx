import type { ChatTheme } from '@chatto/core';
import { Check, CircleAlert, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SHARE_CATEGORIES,
  SHARE_LIMITS,
  SUGGESTED_TAGS,
  type PublishMeta,
  type ShareCategory,
  type ShareThemeSummary,
  autoTags,
  checkPublish,
  formatShareCode,
  normalizeTag,
} from '@chatto/share';
import { StaticThemePreview } from '../../components/ThemePreview';
import {
  ActionNote,
  Badge,
  Button,
  CopyField,
  Field,
  LoadingSpinner,
  Modal,
  Select,
  TagsField,
  TextInput,
} from '../../components/kit';
import { useMessages, useThemeName } from '../../i18n';
import { captureThumbnail, shareCall, useShareAction } from '../../services/share';
import { useAppState } from '../../store';
import { failureText, issueText } from '../../components/share/shareText';

const ALL_SUGGESTED = Object.values(SUGGESTED_TAGS).flat();

/** The local theme to start from: the one already linked to the shared theme, the one asked for, or the first custom one. */
function defaultThemeId(custom: ChatTheme[], target?: ShareThemeSummary, themeId?: string): string {
  return (
    custom.find((theme) => target && theme.origin?.shareId === target.id)?.id ??
    custom.find((theme) => theme.id === themeId)?.id ??
    custom[0]?.id ??
    ''
  );
}

/**
 * Publishing a local theme, or a new version of one the account already shared (`target`).
 * The same checks the service runs are shown as the form is filled in; the preview is captured
 * as the theme's thumbnail.
 */
export function PublishDialog({
  open,
  onOpenChange,
  target,
  themeId,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: ShareThemeSummary;
  /** The local theme to preselect. */
  themeId?: string;
  onPublished?: (summary: ShareThemeSummary) => void;
}) {
  const m = useMessages().share;
  const themeName = useThemeName();
  const themes = useAppState()?.themes;
  const custom = useMemo(() => (themes ?? []).filter((theme) => !theme.builtIn), [themes]);
  const [selected, setSelected] = useState('');
  const [meta, setMeta] = useState<PublishMeta>({ name: '', description: '', category: '', tags: [] });
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<ShareThemeSummary | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const { busy, run } = useShareAction();

  // A fresh form every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const id = defaultThemeId(custom, target, themeId);
    const theme = custom.find((item) => item.id === id);
    setSelected(id);
    setMeta(
      target
        ? { name: target.name, description: target.description, category: target.category, tags: target.tags }
        : { name: theme ? themeName(theme) : '', description: '', category: '', tags: [] },
    );
    setError(null);
    setPublished(null);
    // Only on opening: later theme saves must not reset what the user typed.
  }, [open]);

  const theme = custom.find((item) => item.id === selected);
  const issues = theme ? checkPublish(theme, meta) : [];
  const extraTags = theme ? autoTags(theme).filter((tag) => !meta.tags.includes(tag)) : [];
  const set = (patch: Partial<PublishMeta>) => setMeta((value) => ({ ...value, ...patch }));

  const submit = async () => {
    if (!theme || issues.length || busy) return;
    setError(null);
    const thumbnail = preview.current ? await captureThumbnail(preview.current) : null;
    const result = await run(() => shareCall('publish', theme.id, meta, thumbnail ?? undefined, target?.id));
    if (!result.ok) return setError(failureText(m, result));
    setPublished(result.value);
    onPublished?.(result.value);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={target ? m.publish.updateTitle(target.name) : m.publish.title}
      className="sm:max-w-4xl"
    >
      {published ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-matcha-soft/60 text-matcha-strong">
            <Check />
          </span>
          <p className="font-medium">{m.publish.published}</p>
          <p className="text-sm text-ink-soft">{m.publish.publishedHint(formatShareCode(published.code))}</p>
          <div className="w-full max-w-sm">
            <CopyField label={m.detail.code} value={formatShareCode(published.code)} />
          </div>
        </div>
      ) : custom.length === 0 ? (
        <p className="rounded-xl bg-tile-muted px-4 py-3 text-sm text-ink-soft">{m.publish.noCustomThemes}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <Field label={m.publish.theme}>
              <Select
                value={selected}
                onChange={setSelected}
                aria-label={m.publish.theme}
                placeholder={m.publish.themePlaceholder}
                options={custom.map((item) => ({ value: item.id, label: themeName(item) }))}
              />
            </Field>
            <Field label={m.publish.name}>
              <TextInput
                value={meta.name}
                maxLength={SHARE_LIMITS.nameLength}
                onChange={(event) => set({ name: event.target.value })}
                aria-label={m.publish.name}
              />
            </Field>
            <Field label={m.publish.category}>
              <Select
                value={meta.category}
                onChange={(category: ShareCategory) => set({ category })}
                aria-label={m.publish.category}
                placeholder={m.publish.categoryPlaceholder}
                options={SHARE_CATEGORIES.map((value) => ({ value, label: m.categories[value] }))}
              />
            </Field>
            <Field label={m.publish.tags} hint={m.publish.tagsHint(SHARE_LIMITS.tags)}>
              <TagsField
                value={meta.tags}
                onChange={(tags) => set({ tags })}
                suggestions={ALL_SUGGESTED}
                normalize={normalizeTag}
              />
            </Field>
            {extraTags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {extraTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            ) : null}
            <Field label={m.publish.description}>
              <textarea
                value={meta.description}
                maxLength={SHARE_LIMITS.descriptionLength}
                rows={4}
                placeholder={m.publish.descriptionPlaceholder}
                onChange={(event) => set({ description: event.target.value })}
                aria-label={m.publish.description}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-matcha"
              />
            </Field>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Field label={m.publish.preview}>
              <div ref={preview} className="h-48 overflow-hidden rounded-xl border border-line">
                {theme ? <StaticThemePreview theme={theme} /> : null}
              </div>
            </Field>
            <Field label={m.publish.checks}>
              {issues.length ? (
                <ul className="flex flex-col gap-1.5 text-xs text-danger">
                  {issues.map((issue, index) => (
                    <li key={index} className="flex gap-1.5">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span className="break-all">{issueText(m, issue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-matcha-strong">
                  <Check className="size-3.5" /> {m.publish.checksOk}
                </p>
              )}
            </Field>
            <p className="text-[11px] leading-relaxed text-ink-faint">{m.publish.license}</p>
            {error ? <ActionNote tone="error">{error}</ActionNote> : null}
            <Button
              variant="primary"
              aria-disabled={!theme || issues.length > 0 || busy}
              className={!theme || issues.length > 0 || busy ? 'pointer-events-none opacity-50' : ''}
              onClick={() => void submit()}
            >
              {busy ? <LoadingSpinner /> : <Send />} {target ? m.publish.submitUpdate : m.publish.submit}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
