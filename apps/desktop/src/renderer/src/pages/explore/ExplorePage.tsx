import { LogIn, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../../shared/ipc';
import type { ShareProvider, ShareThemeSummary } from '@chatto/share';
import { Button, LoadingSpinner, PageHeader, Segmented } from '../../components/kit';
import { useMessages } from '../../i18n';
import { AccountView } from './AccountView';
import { BrowseView } from './BrowseView';
import { ModerationView } from './ModerationView';
import { MyThemesView } from './MyThemesView';
import { SignInDialog } from './SignInDialog';
import { ThemeDetailDialog } from './ThemeDetailDialog';

type Tab = 'browse' | 'mine' | 'account' | 'moderation';

const initialTab = (new URLSearchParams(location.search).get('exploreTab') as Tab | null) ?? 'browse';

/** Theme sharing (GitHub #4): browse and install shared themes, publish your own, manage the account. */
export function ExplorePage({ state }: { state: AppState }) {
  const messages = useMessages();
  const m = messages.share;
  const session = state.share.session;
  const account = session.status === 'signed-in' ? session.account : null;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [open, setOpen] = useState<ShareThemeSummary | null>(null);
  const [changed, setChanged] = useState<ShareThemeSummary | null>(null);
  const [signIn, setSignIn] = useState<{ provider?: ShareProvider } | null>(null);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'browse', label: m.tabs.browse },
    { value: 'mine', label: m.tabs.mine },
    { value: 'account', label: m.tabs.account },
    ...(account?.role === 'moderator' ? [{ value: 'moderation' as const, label: m.tabs.moderation }] : []),
  ];
  const current = tabs.some((item) => item.value === tab) ? tab : 'browse';
  const askSignIn = (provider?: ShareProvider) => setSignIn({ provider });

  return (
    <div>
      <PageHeader
        title={messages.shell.pages.explore}
        description={m.description}
        action={
          session.status === 'pending' ? (
            <Button variant="ghost" onClick={() => askSignIn()}>
              <LoadingSpinner /> {m.signingIn}
            </Button>
          ) : account ? (
            <Button variant="ghost" onClick={() => setTab('account')}>
              <UserRound /> {account.displayName}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => askSignIn()}>
              <LogIn /> {m.signIn}
            </Button>
          )
        }
      />
      <div className="mb-4">
        <Segmented value={current} onChange={setTab} options={tabs} />
      </div>

      {current === 'browse' ? (
        <BrowseView onOpen={setOpen} changed={changed} />
      ) : current === 'mine' ? (
        <MyThemesView account={account} onSignIn={() => askSignIn()} onOpen={setOpen} />
      ) : current === 'account' ? (
        <AccountView account={account} onSignIn={askSignIn} />
      ) : (
        <ModerationView onOpen={setOpen} />
      )}

      <ThemeDetailDialog
        summary={open}
        onOpenChange={(next) => !next && setOpen(null)}
        onChanged={setChanged}
        onSignIn={() => askSignIn()}
      />
      <SignInDialog open={signIn !== null} onOpenChange={(next) => !next && setSignIn(null)} only={signIn?.provider} />
    </div>
  );
}
