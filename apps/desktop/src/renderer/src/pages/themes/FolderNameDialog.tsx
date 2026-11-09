import { useState } from 'react';
import { useMessages } from '../../i18n';
import { Button, Field, Modal, TextInput } from '../../components/kit';
import { cleanFolderName, FOLDER_NAME_MAX } from '../../../../shared/themeLibrary';

/** Names a new folder or renames one; `initial` is the current name when renaming. */
export function FolderNameDialog({
  open,
  initial,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  initial?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}) {
  const m = useMessages().themes.library;
  const common = useMessages().common;
  const renaming = initial !== undefined;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={renaming ? m.renameTitle : m.newFolder}
      className="sm:max-w-sm"
    >
      {/* Keyed by the dialog's purpose so each opening starts from the right name. */}
      {open ? (
        <NameForm
          key={initial ?? ''}
          initial={initial ?? ''}
          label={m.folderName}
          submitLabel={renaming ? m.rename : m.create}
          cancelLabel={common.cancel}
          onCancel={() => onOpenChange(false)}
          onSubmit={(name) => {
            onSubmit(name);
            onOpenChange(false);
          }}
        />
      ) : null}
    </Modal>
  );
}

function NameForm({
  initial,
  label,
  submitLabel,
  cancelLabel,
  onCancel,
  onSubmit,
}: {
  initial: string;
  label: string;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const clean = cleanFolderName(name);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (clean) onSubmit(clean);
      }}
    >
      <Field label={label}>
        <TextInput
          aria-label={label}
          value={name}
          maxLength={FOLDER_NAME_MAX}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button type="submit" variant="primary" disabled={!clean}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
