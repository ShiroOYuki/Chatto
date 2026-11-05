import { LogIn, LogOut, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SHARE_LIMITS, SHARE_PROVIDERS, type ShareAccount, type ShareProvider } from '@chatto/share';
import { Stagger } from '../../components/motion';
import { Badge, Button, EmptyState, Field, Modal, TextInput, Tile } from '../../components/kit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useMessages } from '../../i18n';
import { runAction } from '../../services/run';
import { shareCall, useShareAction } from '../../services/share';
import { TermsText } from './SignInDialog';
import { errorText } from './shareText';

function SignedInAccount({ account, onLink }: { account: ShareAccount; onLink: (provider: ShareProvider) => void }) {
  const messages = useMessages();
  const m = messages.share;
  const [name, setName] = useState(account.displayName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { busy, run } = useShareAction();
  useEffect(() => setName(account.displayName), [account.displayName]);

  const saveName = async () => {
    setError(null);
    const result = await run(() => shareCall('setDisplayName', name));
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } else setError(errorText(m, result.error));
  };

  const unlink = async (provider: ShareProvider) => {
    setError(null);
    const result = await run(() => shareCall('unlink', provider));
    if (!result.ok) setError(errorText(m, result.error));
  };

  const remove = async () => {
    const result = await run(() => shareCall('deleteAccount'));
    if (!result.ok) setError(errorText(m, result.error));
  };

  const trimmed = name.trim();
  const nameChanged = trimmed !== account.displayName && trimmed.length > 0;
  const lastMethod = account.identities.length <= 1;

  return (
    <Stagger className="grid gap-3 lg:grid-cols-2">
      <Tile title={m.account.profile}>
        <Field label={m.account.displayName} hint={m.account.displayNameHint}>
          <div className="flex gap-2">
            <TextInput
              value={name}
              maxLength={SHARE_LIMITS.displayNameLength}
              onChange={(event) => setName(event.target.value)}
              aria-label={m.account.displayName}
            />
            <Button
              variant="primary"
              aria-disabled={!nameChanged || busy}
              className={!nameChanged || busy ? 'pointer-events-none opacity-50' : ''}
              onClick={() => void saveName()}
            >
              {saved ? messages.common.saved : messages.common.save}
            </Button>
          </div>
        </Field>
        {account.role === 'moderator' ? (
          <div className="mt-3">
            <Badge tone="matcha">{m.account.moderator}</Badge>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-ink-faint">{m.account.publishesLeft(account.publishesLeft)}</p>
      </Tile>

      <Tile title={m.account.methods}>
        <p className="mb-3 text-xs text-ink-faint">{m.account.methodsHint}</p>
        <ul className="flex flex-col gap-2">
          {SHARE_PROVIDERS.map((provider) => {
            const identity = account.identities.find((item) => item.provider === provider);
            return (
              <li key={provider} className="flex items-center gap-3 rounded-xl bg-tile-muted px-3 py-2">
                <span className="w-20 text-sm font-medium">{m.providers[provider]}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                  {identity ? identity.name : m.account.notLinked}
                </span>
                {identity ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-disabled={lastMethod || busy}
                    title={lastMethod ? m.account.lastMethod : undefined}
                    className={lastMethod ? 'pointer-events-none opacity-50' : ''}
                    onClick={() => void unlink(provider)}
                  >
                    {m.account.unlink}
                  </Button>
                ) : (
                  <Button size="sm" variant="raised" onClick={() => onLink(provider)}>
                    {m.account.link}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Tile>

      <Tile title={m.account.session} className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => runAction('share.signOut', shareCall('signOut'))}>
            <LogOut /> {m.account.signOut}
          </Button>
          <Button variant="ghost" onClick={() => setShowTerms(true)}>
            {m.account.viewTerms}
          </Button>
          <Button variant="danger" className="ml-auto" onClick={() => setDeleting(true)}>
            <Trash2 /> {m.account.deleteAccount}
          </Button>
        </div>
        {error ? <p className="mt-3 rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p> : null}
      </Tile>

      <Modal open={showTerms} onOpenChange={setShowTerms} title={m.account.viewTerms}>
        <TermsText />
      </Modal>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent className="rounded-tile">
          <AlertDialogHeader>
            <AlertDialogTitle>{m.account.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{m.account.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="rounded-xl" onClick={() => void remove()}>
              {m.account.deleteAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stagger>
  );
}

/** The Chatto account: sign in, profile, linked sign-in methods, sign out and deletion. */
export function AccountView({
  account,
  onSignIn,
}: {
  account: ShareAccount | null;
  /** Opens sign-in; with a provider, links that method to the account. */
  onSignIn: (provider?: ShareProvider) => void;
}) {
  const m = useMessages().share;
  if (!account)
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <EmptyState title={m.account.signedOutTitle} hint={m.account.signedOutHint} />
        <Button variant="primary" onClick={() => onSignIn()}>
          <LogIn /> {m.signIn}
        </Button>
      </div>
    );
  return <SignedInAccount account={account} onLink={onSignIn} />;
}
