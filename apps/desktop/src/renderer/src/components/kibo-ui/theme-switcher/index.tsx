/**
 * Theme switcher from Kibo UI (https://www.kibo-ui.com/components/theme-switcher), MIT © shadcnblocks.
 * Adapted for Chatto: no SSR mount guard (Electron renders on the client),
 * a per-instance layoutId, and Traditional Chinese labels.
 */
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useId } from 'react';
import { cn } from '@/lib/utils';

const themes = [
  {
    key: 'system',
    icon: Monitor,
    label: '跟隨系統',
  },
  {
    key: 'light',
    icon: Sun,
    label: '亮色',
  },
  {
    key: 'dark',
    icon: Moon,
    label: '暗色',
  },
];

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

  const handleThemeClick = useCallback(
    (themeKey: 'light' | 'dark' | 'system') => {
      setTheme(themeKey);
    },
    [setTheme],
  );

  return (
    <div className={cn('relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border', className)}>
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;

        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className="relative h-6 w-6 rounded-full"
            key={key}
            onClick={() => handleThemeClick(key as 'light' | 'dark' | 'system')}
            type="button"
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-secondary"
                layoutId={`theme-switcher-${layoutId}`}
                transition={{ type: 'spring', duration: 0.5 }}
              />
            )}
            <Icon
              className={cn('relative z-10 m-auto h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground')}
            />
          </button>
        );
      })}
    </div>
  );
};
