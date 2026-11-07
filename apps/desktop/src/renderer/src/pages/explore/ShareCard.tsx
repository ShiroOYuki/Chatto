import type { ChatTheme } from '@chatto/core';
import { BadgeCheck, Check, Download, Heart, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ShareThemeSummary } from '@chatto/share';
import { motion, riseIn } from '../../components/motion';
import { StaticThemePreview } from '../../components/ThemePreview';
import { Badge } from '../../components/kit';
import { useLocale, useMessages } from '../../i18n';
import { loadShareDetail } from '../../services/share';
import { formatCount } from '../../components/share/shareText';

/** The thumbnail the author published, or the theme itself rendered when there is none. */
export function SharePreview({ summary }: { summary: ShareThemeSummary }) {
  const [theme, setTheme] = useState<ChatTheme | null>(null);
  useEffect(() => {
    if (summary.thumbnail) return;
    let current = true;
    void loadShareDetail(summary.id, summary.version).then((result) => {
      if (current && result.ok) setTheme(result.value.theme);
    });
    return () => {
      current = false;
    };
  }, [summary.id, summary.version, summary.thumbnail]);
  if (summary.thumbnail)
    return <img src={summary.thumbnail} alt="" className="size-full object-cover object-top" draggable={false} />;
  return theme ? <StaticThemePreview theme={theme} /> : <div className="size-full animate-pulse bg-tile-muted" />;
}

/** Author line: their name, or "anonymous" once they deleted their account. */
export function authorName(summary: ShareThemeSummary, anonymous: string): string {
  return summary.author?.name ?? anonymous;
}

/** Marks themes from Chatto's own account. */
export function OfficialBadge({ summary }: { summary: ShareThemeSummary }) {
  const m = useMessages().share;
  if (!summary.author?.official) return null;
  return (
    <Badge tone="matcha">
      <BadgeCheck className="size-3" aria-hidden="true" />
      {m.official}
    </Badge>
  );
}

export function ShareCard({
  summary,
  installed,
  updatable,
  onOpen,
}: {
  summary: ShareThemeSummary;
  installed: boolean;
  updatable: boolean;
  onOpen: () => void;
}) {
  const m = useMessages().share;
  const locale = useLocale();
  return (
    <motion.article variants={riseIn} className="overflow-hidden rounded-tile border border-line bg-tile">
      <button
        type="button"
        onClick={onOpen}
        aria-label={summary.name}
        className="group block w-full text-left transition-colors hover:bg-tile-muted/40"
      >
        <div className="relative h-40 overflow-hidden">
          <SharePreview summary={summary} />
          <div className="absolute top-2 left-2 flex gap-1">
            {updatable ? (
              <Badge solid tone="sakura">
                <RefreshCw /> {m.updateAvailable}
              </Badge>
            ) : installed ? (
              <Badge solid tone="matcha">
                <Check /> {m.installed}
              </Badge>
            ) : null}
            {summary.hidden ? (
              <Badge solid tone="danger">
                {m.hidden}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <h2 className="truncate font-medium">{summary.name}</h2>
          <div className="flex h-5 min-w-0 items-center gap-1.5">
            <p className="truncate text-xs text-ink-faint">{m.byAuthor(authorName(summary, m.anonymous))}</p>
            <OfficialBadge summary={summary} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-ink-soft">
            <Badge>{m.categories[summary.category]}</Badge>
            <span className="ml-auto inline-flex items-center gap-1" aria-label={m.likes}>
              <Heart className={`size-3.5 ${summary.liked ? 'fill-sakura text-sakura' : ''}`} />
              {formatCount(summary.likes, locale)}
            </span>
            <span className="inline-flex items-center gap-1" aria-label={m.downloads}>
              <Download className="size-3.5" />
              {formatCount(summary.downloads, locale)}
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
