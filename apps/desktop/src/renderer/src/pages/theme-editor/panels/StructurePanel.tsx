import { BLANK_STARTER_CSS } from '@chatto/chat-ui';
import type { ChatTheme } from '@chatto/core';
import type { Dispatch, SetStateAction } from 'react';
import { useMessages, useThemeName } from '../../../i18n';
import { ChoiceCards, Segmented, Select } from '../../../components/kit';
import { FieldRow, ToggleRow } from '../fields';
import { applyPreset, PRESET_CHOICES } from '../draft';
import { SubHeading, type PanelProps } from './shared';

export function StructurePanel({
  draft,
  set,
  setDraft,
}: PanelProps & { setDraft: Dispatch<SetStateAction<ChatTheme>> }) {
  const { avatar, badges, timestamp, author, list } = draft;
  const blank = draft.base === 'blank';
  const m = useMessages().editorPanels.structure;
  const themeName = useThemeName();
  return (
    <>
      <div className="pb-2">
        <div className="pb-2 text-xs font-medium text-ink-soft">{m.base}</div>
        <ChoiceCards
          value={draft.base}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              base: value,
              // Going blank with no CSS yet: start from a readable minimum instead of raw markup.
              customCss: value === 'blank' && !current.customCss.trim() ? BLANK_STARTER_CSS : current.customCss,
            }))
          }
          options={[
            { value: 'styled', title: m.styled, description: m.styledDescription },
            {
              value: 'blank',
              title: m.blank,
              description: m.blankDescription,
            },
          ]}
        />
      </div>
      {!blank ? (
        <FieldRow label={m.preset} hint={m.presetHint}>
          <Select
            value=""
            placeholder={m.presetPlaceholder}
            options={PRESET_CHOICES.map((item) => ({ value: item.id, label: themeName(item) }))}
            onChange={(presetId) => setDraft((current) => applyPreset(current, presetId))}
          />
        </FieldRow>
      ) : null}
      <SubHeading>{m.output}</SubHeading>
      <ToggleRow label={m.avatar} value={avatar.show} onChange={set('avatar', 'show')} />
      <ToggleRow label={m.badges} value={badges.show} onChange={set('badges', 'show')} />
      <ToggleRow label={m.time} value={timestamp.show} onChange={set('timestamp', 'show')} />
      {timestamp.show ? (
        <ToggleRow label={m.hour12} value={timestamp.hour12} onChange={set('timestamp', 'hour12')} />
      ) : null}
      <ToggleRow
        label={m.userColor}
        hint={m.userColorHint}
        value={author.useUserColor}
        onChange={set('author', 'useUserColor')}
      />
      <FieldRow label={m.direction}>
        <Segmented
          size="sm"
          value={list.direction}
          onChange={set('list', 'direction')}
          options={[
            { value: 'bottom-up', label: m.bottomUp },
            { value: 'top-down', label: m.topDown },
          ]}
        />
      </FieldRow>
    </>
  );
}
