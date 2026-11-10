import { VIEWER_TARGETS, type ChatTheme, type ViewerTarget } from '@chatto/core';
import { ArrowDown, ArrowUp, Check, Copy, Download, Ellipsis, FolderInput, Pencil, Send, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';
import { useMessages, useThemeName } from '../../i18n';
import { runAction } from '../../services/run';
import { themes } from '../../services/themes';
import { motion, riseIn } from '../../components/motion';
import { StaticThemePreview } from '../../components/ThemePreview';
import { Badge, Button, Hint } from '../../components/kit';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { LibraryOp, ThemeFolder } from '../../../../shared/themeLibrary';
import { exportTheme } from '../themeIO';
import { describeTheme } from '../themeLabels';
import { DRAG_THEME } from './library';

/** Plain data, so a card can tell cheaply whether anything about its place changed. */
export interface CardMoves {
  /** Where the theme can go: unfiled (null) and every folder. */
  folders: ThemeFolder[];
  current: string | null;
  /** Keyboard alternative to dragging; null at an end or while searching. */
  up: LibraryOp | null;
  down: LibraryOp | null;
}

/** What the page does for a card. One stable object, so the cards can stay memoized. */
export interface CardActions {
  edit: (theme: ChatTheme) => void;
  /** The copy goes in the given folder (null: unfiled). */
  duplicate: (theme: ChatTheme, folderId: string | null) => void;
  publish: (theme: ChatTheme) => void;
  remove: (theme: ChatTheme) => void;
  openExplore: () => void;
}

export interface ThemeCardProps {
  theme: ChatTheme;
  selected: Record<ViewerTarget, string>;
  updateAvailable: boolean;
  /** Absent for built-in themes, which never move. */
  moves?: CardMoves;
  actions: CardActions;
}

/**
 * Re-render only when something the card shows changed. The page re-renders on every app state
 * update, and a card is costly: a theme preview, menus and a layout animation that measures
 * the page.
 */
export function sameCard(a: ThemeCardProps, b: ThemeCardProps): boolean {
  return (
    a.theme === b.theme &&
    a.updateAvailable === b.updateAvailable &&
    a.actions === b.actions &&
    VIEWER_TARGETS.every((target) => (a.selected[target] === a.theme.id) === (b.selected[target] === b.theme.id)) &&
    JSON.stringify(a.moves) === JSON.stringify(b.moves)
  );
}

export const ThemeCard = memo(function ThemeCard({ theme, selected, updateAvailable, moves, actions }: ThemeCardProps) {
  const targets = VIEWER_TARGETS.filter((target) => selected[target] === theme.id);
  const onDuplicate = () => actions.duplicate(theme, moves?.current ?? null);
  const messages = useMessages();
  const m = messages.themes;
  const themeName = useThemeName();
  const [dropping, setDropping] = useState(false);
  const accepts = (event: React.DragEvent) => moves !== undefined && event.dataTransfer.types.includes(DRAG_THEME);

  return (
    <motion.article
      layout
      variants={riseIn}
      className={`overflow-hidden rounded-tile border bg-tile transition-colors ${
        targets.length ? 'border-matcha' : 'border-line hover:border-ink-faint/40'
      } ${dropping ? 'ring-2 ring-matcha' : ''}`}
    >
      <div
        className="flex h-full flex-col"
        data-theme-id={theme.id}
        draggable={moves !== undefined}
        onDragStart={(event) => {
          if (!moves) return;
          event.dataTransfer.setData(DRAG_THEME, theme.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (!accepts(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event) => {
          setDropping(false);
          if (!accepts(event)) return;
          event.preventDefault();
          event.stopPropagation();
          const dragged = event.dataTransfer.getData(DRAG_THEME);
          if (dragged && dragged !== theme.id)
            themes.library({ type: 'move-theme', themeId: dragged, folderId: moves!.current, before: theme.id });
        }}
      >
        <div className="relative h-44 overflow-hidden rounded-t-tile">
          <StaticThemePreview theme={theme} />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{themeName(theme)}</h2>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
                {describeTheme(theme, m.labels)} · {theme.builtIn ? m.builtIn : m.custom}
                {updateAvailable ? (
                  <button type="button" onClick={actions.openExplore}>
                    <Badge tone="sakura">{messages.share.updateAvailable}</Badge>
                  </button>
                ) : null}
                {targets.map((target) => (
                  <Badge key={target} tone="matcha">
                    {m.targets[target]}
                  </Badge>
                ))}
              </p>
            </div>
            <div className="flex">
              {theme.builtIn ? (
                <Hint label={m.duplicateAndEdit}>
                  <Button size="sm" variant="ghost" aria-label={m.duplicateAndEdit} onClick={onDuplicate}>
                    <Copy />
                  </Button>
                </Hint>
              ) : (
                <Hint label={messages.common.edit}>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={messages.common.edit}
                    onClick={() => actions.edit(theme)}
                  >
                    <Pencil />
                  </Button>
                </Hint>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" aria-label={m.moreActions}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                  <DropdownMenuItem onSelect={() => runAction('exportTheme', exportTheme(theme))}>
                    <Download /> {m.exportPackage}
                  </DropdownMenuItem>
                  {!theme.builtIn ? (
                    <DropdownMenuItem onSelect={onDuplicate}>
                      <Copy /> {m.duplicate}
                    </DropdownMenuItem>
                  ) : null}
                  {!theme.builtIn ? (
                    <DropdownMenuItem onSelect={() => actions.publish(theme)}>
                      <Send /> {m.publish}
                    </DropdownMenuItem>
                  ) : null}
                  {moves ? <MoveItems themeId={theme.id} moves={moves} /> : null}
                  {!theme.builtIn ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(theme)}>
                        <Trash2 /> {m.deleteTheme}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-2">
            {VIEWER_TARGETS.map((target) => {
              const active = selected[target] === theme.id;
              return (
                <Hint key={target} label={m.useFor[target]}>
                  <Button
                    size="sm"
                    variant={active ? 'primary' : 'secondary'}
                    aria-pressed={active}
                    className="min-w-0 px-2"
                    onClick={() => themes.select(target, theme.id)}
                  >
                    <span className="truncate">{m.targets[target]}</span>
                  </Button>
                </Hint>
              );
            })}
          </div>
        </div>
      </div>
    </motion.article>
  );
}, sameCard);

/** "Move to" and up/down: the keyboard way to file and order a theme. */
function MoveItems({ themeId, moves }: { themeId: string; moves: CardMoves }) {
  const m = useMessages().themes.library;
  const destinations = [{ id: null, name: m.unfiled }, ...moves.folders];
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FolderInput /> {m.moveTo}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-72 min-w-40 overflow-y-auto rounded-xl">
          {destinations.map((folder) => {
            const here = folder.id === moves.current;
            return (
              <DropdownMenuItem
                key={folder.id ?? ''}
                disabled={here}
                onSelect={() => themes.library({ type: 'move-theme', themeId, folderId: folder.id, before: null })}
              >
                <span className="flex size-4 items-center">{here ? <Check /> : null}</span>
                <span className="truncate">{folder.name}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {moves.up || moves.down ? (
        <>
          <DropdownMenuItem disabled={!moves.up} onSelect={() => moves.up && themes.library(moves.up)}>
            <ArrowUp /> {m.moveUp}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!moves.down} onSelect={() => moves.down && themes.library(moves.down)}>
            <ArrowDown /> {m.moveDown}
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}
