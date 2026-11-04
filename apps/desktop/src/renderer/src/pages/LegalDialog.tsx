import { useState, type ReactNode } from 'react';
import licenseText from '../../../../../../LICENSE?raw';
import noticesText from '../../../../../../THIRD_PARTY_NOTICES.md?raw';
import { Modal, Segmented } from '../components/kit';
import { useMessages } from '../i18n';
import { openExternal } from '../services/app';

type Tab = 'disclaimer' | 'license' | 'thirdParty';

/** Links, `code` and plain text of one Markdown line; links open in the browser (https only). */
function inline(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`)/).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <button
          key={index}
          type="button"
          onClick={() => openExternal(link[2]!)}
          className="text-matcha-strong underline underline-offset-2 hover:text-matcha"
        >
          {link[1]}
        </button>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={index} className="rounded bg-tile-muted px-1 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

/**
 * Just enough Markdown for THIRD_PARTY_NOTICES.md: headings, paragraphs and tables.
 * The file is ours, so nothing else needs handling.
 */
function NoticeMarkdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim() || line.startsWith('# ')) continue; // the dialog has its own title
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={i} className="mt-5 text-sm font-semibold first:mt-0">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i]!.startsWith('|'); i++) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i]!.trim())) rows.push(cells(lines[i]!));
      }
      i--;
      const [head, ...body] = rows;
      blocks.push(
        <table key={i} className="mt-2 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              {head?.map((cell, c) => (
                <th key={c} className="py-1.5 pr-3 font-medium">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-b border-line/60 align-top">
                {row.map((cell, c) => (
                  <td key={c} className="py-1.5 pr-3">
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    blocks.push(
      <p key={i} className="mt-2 text-xs leading-relaxed text-ink-soft">
        {inline(line)}
      </p>,
    );
  }
  return <>{blocks}</>;
}

/** Settings → About → "License": the disclaimer, the GPL text and third-party notices. */
export function LegalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const m = useMessages().legal;
  const [tab, setTab] = useState<Tab>('disclaimer');
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={m.title} description={m.description}>
      <Segmented<Tab>
        size="sm"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'disclaimer', label: m.tabs.disclaimer },
          { value: 'license', label: m.tabs.license },
          { value: 'thirdParty', label: m.tabs.thirdParty },
        ]}
      />
      <div className="-mx-2 max-h-[55vh] overflow-y-auto px-2" data-legal-tab={tab}>
        {tab === 'disclaimer' ? (
          <div className="flex flex-col gap-4">
            {m.disclaimer.map((section) => (
              <section key={section.title}>
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{section.body}</p>
              </section>
            ))}
          </div>
        ) : tab === 'license' ? (
          <>
            <p className="mb-2 text-xs text-ink-faint">{m.licenseNote}</p>
            <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink-soft">{licenseText}</pre>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-faint">{m.thirdPartyNote}</p>
            <NoticeMarkdown source={noticesText} />
          </>
        )}
      </div>
    </Modal>
  );
}
