import type { ChatTheme, RoleKey, RoleStyle } from '@chatto/core';
import type { Dispatch, SetStateAction } from 'react';
import { OptionalColorRow } from '../../../components/themeFields';
import { patchRole } from '../draft';
import { ROLE_LABELS } from '../options';
import { PanelIntro } from './shared';

const ROLE_FIELDS: { field: keyof RoleStyle; label: string }[] = [
  { field: 'nameColor', label: '名稱顏色' },
  { field: 'nameBackground', label: '名稱框底色' },
  { field: 'surfaceBackground', label: '訊息底色' },
  { field: 'borderColor', label: '框線顏色' },
];

export function RolesPanel({ draft, setDraft }: { draft: ChatTheme; setDraft: Dispatch<SetStateAction<ChatTheme>> }) {
  const setRole = (key: RoleKey, patch: Partial<RoleStyle>) => setDraft((current) => patchRole(current, key, patch));
  return (
    <>
      <PanelIntro>只會覆蓋開啟的項目；同時符合多個身分時，下方的設定優先。</PanelIntro>
      {ROLE_LABELS.map(({ key, label }) => (
        <div key={key} className="border-t border-line py-2 first:border-t-0">
          <div className="text-sm font-medium">{label}</div>
          {ROLE_FIELDS.map(({ field, label: fieldLabel }) => (
            <OptionalColorRow
              key={field}
              label={fieldLabel}
              value={draft.roles[key]?.[field]}
              onChange={(value) => setRole(key, { [field]: value })}
            />
          ))}
        </div>
      ))}
    </>
  );
}
