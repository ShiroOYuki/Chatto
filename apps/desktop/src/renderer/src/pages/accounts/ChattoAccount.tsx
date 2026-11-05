import { LogIn, LogOut, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SHARE_LIMITS, SHARE_PROVIDERS, type ShareAccount, type ShareProvider } from '@chatto/share';
import { Stagger } from '../../components/motion';
import { ActionNote, Badge, Button, Field, LoadingSpinner, Modal, TextInput, Tile } from '../../components/kit';
import { TeaCup } from '../../components/TeaCup';
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
import { TermsText } from '../../components/share/SignInDialog';
import { errorText } from '../../components/share/shareText';

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
    <Stagger className="grid grid-cols-2 gap-3">
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
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button size="sm" variant="raised" onClick={() => runAction('share.signOut', shareCall('signOut'))}>
            <LogOut /> {m.account.signOut}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowTerms(true)}>
            {m.account.viewTerms}
          </Button>
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => setDeleting(true)}>
            <Trash2 /> {m.account.deleteAccount}
          </Button>
        </div>
        {error ? (
          <ActionNote tone="error" className="mt-3">
            {error}
          </ActionNote>
        ) : null}
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

/** The Chatto account on the accounts page: sign in, profile, linked sign-in methods, sign out and deletion. */
export function ChattoAccount({
  account,
  pending,
  onSignIn,
}: {
  account: ShareAccount | null;
  /** A sign-in is waiting for the browser. */
  pending: boolean;
  /** Opens sign-in; with a provider, links that method to the account. */
  onSignIn: (provider?: ShareProvider) => void;
}) {
  const m = useMessages().share;
  if (account) return <SignedInAccount account={account} onLink={onSignIn} />;
  return (
    <Stagger>
      <Tile className="flex-row! items-center gap-4">
        <TeaCup mood="sleepy" size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{m.account.signedOutTitle}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{m.account.signedOutHint}</p>
        </div>
        {pending ? (
          <Button variant="ghost" onClick={() => onSignIn()}>
            <LoadingSpinner /> {m.signingIn}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => onSignIn()}>
            <LogIn /> {m.signIn}
          </Button>
        )}
      </Tile>
    </Stagger>
  );
}
