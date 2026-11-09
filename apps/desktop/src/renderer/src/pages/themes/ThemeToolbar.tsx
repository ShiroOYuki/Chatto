import { CircleCheck, FolderPlus, ListFilter, Search, X } from 'lucide-react';
import { useMessages } from '../../i18n';
import { Badge, Button, Hint, TextInput } from '../../components/kit';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ARRANGEMENTS, contentFilterCount, EMPTY_FILTER, isFiltering, type ThemeFilter } from './library';

/** Search, "in use", content filters and a new folder button above the theme sections (#42). */
export function ThemeToolbar({
  filter,
  onChange,
  onNewFolder,
}: {
  filter: ThemeFilter;
  onChange: (filter: ThemeFilter) => void;
  onNewFolder: () => void;
}) {
  const messages = useMessages();
  const m = messages.themes.library;
  const labels = messages.themes.labels;
  const count = contentFilterCount(filter);
  const set = (patch: Partial<ThemeFilter>) => onChange({ ...filter, ...patch });
  // Keeps the menu open while ticking several filters.
  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs min-w-48 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
        />
        <TextInput
          type="search"
          aria-label={m.searchLabel}
          placeholder={m.searchPlaceholder}
          value={filter.text}
          onChange={(event) => set({ text: event.target.value })}
          className="pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>
      <Hint label={m.inUseHint}>
        <Button
          aria-pressed={filter.inUse}
          variant={filter.inUse ? 'primary' : 'secondary'}
          onClick={() => set({ inUse: !filter.inUse })}
        >
          <CircleCheck /> {m.inUse}
        </Button>
      </Hint>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={count > 0 ? 'primary' : 'secondary'}>
            <ListFilter /> {m.filters}
            {count > 0 ? <Badge solid>{count}</Badge> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 rounded-xl">
          <DropdownMenuCheckboxItem
            checked={filter.imageFrame}
            onSelect={keepOpen}
            onCheckedChange={(checked) => set({ imageFrame: checked === true })}
          >
            {m.imageFrame}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filter.customCss}
            onSelect={keepOpen}
            onCheckedChange={(checked) => set({ customCss: checked === true })}
          >
            {m.customCss}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-ink-faint">{m.arrangement}</DropdownMenuLabel>
          {ARRANGEMENTS.map((arrangement) => (
            <DropdownMenuCheckboxItem
              key={arrangement}
              checked={filter.arrangements.includes(arrangement)}
              onSelect={keepOpen}
              onCheckedChange={(checked) =>
                set({
                  arrangements: checked
                    ? [...filter.arrangements, arrangement]
                    : filter.arrangements.filter((item) => item !== arrangement),
                })
              }
            >
              {labels[arrangement]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {isFiltering(filter) ? (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTER)}>
          <X /> {m.clearFilters}
        </Button>
      ) : null}
      <Button className="ml-auto" onClick={onNewFolder}>
        <FolderPlus /> {m.newFolder}
      </Button>
    </div>
  );
}
