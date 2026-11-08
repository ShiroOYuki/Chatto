/**
 * Turns the changelog into the notes of a GitHub Release: English first, then Traditional
 * Chinese and Japanese. Release workflow: `node apps/site/src/releaseNotes.mjs v0.2.0 > notes.md`. It exits
 * with an error when the changelog has no entry for that version, so a release cannot go out
 * without one.
 */
import { pathToFileURL } from 'node:url';
import { CHANGELOG } from './changelog.mjs';

const HEADINGS = {
  en: { new: 'New', improved: 'Improved', fixed: 'Fixed', obs: 'OBS plugin' },
  'zh-TW': { new: '新功能', improved: '改進', fixed: '修正', obs: 'OBS 外掛' },
  ja: { new: '新機能', improved: '改善', fixed: '修正', obs: 'OBS プラグイン' },
};

/** The entry of the app's changelog for `tag` (for example `v0.2.0`), if there is one. */
export const findEntry = (tag) => CHANGELOG.app.find((entry) => entry.version === tag);

function sections(entry, locale, level) {
  const h = HEADINGS[locale];
  const parts = [];
  if (entry.summary) parts.push(entry.summary[locale]);
  for (const section of entry.sections)
    parts.push(`${level} ${h[section.kind]}\n\n${section.items.map((item) => `- ${item[locale]}`).join('\n')}`);
  return parts;
}

function notesIn(locale, entry, plugin) {
  const parts = sections(entry, locale, '###');
  if (plugin) {
    const h = HEADINGS[locale];
    parts.push(`### ${h.obs} ${plugin.version}`);
    parts.push(...sections(plugin, locale, '####'));
  }
  return parts.join('\n\n');
}

/** The Markdown notes for the release `tag`. Throws when the changelog has no entry for it. */
export function releaseNotes(tag) {
  const entry = findEntry(tag);
  if (!entry)
    throw new Error(
      `apps/site/src/changelog.mjs has no entry for ${tag}. Turn the upcoming entry into ${tag} with its date before releasing.`,
    );
  const plugin = CHANGELOG.obs.find((item) => item.chatto === tag);
  return `${notesIn('en', entry, plugin)}\n\n## 繁體中文\n\n${notesIn('zh-TW', entry, plugin)}\n\n## 日本語\n\n${notesIn('ja', entry, plugin)}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const tag = process.argv[2];
  try {
    if (!tag) throw new Error('Usage: node apps/site/src/releaseNotes.mjs <tag>');
    process.stdout.write(releaseNotes(tag));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
