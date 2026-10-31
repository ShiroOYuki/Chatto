import type { MessageArrangement } from '@chatto/core';
import { Segmented } from '../../../components/kit';
import { BoxEditor, FieldRow, NumberField } from '../fields';
import { SubHeading, type PanelProps } from './shared';

export function ListPanel({ draft, set }: PanelProps) {
  const { list } = draft;
  return (
    <>
      <FieldRow label="水平對齊">
        <Segmented
          size="sm"
          value={list.align}
          onChange={set('list', 'align')}
          options={[
            { value: 'stretch', label: '填滿' },
            { value: 'start', label: '靠左' },
            { value: 'end', label: '靠右' },
          ]}
        />
      </FieldRow>
      <NumberField label="訊息間距" value={list.gap} min={0} max={32} unit="px" onChange={set('list', 'gap')} />
      <SubHeading>面板外框（包住所有訊息）</SubHeading>
      <BoxEditor value={list.box} onChange={set('list', 'box')} />
    </>
  );
}

export function MessagePanel({ draft, set }: PanelProps) {
  const { message } = draft;
  return (
    <>
      <FieldRow label="排列方式" hint="單行：名稱與內容同一行；上下：名稱在上；分欄：名稱固定在左欄。">
        <Segmented
          size="sm"
          value={message.arrangement}
          onChange={(value: MessageArrangement) => set('message', 'arrangement')(value)}
          options={[
            { value: 'inline', label: '單行' },
            { value: 'stacked', label: '上下' },
            { value: 'columns', label: '分欄' },
          ]}
        />
      </FieldRow>
      <NumberField
        label="元件間距"
        hint="頭像、名稱、內容之間"
        value={message.gap}
        min={0}
        max={24}
        unit="px"
        onChange={set('message', 'gap')}
      />
      <NumberField
        label="最大寬度"
        hint="0 為不限制"
        value={message.maxWidth}
        min={0}
        max={800}
        step={10}
        unit="px"
        onChange={set('message', 'maxWidth')}
      />
      <FieldRow label="頭像垂直對齊">
        <Segmented
          size="sm"
          value={message.align}
          onChange={set('message', 'align')}
          options={[
            { value: 'start', label: '上' },
            { value: 'center', label: '中' },
            { value: 'end', label: '下' },
          ]}
        />
      </FieldRow>
      <SubHeading>訊息外框</SubHeading>
      <BoxEditor value={message.box} onChange={set('message', 'box')} />
    </>
  );
}
