import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Tile({
  className = '',
  title,
  action,
  children,
}: {
  className?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-tile border border-line bg-tile p-5 ${className}`}>
      {title ? (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-ink-soft">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-matcha-strong text-on-matcha hover:opacity-90',
    secondary: 'bg-tile-muted text-ink hover:bg-matcha-soft/60',
    ghost: 'text-ink-soft hover:bg-tile-muted',
  };
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-matcha' : 'bg-line'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

export function StatusDot({ tone }: { tone: 'ok' | 'idle' | 'warn' | 'error' }) {
  const color = { ok: 'bg-matcha', idle: 'bg-ink-faint', warn: 'bg-amber-400', error: 'bg-danger' }[tone];
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {tone === 'ok' ? <span className={`absolute inset-0 animate-ping rounded-full ${color} opacity-60`} /> : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
