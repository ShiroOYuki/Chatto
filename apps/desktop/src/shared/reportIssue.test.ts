import { describe, expect, it } from 'vitest';
import { reportIssueUrl } from './reportIssue';

describe('reportIssueUrl', () => {
  it('opens the bug report form with the version filled in', () => {
    const url = new URL(reportIssueUrl('0.3.0'));
    expect(url.origin + url.pathname).toBe('https://github.com/ShiroOYuki/Chatto/issues/new');
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('version')).toBe('0.3.0');
  });
});
