import { ArrowRight, Check, Rocket, X } from 'lucide-react';
import type { AppState } from '../../../shared/ipc';
import type { PageId } from '../components/Sidebar';
import { TeaCup } from '../components/TeaCup';
import { Button, Hint, Tile } from '../components/kit';
import { useMessages } from '../i18n';
import { onboarding, onboardingComplete, onboardingItems } from '../services/onboarding';

/**
 * The overview's getting-started list (#54), full mode only: each step ticks itself from the
 * app's state and has a button to where it is done. When every required step is done it says so
 * and can be closed; it can be closed for good at any time.
 */
export function GettingStarted({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const m = useMessages().overview.gettingStarted;
  const items = onboardingItems(state);
  const required = items.filter((item) => !item.optional);
  const doneCount = required.filter((item) => item.done).length;

  if (onboardingComplete(items)) {
    return (
      <Tile className="col-span-6 flex-row! items-center gap-4">
        <div className="shrink-0 rounded-full bg-matcha-soft/50 p-1.5">
          <TeaCup mood="happy" size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{m.complete}</h2>
          <p className="text-sm text-ink-soft">{m.completeHint}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onNavigate('outputs')}>
          {m.goOutputs} <ArrowRight />
        </Button>
        <Button size="sm" onClick={() => onboarding.dismiss()}>
          {m.collapse}
        </Button>
      </Tile>
    );
  }

  return (
    <Tile
      title={m.title}
      icon={<Rocket />}
      className="col-span-6"

      action={
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-ink-faint">{m.progress(doneCount, required.length)}</span>
          <Hint label={m.dismiss}>
            <Button size="sm" variant="ghost" aria-label={m.dismiss} onClick={() => onboarding.dismiss()}>
              <X />
            </Button>
          </Hint>
        </div>
      }
    >
      <ol className="grid grid-cols-4 gap-2 max-[1180px]:grid-cols-2">
        {items.map((item, index) => {
          const label = m.steps[item.step];
          return (
            <li
              key={item.step}
              aria-label={item.done ? m.doneLabel(label) : label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${item.done ? 'bg-matcha-soft/40' : 'bg-tile-muted'}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  item.done ? 'bg-matcha-strong text-on-matcha' : 'bg-tile text-ink-soft ring-1 ring-line'
                }`}
                aria-hidden
              >
                {item.done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm leading-snug font-medium ${item.done ? 'text-ink-soft line-through' : ''}`}>
                  {label}
                </div>
                {item.optional ? <div className="text-[11px] text-ink-faint">{m.optional}</div> : null}
              </div>
              {item.done ? null : (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onNavigate(item.page)}>
                  {m.go[item.step]}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </Tile>
  );
}
