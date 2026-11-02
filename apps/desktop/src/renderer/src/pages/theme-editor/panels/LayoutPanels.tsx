import type { MessageArrangement } from '@chatto/core';
import { Segmented } from '../../../components/kit';
import { useMessages } from '../../../i18n';
import { BoxEditor, FieldRow, NumberField } from '../fields';
import { SubHeading, type PanelProps } from './shared';

export function ListPanel({ draft, set }: PanelProps) {
  const { list } = draft;
  const m = useMessages().editorPanels.list;
  return (
    <>
      <FieldRow label={m.align}>
        <Segmented
          size="sm"
          value={list.align}
          onChange={set('list', 'align')}
          options={[
            { value: 'stretch', label: m.stretch },
            { value: 'start', label: m.start },
            { value: 'end', label: m.end },
          ]}
        />
      </FieldRow>
      <NumberField label={m.gap} value={list.gap} min={0} max={32} unit="px" onChange={set('list', 'gap')} />
      <SubHeading>{m.box}</SubHeading>
      <BoxEditor value={list.box} onChange={set('list', 'box')} />
    </>
  );
}

export function MessagePanel({ draft, set }: PanelProps) {
  const { message } = draft;
  const m = useMessages().editorPanels.message;
  return (
    <>
      <FieldRow label={m.arrangement} hint={m.arrangementHint}>
        <Segmented
          size="sm"
          value={message.arrangement}
          onChange={(value: MessageArrangement) => set('message', 'arrangement')(value)}
          options={[
            { value: 'inline', label: m.inline },
            { value: 'stacked', label: m.stacked },
            { value: 'columns', label: m.columns },
          ]}
        />
      </FieldRow>
      <NumberField
        label={m.gap}
        hint={m.gapHint}
        value={message.gap}
        min={0}
        max={24}
        unit="px"
        onChange={set('message', 'gap')}
      />
      <NumberField
        label={m.maxWidth}
        hint={m.maxWidthHint}
        value={message.maxWidth}
        min={0}
        max={800}
        step={10}
        unit="px"
        onChange={set('message', 'maxWidth')}
      />
      <FieldRow label={m.align}>
        <Segmented
          size="sm"
          value={message.align}
          onChange={set('message', 'align')}
          options={[
            { value: 'start', label: m.top },
            { value: 'center', label: m.middle },
            { value: 'end', label: m.bottom },
          ]}
        />
      </FieldRow>
      <SubHeading>{m.box}</SubHeading>
      <BoxEditor value={message.box} onChange={set('message', 'box')} />
    </>
  );
}
