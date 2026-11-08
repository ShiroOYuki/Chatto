/**
 * Turns the app's changelog into `changelog.json`, attached to every GitHub Release so an
 * installed Chatto can show what changed in the versions it is about to update to (#39).
 * Release workflow: `node apps/site/src/changelogJson.mjs > changelog.json`.
 *
 * The format is read by `apps/desktop/src/shared/updateNotes.ts`; only add fields, so older
 * versions of the app can still read it. Item texts may mark code with backticks, nothing else.
 */
import { pathToFileURL } from 'node:url';
import { CHANGELOG } from './changelog.mjs';

/** Bump only for a change older apps cannot read. */
export const CHANGELOG_JSON_VERSION = 1;

/** Every released version of the app, newest first, in both languages. */
export function changelogJson() {
  return {
    format: CHANGELOG_JSON_VERSION,
    app: CHANGELOG.app
      .filter((entry) => !entry.upcoming && entry.version)
      .map(({ version, date, summary, sections }) => ({
        version,
        date,
        ...(summary ? { summary } : {}),
        sections: sections.map(({ kind, items }) => ({ kind, items })),
      })),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.stdout.write(`${JSON.stringify(changelogJson(), null, 2)}\n`);
}
