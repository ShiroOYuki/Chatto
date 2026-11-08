/** Where people report problems; the form is `.github/ISSUE_TEMPLATE/bug_report.yml`. */
export const ISSUES_URL = 'https://github.com/ShiroOYuki/Chatto/issues';

/** A new bug report with the app version already filled in. */
export function reportIssueUrl(version: string): string {
  const query = new URLSearchParams({ template: 'bug_report.yml', version });
  return `${ISSUES_URL}/new?${query}`;
}
