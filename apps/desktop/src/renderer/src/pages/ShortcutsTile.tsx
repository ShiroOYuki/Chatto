import { CircleAlert, Keyboard, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import type { AppState } from '../../../shared/ipc';
import {
  acceleratorFromKeyPress,
  SHORTCUT_ACTIONS,
  shortcutLabel,
  type ShortcutAction,
} from '../../../shared/shortcuts';
import { Button, Hint, Tile } from '../components/kit';
import { useMessages } from '../i18n';
import { shortcuts } from '../services/shortcuts';

/** One shortcut: click, press the keys, done. Escape cancels; leaving the field cancels too. */
function ShortcutField({ action, value, failed }: { action: ShortcutAction; value: string; failed: boolean }) {
  const m = useMessages().settings;
  const name = m.shortcutActions[action];
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (accelerator: string) => {
    const result = await shortcuts.set(action, accelerator);
    if (result.ok) setError(null);
    else if (result.reason === 'duplicate') setError(m.shortcutErrors.duplicate(m.shortcutActions[result.action]));
    else setError(m.shortcutErrors.unavailable);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!listening) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      setListening(false);
      return;
    }
    const result = acceleratorFromKeyPress(event);
    if ('pending' in result) return;
    setListening(false);
    if ('error' in result) setError(m.shortcutErrors[result.error]);
    else void save(result.accelerator);
  };

  const hint = m.shortcutActionHints[action];
  const problem = error ?? (failed ? m.shortcutFailed : null);
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm font-medium">{name}</div>
          {hint ? <div className="mt-0.5 text-xs text-ink-faint">{hint}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={m.shortcutSet(name)}
            aria-pressed={listening}
            onClick={() => {
              setError(null);
              setListening(true);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setListening(false)}
            className={`h-9 min-w-36 rounded-xl px-3 text-sm transition-colors ${
              listening
                ? 'bg-matcha-soft text-matcha-strong ring-2 ring-matcha-strong'
                : value
                  ? 'bg-tile-muted font-mono text-ink hover:bg-matcha-soft/60'
                  : 'bg-tile-muted text-ink-faint hover:bg-matcha-soft/60'
            }`}
          >
            {listening ? m.shortcutListening : value ? shortcutLabel(value) : m.shortcutNone}
          </button>
          {value ? (
            <Hint label={m.shortcutClear(name)}>
              <Button size="sm" variant="ghost" aria-label={m.shortcutClear(name)} onClick={() => void save('')}>
                <X />
              </Button>
            </Hint>
          ) : (
            <span className="size-8" aria-hidden />
          )}
        </div>
      </div>
      {problem ? (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/** Settings › General: keys that work while a game has focus (#53). */
export function ShortcutsTile({ state }: { state: AppState }) {
  const m = useMessages().settings;
  const { bindings, failed } = state.shortcuts;
  return (
    <Tile title={m.shortcuts} icon={<Keyboard />}>
      <p className="text-xs text-ink-faint">{m.shortcutsHint}</p>
      <div className="mt-1">
        {SHORTCUT_ACTIONS.map((action) => (
          <ShortcutField key={action} action={action} value={bindings[action]} failed={failed.includes(action)} />
        ))}
      </div>
    </Tile>
  );
}
