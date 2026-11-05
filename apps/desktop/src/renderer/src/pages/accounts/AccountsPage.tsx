import { useState, type ReactNode } from 'react';
import type { ShareProvider } from '@chatto/share';
import type { AppState } from '../../../../shared/ipc';
import { PageHeader } from '../../components/kit';
import { SignInDialog } from '../../components/share/SignInDialog';
import { useMessages } from '../../i18n';
import { ChattoAccount } from './ChattoAccount';
import { PlatformCards } from './PlatformCards';

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <header>
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * Every account in one place: the Chatto account (theme sharing) and the streaming platforms
 * Chatto reads chat from. They stay separate underneath; the sharing account never uses a chat token.
 */
export function AccountsPage({ state }: { state: AppState }) {
  const m = useMessages().accounts;
  const session = state.share.session;
  const [signIn, setSignIn] = useState<{ provider?: ShareProvider } | null>(null);

  return (
    <div>
      <PageHeader title={m.title} description={m.description} />
      <div className="flex flex-col gap-6">
        <Section id="accounts-chatto" title={m.chatto.title} hint={m.chatto.hint}>
          <ChattoAccount
            account={session.status === 'signed-in' ? session.account : null}
            pending={session.status === 'pending'}
            onSignIn={(provider) => setSignIn({ provider })}
          />
        </Section>
        <Section id="accounts-platforms" title={m.platforms.title} hint={m.platforms.hint}>
          <PlatformCards state={state} />
        </Section>
      </div>
      <SignInDialog open={signIn !== null} onOpenChange={(next) => !next && setSignIn(null)} only={signIn?.provider} />
    </div>
  );
}
