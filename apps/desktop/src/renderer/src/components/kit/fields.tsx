import { Check, Copy } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Snippet, SnippetCopyButton, SnippetHeader, SnippetTabsContent } from '../kibo-ui/snippet';
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '../kibo-ui/tags';
import { SwapIcon } from '../motion';
import { Field as UiField, FieldDescription, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Button } from './Button';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <UiField className="gap-1.5">
      <FieldLabel className="text-xs font-medium text-ink-soft">{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription className="text-xs text-ink-faint">{hint}</FieldDescription> : null}
    </UiField>
  );
}

/** shadcn/ui input, styled for Chatto. */
export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      className={cn(
        'h-9 rounded-xl border-line bg-canvas shadow-none focus-visible:border-matcha focus-visible:ring-matcha/20 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

/** Kibo UI snippet: a read-only value with a copy button. */
export function CopyField({ value, label = '網址' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Snippet value="value" className="rounded-2xl border-line bg-tile-muted">
      <SnippetHeader className="border-line bg-transparent py-1 pr-1 pl-3">
        {/* A plain label, not a tab: a lone TabsTrigger picks up the active-tab island and border. */}
        <span className="text-xs text-ink-faint">{label}</span>
        <SnippetCopyButton
          value={value}
          onCopy={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          asChild
        >
          <Button variant="primary" size="sm">
            <SwapIcon swapped={copied} from={<Copy />} to={<Check />} />
            {copied ? '複製好了' : '複製'}
          </Button>
        </SnippetCopyButton>
      </SnippetHeader>
      <SnippetTabsContent value="value" className="bg-transparent px-4 py-3 font-mono text-sm text-matcha-strong">
        {value}
      </SnippetTabsContent>
    </Snippet>
  );
}

/** Kibo UI tags: a list of strings with removable chips, free entry and suggestions. */
export function TagsField({
  value,
  onChange,
  suggestions = [],
  placeholder = '新增…',
  normalize = (text: string) => text.trim(),
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  normalize?: (text: string) => string;
}) {
  const [query, setQuery] = useState('');
  const typed = normalize(query);
  const add = (item: string) => {
    if (item && !value.includes(item)) onChange([...value, item]);
    setQuery('');
  };
  const remove = (item: string) => onChange(value.filter((entry) => entry !== item));
  const options = suggestions.filter((item) => !value.includes(item));
  return (
    <Tags className="w-full">
      <TagsTrigger
        placeholder={value.length ? '' : placeholder}
        className="min-h-9 rounded-xl border-line bg-canvas px-2 py-1.5 shadow-none hover:bg-canvas"
      >
        {value.map((item) => (
          <TagsValue
            key={item}
            onRemove={() => remove(item)}
            className="gap-1 rounded-full bg-tile-muted px-2 py-0.5 font-mono text-[11px] font-normal text-ink"
          >
            {item}
          </TagsValue>
        ))}
      </TagsTrigger>
      <TagsContent className="rounded-xl" align="start">
        <TagsInput value={query} onValueChange={setQuery} placeholder="輸入後按 Enter 新增" />
        <TagsList>
          <TagsEmpty>{typed ? null : '沒有建議'}</TagsEmpty>
          {typed && !value.includes(typed) && !options.includes(typed) ? (
            <TagsGroup>
              <TagsItem value={`add:${typed}`} onSelect={() => add(typed)}>
                新增「{typed}」
              </TagsItem>
            </TagsGroup>
          ) : null}
          {options.length ? (
            <TagsGroup heading="建議">
              {options.map((item) => (
                <TagsItem key={item} value={item} onSelect={() => add(item)}>
                  <span className="font-mono">{item}</span>
                </TagsItem>
              ))}
            </TagsGroup>
          ) : null}
        </TagsList>
      </TagsContent>
    </Tags>
  );
}
