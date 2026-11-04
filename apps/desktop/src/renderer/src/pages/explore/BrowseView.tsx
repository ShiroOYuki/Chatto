import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  SHARE_CATEGORIES,
  shareOk,
  type ShareCategory,
  type ShareErrorCode,
  type ShareSort,
  type ShareThemeSummary,
} from '../../../../shared/share/model';
import { formatShareCode, parseShareCode } from '../../../../shared/share/rules';
import { Stagger } from '../../components/motion';
import { Button, EmptyState, LoadingSpinner, Select, TextInput } from '../../components/kit';
import { useMessages } from '../../i18n';
import { shareCall, useInstalledThemes, useShareUpdates } from '../../services/share';
import { ShareCard } from './ShareCard';
import { errorText } from './shareText';

interface Listing {
  items: ShareThemeSummary[];
  nextPage: number | null;
}

/** The shared theme catalogue: categories, search (names, tags or a theme code), sorting and pages. */
export function BrowseView({
  onOpen,
  changed,
}: {
  onOpen: (summary: ShareThemeSummary) => void;
  /** A theme whose summary changed elsewhere (a like in the detail view). */
  changed: ShareThemeSummary | null;
}) {
  const m = useMessages().share;
  const [category, setCategory] = useState<ShareCategory | undefined>();
  const [sort, setSort] = useState<ShareSort>('popular');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<ShareErrorCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reload, setReload] = useState(0);
  const installed = useInstalledThemes();
  const updates = useShareUpdates();
  const updatable = new Set(
    [...installed].filter(([, themes]) => themes.some((theme) => updates.has(theme.id))).map(([id]) => id),
  );

  // Searching waits for a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 300);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    let current = true;
    setListing(null);
    setError(null);
    const list = () => shareCall('list', { category, sort, search: search || undefined });
    // A complete theme code shows just that theme; text that only looks like a code falls back to a search.
    const code = parseShareCode(search);
    const request = code
      ? shareCall('findByCode', code).then((found) =>
          found.ok ? shareOk({ items: [found.value], total: 1, nextPage: null }) : list(),
        )
      : list();
    void request.then((result) => {
      if (!current) return;
      if (result.ok) setListing({ items: result.value.items, nextPage: result.value.nextPage });
      else setError(result.error);
    });
    return () => {
      current = false;
    };
  }, [category, sort, search, reload]);

  /** Enter on a complete theme code opens that theme. */
  const openCode = async () => {
    const code = parseShareCode(typed);
    if (!code) return;
    setNotice(null);
    const result = await shareCall('findByCode', code);
    if (result.ok) onOpen(result.value);
    else setNotice(result.error === 'not-found' ? m.codeNotFound(formatShareCode(code)) : errorText(m, result.error));
  };

  const loadMore = async () => {
    if (!listing?.nextPage || loadingMore) return;
    setLoadingMore(true);
    const result = await shareCall('list', { category, sort, search: search || undefined, page: listing.nextPage });
    setLoadingMore(false);
    if (result.ok) setListing({ items: [...listing.items, ...result.value.items], nextPage: result.value.nextPage });
    else setError(result.error);
  };

  // The list shows the latest counts after a like in the detail view.
  useEffect(() => {
    if (!changed) return;
    setListing((value) =>
      value ? { ...value, items: value.items.map((item) => (item.id === changed.id ? changed : item)) } : value,
    );
  }, [changed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <TextInput
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void openCode()}
            placeholder={m.search}
            aria-label={m.search}
            className="pl-9"
          />
        </div>
        <div className="w-36">
          <Select
            value={sort}
            onChange={setSort}
            aria-label={m.sort.label}
            options={(['popular', 'newest', 'likes'] as const).map((value) => ({ value, label: m.sort[value] }))}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={m.categories.all}>
        {[undefined, ...SHARE_CATEGORIES].map((value) => {
          const active = value === category;
          return (
            <button
              key={value ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(value)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                active ? 'bg-matcha text-white' : 'bg-tile-muted text-ink-soft hover:text-ink'
              }`}
            >
              {value ? m.categories[value] : m.categories.all}
            </button>
          );
        })}
      </div>
      {notice ? <p className="rounded-xl bg-tile-muted px-4 py-2 text-sm text-ink-soft">{notice}</p> : null}

      {error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <EmptyState mood="worried" title={m.loadFailed} hint={errorText(m, error)} />
          <Button size="sm" onClick={() => setReload((count) => count + 1)}>
            {m.retry}
          </Button>
        </div>
      ) : !listing ? (
        <div className="grid place-items-center py-16">
          <LoadingSpinner size={24} />
        </div>
      ) : listing.items.length === 0 ? (
        <EmptyState title={m.noResults} hint={m.noResultsHint} />
      ) : (
        <>
          <Stagger
            key={`${category}:${sort}:${search}`}
            className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3"
          >
            {listing.items.map((summary) => (
              <ShareCard
                key={summary.id}
                summary={summary}
                installed={installed.has(summary.id)}
                updatable={updatable.has(summary.id)}
                onOpen={() => onOpen(summary)}
              />
            ))}
          </Stagger>
          {listing.nextPage !== null ? (
            <div className="flex justify-center">
              <Button onClick={() => void loadMore()} aria-disabled={loadingMore}>
                {loadingMore ? <LoadingSpinner /> : null} {m.loadMore}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
