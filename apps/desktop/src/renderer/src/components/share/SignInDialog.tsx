import { useEffect, useRef, useState } from 'react';
import { SHARE_PROVIDERS, type ShareProvider } from '@chatto/share';
import { ActionNote, Button, LoadingSpinner, Modal, Toggle } from '../kit';
import { useMessages } from '../../i18n';
import { runAction } from '../../services/run';
import { shareCall, useShareSession } from '../../services/share';
import { errorText } from './shareText';

/** The terms and privacy notice, as one scrolling block. */
export function TermsText() {
  const t = useMessages().shareTerms;
  return (
    <div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border border-line bg-canvas p-4 text-xs leading-relaxed text-ink-soft">
      {[t.terms, t.privacy].map((section) => (
        <section key={section.title}>
          <h3 className="mb-2 text-sm font-medium text-ink">{section.title}</h3>
          <ol className="list-decimal space-y-1.5 pl-4">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * Signing in, or linking another sign-in method when already signed in: agree to the terms
 * (once per terms version), pick a provider, finish in the browser. Closes when it is done.
 */
export function SignInDialog({
  open,
  onOpenChange,
  only,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Linking: offer just this provider. */
  only?: ShareProvider;
}) {
  const m = useMessages().share;
  const { session, needsTerms } = useShareSession();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // The sign-in this dialog started finished: close it.
  useEffect(() => {
    if (!open || !started.current || session.status === 'pending') return;
    started.current = false;
    if (session.error) setError(errorText(m, session.error));
    else onOpenChange(false);
  }, [open, session, m, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setAgreed(false);
    }
  }, [open]);

  const start = async (provider: ShareProvider) => {
    setError(null);
    started.current = true;
    const result = await shareCall('signIn', provider);
    if (!result.ok) {
      started.current = false;
      setError(errorText(m, result.error));
    }
  };

  const linking = session.status === 'signed-in' || (session.status === 'pending' && session.linking);
  const providers = only ? [only] : SHARE_PROVIDERS;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && session.status === 'pending') runAction('share.cancelSignIn', shareCall('cancelSignIn'));
        onOpenChange(next);
      }}
      title={m.signInDialog.title}
      description={m.signInDialog.description}
      className="sm:max-w-lg"
    >
      {session.status === 'pending' ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <LoadingSpinner size={24} />
          <p className="text-sm font-medium">{m.signInDialog.waiting}</p>
          <p className="text-xs text-ink-faint">{m.signInDialog.waitingHint}</p>
          <Button size="sm" variant="ghost" onClick={() => runAction('share.cancelSignIn', shareCall('cancelSignIn'))}>
            {m.signInDialog.cancel}
          </Button>
        </div>
      ) : needsTerms ? (
        <div className="flex flex-col gap-4">
          <TermsText />
          <label className="flex items-center gap-3 text-sm">
            <Toggle checked={agreed} onChange={setAgreed} label={m.signInDialog.agree} />
            {m.signInDialog.agree}
          </label>
          <div className="flex justify-end">
            <Button
              variant="primary"
              aria-disabled={!agreed}
              className={agreed ? '' : 'pointer-events-none opacity-50'}
              onClick={() => agreed && runAction('share.acceptTerms', shareCall('acceptTerms'))}
            >
              {m.signInDialog.continue}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-faint">{m.signInDialog.chooseProvider}</p>
          {providers.map((provider) => (
            <Button key={provider} size="lg" onClick={() => void start(provider)}>
              {linking
                ? m.signInDialog.linkProvider(m.providers[provider])
                : m.signInDialog.withProvider(m.providers[provider])}
            </Button>
          ))}
        </div>
      )}
      {error ? <ActionNote tone="error">{error}</ActionNote> : null}
    </Modal>
  );
}
