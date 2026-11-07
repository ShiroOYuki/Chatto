/**
 * Theme switcher from Kibo UI (https://www.kibo-ui.com/components/theme-switcher), MIT © shadcnblocks.
 * Adapted for Chatto: no SSR mount guard (Electron renders on the client),
 * a per-instance layoutId, labels in the interface language, and an active indicator styled like the
 * kit's Segmented control (raised tile island, same spring) so the two read as one family.
 */
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useCallback, useId } from 'react';
import { cn } from '@/lib/utils';
import { useMessages } from '../../../i18n';
import { SlidingHighlight } from '../../motion';

const themes = [
  { key: 'system', icon: Monitor },
  { key: 'light', icon: Sun },
  { key: 'dark', icon: Moon },
] as const;

export type ThemeSwitcherProps = {
  value?: 'light' | 'dark' | 'system';
  onChange?: (theme: 'light' | 'dark' | 'system') => void;
  defaultValue?: 'light' | 'dark' | 'system';
  className?: string;
};

export const ThemeSwitcher = ({ value, onChange, defaultValue = 'system', className }: ThemeSwitcherProps) => {
  const [theme, setTheme] = useControllableState({
    defaultProp: defaultValue,
    prop: value,
    onChange,
  });
  const layoutId = useId();
  const labels = useMessages().shell.colorScheme;

  const handleThemeClick = useCallback(
    (themeKey: 'light' | 'dark' | 'system') => {
      setTheme(themeKey);
    },
    [setTheme],
  );

  return (
    <div className={cn('relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border', className)}>
      {themes.map(({ key, icon: Icon }) => {
        const isActive = theme === key;
        const label = labels[key];

        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className="relative h-6 w-6 rounded-full"
            key={key}
            onClick={() => handleThemeClick(key)}
            type="button"
          >
            {isActive && (
              <SlidingHighlight
                layoutId={`theme-switcher-${layoutId}`}
                className="absolute inset-0 rounded-full bg-tile shadow-sm"
              />
            )}
            <Icon className={cn('relative z-10 m-auto h-4 w-4', isActive ? 'text-ink' : 'text-ink-soft')} />
          </button>
        );
      })}
    </div>
  );
};
