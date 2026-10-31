import type { ChatTheme } from '@chatto/core';
import type { ReactNode } from 'react';
import type { PathSetter } from '../draft';

export interface PanelProps {
  draft: ChatTheme;
  set: PathSetter<ChatTheme>;
}

/** Divider with a small caption that starts a group of fields inside a panel. */
export function SubHeading({ children }: { children: ReactNode }) {
  return <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">{children}</div>;
}

/** Short explanation shown at the top of a panel. */
export function PanelIntro({ children }: { children: ReactNode }) {
  return <p className="pb-2 text-xs text-ink-faint">{children}</p>;
}
