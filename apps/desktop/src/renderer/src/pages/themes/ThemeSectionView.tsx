import { ArrowDown, ArrowUp, ChevronRight, Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useMessages } from '../../i18n';
import { themes } from '../../services/themes';
import { Stagger } from '../../components/motion';
import { Badge, Button } from '../../components/kit';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { LibraryOp } from '../../../../shared/themeLibrary';
import { DRAG_FOLDER, DRAG_THEME, sectionFolder, type ThemeSection } from './library';

const SLIDE_MS = 240;

/**
 * One section of the themes page: a header that collapses it and takes dropped themes (and,
 * for folders, dropped folders), then its cards.
 */
export function ThemeSectionView({
  section,
  name,
  collapsed,
  canCollapse,
  folderMoves,
  onRename,
  onDelete,
  children,
}: {
  section: ThemeSection;
  name: string;
  collapsed: boolean;
  /** False while searching: every section shows its matches. */
  canCollapse: boolean;
  /** Folder sections only: keyboard alternative to dragging the header. */
  folderMoves?: { up: LibraryOp | null; down: LibraryOp | null };
  onRename?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const m = useMessages().themes.library;
  const gridId = useId();
  const [dropping, setDropping] = useState(false);
  const folderId = sectionFolder(section);
  const isFolder = section.kind === 'folder';
  const open = !collapsed || !canCollapse;
  // Once the slide has finished, a closed section drops out of layout, so its card previews,
  // drawn only when they come into view, stay undrawn until it opens again.
  const [shut, setShut] = useState(!open);
  if (open && shut) setShut(false);
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setShut(true), SLIDE_MS + 40);
    return () => clearTimeout(timer);
  }, [open]);

  const accepts = (event: React.DragEvent) =>
    (folderId !== undefined && event.dataTransfer.types.includes(DRAG_THEME)) ||
    (section.kind !== 'built-in' && event.dataTransfer.types.includes(DRAG_FOLDER));

  return (
    <section
      aria-label={name}
      className={`mb-6 rounded-tile transition-shadow ${dropping ? 'ring-2 ring-matcha/60 ring-offset-4 ring-offset-canvas' : ''}`}
      onDragOver={(event) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropping(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
      }}
      onDrop={(event) => {
        setDropping(false);
        if (!accepts(event)) return;
        event.preventDefault();
        const theme = event.dataTransfer.getData(DRAG_THEME);
        const folder = event.dataTransfer.getData(DRAG_FOLDER);
        if (theme && folderId !== undefined)
          themes.library({ type: 'move-theme', themeId: theme, folderId, before: null });
        else if (folder && folder !== section.id)
          themes.library({ type: 'move-folder', id: folder, before: isFolder ? section.id : null });
      }}
    >
      <header
        className="mb-3 flex items-center gap-1"
        draggable={isFolder}
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_FOLDER, section.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={gridId}
          aria-label={open ? m.collapse(name) : m.expand(name)}
          disabled={!canCollapse}
          onClick={() => themes.library({ type: 'set-collapsed', section: section.id, collapsed: open })}
          className="-ml-1 flex min-w-0 items-center gap-1.5 rounded-lg py-1 pr-2 pl-1 text-ink-soft transition-colors hover:bg-tile-muted hover:text-ink disabled:cursor-default disabled:hover:bg-transparent"
        >
          <ChevronRight
            aria-hidden
            className={`size-4 shrink-0 motion-safe:transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="truncate text-sm font-semibold text-ink">{name}</span>
          <Badge>{m.count(section.themes.length)}</Badge>
        </button>
        {isFolder ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" aria-label={m.folderActions(name)}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem onSelect={onRename}>
                <Pencil /> {m.rename}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!folderMoves?.up}
                onSelect={() => folderMoves?.up && themes.library(folderMoves.up)}
              >
                <ArrowUp /> {m.moveUp}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!folderMoves?.down}
                onSelect={() => folderMoves?.down && themes.library(folderMoves.down)}
              >
                <ArrowDown /> {m.moveDown}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> {m.deleteFolder}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>
      {/* Collapsing only slides the row shut: the cards stay mounted, so opening the section again
          neither redraws their previews nor replays the stagger, and the sections below glide
          instead of jumping. `visibility` flips at the end, taking the cards out of reach. */}
      <div
        id={gridId}
        inert={!open}
        style={{ transitionDuration: `${SLIDE_MS}ms` }}
        className={`grid transition-[grid-template-rows,opacity,visibility] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
          open ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
        }`}
      >
        <div hidden={shut} className="min-h-0 overflow-clip [overflow-clip-margin:12px]">
          {section.themes.length > 0 ? (
            <Stagger className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">{children}</Stagger>
          ) : (
            <p className="rounded-tile border border-dashed border-line px-4 py-6 text-center text-xs text-ink-faint">
              {m.emptyFolder}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
