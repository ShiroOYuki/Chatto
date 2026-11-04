import type { ReactNode } from 'react';
import { motion, spring } from '../motion';

/**
 * One entry of a page's left menu (theme editor sections, settings tabs). The active
 * entry's highlight slides between entries that share `group`.
 */
export function SideNavItem({
  group,
  active,
  icon,
  label,
  trailing,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  /** Shared by the entries of one menu, so the highlight moves within it only. */
  group: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex h-9 shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
        active ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {active ? (
        <motion.span layoutId={group} transition={spring} className="absolute inset-0 rounded-xl bg-tile shadow-sm" />
      ) : null}
      <span className={`relative [&>svg]:size-4 ${active ? 'text-matcha' : 'text-ink-faint'}`}>{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="relative flex">{trailing}</span> : null}
    </button>
  );
}
