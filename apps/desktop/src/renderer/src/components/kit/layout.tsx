import type { ReactNode } from 'react';
import { motion, riseIn } from '../motion';
import { TeaCup, type TeaCupMood } from '../TeaCup';

export function Tile({
  className = '',
  title,
  icon,
  action,
  children,
}: {
  className?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      variants={riseIn}
      className={`flex min-w-0 flex-col rounded-tile border border-line bg-tile p-5 ${className}`}
    >
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            {icon ? <span className="text-matcha [&>svg]:size-4">{icon}</span> : null}
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </motion.section>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ mood = 'sleepy', title, hint }: { mood?: TeaCupMood; title: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <TeaCup mood={mood} size={64} />
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
