import type { ShareErrorCode, ShareIssue, ShareResult } from '@chatto/share';
import type { Messages } from '../../i18n';

type ShareMessages = Messages['share'];

/** `1536` → `1.5 KB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function issueText(m: ShareMessages, issue: ShareIssue): string {
  const t = m.publish.issues;
  switch (issue.code) {
    case 'name-missing':
    case 'category-missing':
    case 'unchanged-copy':
    case 'image-inline':
      return t[issue.code];
    case 'image-missing':
      return t[issue.code](issue.file);
    case 'name-too-long':
    case 'description-too-long':
    case 'too-many-tags':
      return t[issue.code](issue.max);
    case 'tag-too-long':
      return t[issue.code](issue.tag, issue.max);
    case 'theme-too-large':
    case 'css-too-large':
    case 'image-too-large':
      return t[issue.code](formatBytes(issue.bytes), formatBytes(issue.max));
    case 'css-external':
      return t[issue.code](issue.excerpt);
    case 'too-many-images':
      return t[issue.code](issue.count, issue.max);
    default: {
      const unreachable: never = issue;
      return String(unreachable);
    }
  }
}

export const errorText = (m: ShareMessages, error: ShareErrorCode) => m.errors[error];

/** What to tell the user about a failed call: its issues when it has them, otherwise its error. */
export function failureText(m: ShareMessages, result: ShareResult<unknown>): string | null {
  if (result.ok) return null;
  if (result.issues?.length) return result.issues.map((issue) => issueText(m, issue)).join('\n');
  return errorText(m, result.error);
}

/** Compact counts in the interface language: 1,203 → 1.2K / 1203. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
