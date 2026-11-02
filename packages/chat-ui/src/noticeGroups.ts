import { noticeGroup, type ChatNotice } from '@chatto/core';

/**
 * Batches of notices (a community gift and each gifted sub) show as one entry:
 * the lead notice, carrying the batch's other notices as its members. Works on
 * any list of entries so the OBS feed, the alert overlay and the control panel
 * log merge the same way.
 */
export interface NoticeGroupAccess<T> {
  /** The notice an entry shows, or undefined for entries that are not notices. */
  notice(entry: T): ChatNotice | undefined;
  /** Notices already merged into an entry. */
  members(entry: T): ChatNotice[];
  withMembers(entry: T, members: ChatNotice[]): T;
}

export type GroupedNotice<T> =
  /** A member whose lead is already listed: the entries with it merged in. Show nothing new. */
  | { merged: true; entries: T[] }
  /** Show the notice. `entries` drops members that arrived before their lead; `members` are those members. */
  | { merged: false; entries: T[]; members: ChatNotice[] };

export function groupNotice<T>(entries: T[], notice: ChatNotice, access: NoticeGroupAccess<T>): GroupedNotice<T> {
  const group = noticeGroup(notice);
  if (!group) return { merged: false, entries, members: [] };
  const sameGroup = (entry: T, lead: boolean) => {
    const other = access.notice(entry);
    const otherGroup = other && noticeGroup(other);
    return otherGroup?.id === group.id && otherGroup.lead === lead;
  };

  if (!group.lead) {
    const index = entries.findIndex((entry) => sameGroup(entry, true));
    if (index < 0) return { merged: false, entries, members: [] };
    const next = [...entries];
    next[index] = access.withMembers(entries[index]!, [...access.members(entries[index]!), notice]);
    return { merged: true, entries: next };
  }

  // The lead arrived after some of its members: fold them into it.
  const members = entries.filter((entry) => sameGroup(entry, false)).map((entry) => access.notice(entry)!);
  return members.length
    ? { merged: false, entries: entries.filter((entry) => !sameGroup(entry, false)), members }
    : { merged: false, entries, members };
}
