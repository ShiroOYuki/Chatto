import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { AppState } from '../../../shared/ipc';
import { Button, Field, TextInput } from '../components/kit';
import { useMessages } from '../i18n';
import { twitch } from '../services/twitch';

/**
 * Sets the user's own Twitch Client ID, or goes back to the one built into this version.
 * Shown under "Advanced" on the connections and settings pages, which say which ID is in use.
 */
export function ClientIdForm({ clientId }: { clientId: AppState['clientId'] }) {
  const messages = useMessages();
  const m = messages.connections;
  const [text, setText] = useState('');
  const save = () => {
    twitch.setClientId(text);
    setText('');
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Client ID" hint={clientId.hasBuiltIn ? m.customClientIdHint : m.clientIdHint}>
        <TextInput
          aria-label="Client ID"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && text.trim()) save();
          }}
          placeholder={m.clientIdPlaceholder}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!text.trim()} onClick={save}>
          {messages.common.save}
        </Button>
        {clientId.source === 'custom' && clientId.hasBuiltIn ? (
          <Button variant="raised" onClick={() => twitch.setClientId('')}>
            {m.useBuiltInClientId}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => twitch.openDevConsole()}>
          <ExternalLink /> {m.openConsole}
        </Button>
      </div>
    </div>
  );
}
