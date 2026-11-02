import type { ChatTheme, RoleKey, RoleStyle } from '@chatto/core';
import type { Dispatch, SetStateAction } from 'react';
import { ImageFrameEditor, OptionalColorRow } from '../fields';
import { patchRole } from '../draft';
import { useMessages } from '../../../i18n';
import { roleName, STYLED_ROLES } from '../options';
import { PanelIntro } from './shared';

const ROLE_FIELDS: Exclude<keyof RoleStyle, 'frame'>[] = [
  'nameColor',
  'nameBackground',
  'surfaceBackground',
  'borderColor',
];

export function RolesPanel({ draft, setDraft }: { draft: ChatTheme; setDraft: Dispatch<SetStateAction<ChatTheme>> }) {
  const messages = useMessages().editorPanels;
  const m = messages.roles;
  const setRole = (key: RoleKey, patch: Partial<RoleStyle>) => setDraft((current) => patchRole(current, key, patch));
  return (
    <>
      <PanelIntro>{m.intro}</PanelIntro>
      {STYLED_ROLES.map((key) => (
        <div key={key} className="border-t border-line py-2 first:border-t-0">
          <div className="text-sm font-medium">{roleName(messages, key)}</div>
          {ROLE_FIELDS.map((field) => (
            <OptionalColorRow
              key={field}
              label={m[field]}
              value={draft.roles[key]?.[field]}
              onChange={(value) => setRole(key, { [field]: value })}
            />
          ))}
          <ImageFrameEditor
            label={m.frame}
            value={draft.roles[key]?.frame}
            onChange={(frame) => setRole(key, { frame: frame ?? undefined })}
          />
        </div>
      ))}
    </>
  );
}
