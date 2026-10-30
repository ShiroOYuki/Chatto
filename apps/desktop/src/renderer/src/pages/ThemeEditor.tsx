import type { ChatLayoutId, ChatTheme, EnterAnimation } from '@chatto/core';
import { ArrowLeft, Check, Download, RotateCcw, Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { api } from '../api';
import { ColorField } from '../components/ColorField';
import { BACKDROPS, LiveThemePreview, type Backdrop } from '../components/ThemePreview';
import { Button, Field, Segmented, Select, Slider, TextInput, Tile, Toggle } from '../components/ui';
import { exportTheme } from './themeIO';

const FONTS = [
  { value: "'Huninn', 'Noto Sans TC', sans-serif", label: '粉圓（jf open Huninn）' },
  { value: "'Noto Sans TC', 'Inter', system-ui, sans-serif", label: '思源黑體（Noto Sans TC）' },
  { value: "'Noto Serif TC', 'Noto Serif JP', serif", label: '思源宋體（Noto Serif TC）' },
  { value: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace", label: '等寬（JetBrains Mono）' },
  { value: 'system-ui, sans-serif', label: '系統字型' },
];

const LAYOUTS: { value: ChatLayoutId; label: string }[] = [
  { value: 'card', label: '卡片' },
  { value: 'bubble', label: '泡泡' },
  { value: 'inline', label: '單行' },
  { value: 'tag', label: '標籤' },
  { value: 'terminal', label: '終端機' },
];

const ANIMATIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'fade', label: '淡入' },
  { value: 'slide-up', label: '向上滑入' },
  { value: 'slide-left', label: '從左滑入' },
  { value: 'pop', label: '彈出' },
];

const PALETTE_FIELDS: { key: keyof ChatTheme['palette']; label: string }[] = [
  { key: 'surface', label: '訊息底色' },
  { key: 'border', label: '框線' },
  { key: 'text', label: '文字' },
  { key: 'mutedText', label: '次要文字' },
  { key: 'accent', label: '強調色' },
  { key: 'name', label: '名稱顏色' },
  { key: 'nameSurface', label: '名稱底色' },
  { key: 'textStroke', label: '文字描邊' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tile title={title} className="gap-1">
      <div className="flex flex-col gap-4">{children}</div>
    </Tile>
  );
}

const splitList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export function ThemeEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: ChatTheme;
  onClose: () => void;
  onSaved: (theme: ChatTheme) => void;
}) {
  const [draft, setDraft] = useState<ChatTheme>(initial);
  const [saved, setSaved] = useState<ChatTheme>(initial);
  const [backdrop, setBackdrop] = useState<Backdrop>('game');
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (patch: (theme: ChatTheme) => ChatTheme) => setDraft((current) => patch(structuredClone(current)));
  const setPalette = (key: keyof ChatTheme['palette'], value: string) =>
    update((theme) => ({ ...theme, palette: { ...theme.palette, [key]: value } }));
  const setTypography = <K extends keyof ChatTheme['typography']>(key: K, value: ChatTheme['typography'][K]) =>
    update((theme) => ({ ...theme, typography: { ...theme.typography, [key]: value } }));
  const setShape = <K extends keyof ChatTheme['shape']>(key: K, value: ChatTheme['shape'][K]) =>
    update((theme) => ({ ...theme, shape: { ...theme.shape, [key]: value } }));
  const setOption = <K extends keyof ChatTheme['options']>(key: K, value: ChatTheme['options'][K]) =>
    update((theme) => ({ ...theme, options: { ...theme.options, [key]: value } }));

  const save = async () => {
    await api.saveTheme(draft);
    setSaved(draft);
    onSaved(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  };

  const { palette, typography, shape, options } = draft;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft /> 主題
        </Button>
        <input
          value={draft.name}
          onChange={(event) => update((theme) => ({ ...theme, name: event.target.value }))}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none hover:bg-tile-muted focus:bg-tile-muted"
          aria-label="主題名稱"
        />
        {dirty ? <span className="text-xs text-ink-faint">尚未儲存</span> : null}
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(saved)}>
          <RotateCcw /> 復原
        </Button>
        <Button onClick={() => exportTheme(draft)}>
          <Download /> 匯出
        </Button>
        <Button variant="primary" disabled={!dirty && !justSaved} onClick={() => void save()}>
          {justSaved ? <Check /> : <Save />}
          {justSaved ? '已儲存' : '儲存'}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <Section title="風格">
            <Segmented
              value={draft.layout}
              onChange={(layout) => update((theme) => ({ ...theme, layout }))}
              options={LAYOUTS}
            />
            <Field label="進場動畫">
              <Select
                value={options.enterAnimation}
                options={ANIMATIONS}
                onChange={(v) => setOption('enterAnimation', v)}
              />
            </Field>
          </Section>

          <Section title="配色">
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_FIELDS.map((field) => (
                <ColorField
                  key={field.key}
                  label={field.label}
                  value={palette[field.key]}
                  onChange={(value) => setPalette(field.key, value)}
                />
              ))}
            </div>
          </Section>

          <Section title="文字">
            <Field label="字型">
              <Select
                value={FONTS.some((font) => font.value === typography.fontFamily) ? typography.fontFamily : 'custom'}
                options={[...FONTS, { value: 'custom', label: '自訂…' }]}
                onChange={(value) => value !== 'custom' && setTypography('fontFamily', value)}
              />
            </Field>
            <Field label="自訂 font-family" hint="可填入電腦上已安裝的字型名稱。">
              <TextInput
                value={typography.fontFamily}
                onChange={(event) => setTypography('fontFamily', event.target.value)}
              />
            </Field>
            <Field label="字級">
              <Slider
                value={typography.fontSize}
                min={11}
                max={36}
                unit="px"
                onChange={(v) => setTypography('fontSize', v)}
              />
            </Field>
            <Field label="名稱粗細">
              <Slider
                value={typography.nameWeight}
                min={400}
                max={800}
                step={100}
                onChange={(v) => setTypography('nameWeight', v as ChatTheme['typography']['nameWeight'])}
              />
            </Field>
            <Field label="文字描邊" hint="單行版型適合加描邊，讓字在任何畫面上都清楚。">
              <Slider
                value={typography.textStrokeWidth}
                min={0}
                max={8}
                unit="px"
                onChange={(v) => setTypography('textStrokeWidth', v)}
              />
            </Field>
          </Section>

          <Section title="外形">
            <Field label="圓角">
              <Slider value={shape.radius} min={0} max={28} unit="px" onChange={(v) => setShape('radius', v)} />
            </Field>
            <Field label="框線寬度">
              <Slider
                value={shape.borderWidth}
                min={0}
                max={6}
                unit="px"
                onChange={(v) => setShape('borderWidth', v)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="上下內距">
                <Slider
                  value={shape.padding[0]}
                  min={0}
                  max={24}
                  unit="px"
                  onChange={(v) => setShape('padding', [v, shape.padding[1]])}
                />
              </Field>
              <Field label="左右內距">
                <Slider
                  value={shape.padding[1]}
                  min={0}
                  max={32}
                  unit="px"
                  onChange={(v) => setShape('padding', [shape.padding[0], v])}
                />
              </Field>
            </div>
            <Field label="訊息間距">
              <Slider value={shape.gap} min={0} max={24} unit="px" onChange={(v) => setShape('gap', v)} />
            </Field>
          </Section>

          <Section title="顯示與行為">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['showBadges', '顯示徽章'],
                  ['showAvatars', '顯示頭像'],
                  ['showTimestamps', '顯示時間'],
                  ['useUserColors', '使用者名稱顏色'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-tile-muted px-3 py-2 text-sm"
                >
                  {label}
                  <Toggle checked={options[key]} label={label} onChange={(v) => setOption(key, v)} />
                </label>
              ))}
            </div>
            <Field label="新訊息位置">
              <Segmented
                size="sm"
                value={options.direction}
                onChange={(v) => setOption('direction', v)}
                options={[
                  { value: 'bottom-up', label: '最新在下' },
                  { value: 'top-down', label: '最新在上' },
                ]}
              />
            </Field>
            <Field label="訊息停留時間" hint="0 代表一直顯示。">
              <Slider
                value={options.messageLifetime}
                min={0}
                max={120}
                unit="s"
                onChange={(v) => setOption('messageLifetime', v)}
              />
            </Field>
            <Field label="最多顯示則數">
              <Slider value={options.maxMessages} min={5} max={100} onChange={(v) => setOption('maxMessages', v)} />
            </Field>
            <Field label="隱藏的使用者" hint="用逗號或空白分隔，例如機器人帳號。">
              <TextInput
                defaultValue={options.hiddenUsers.join(', ')}
                onBlur={(event) => setOption('hiddenUsers', splitList(event.target.value.toLowerCase()))}
              />
            </Field>
            <Field label="隱藏的指令前綴" hint="以這些字元開頭的訊息不會顯示，例如 !。">
              <TextInput
                defaultValue={options.hiddenPrefixes.join(' ')}
                onBlur={(event) => setOption('hiddenPrefixes', splitList(event.target.value))}
              />
            </Field>
          </Section>

          <Section title="自訂 CSS">
            <textarea
              value={draft.customCss}
              onChange={(event) => update((theme) => ({ ...theme, customCss: event.target.value }))}
              spellCheck={false}
              rows={10}
              placeholder={".chatto-message[data-roles~='moderator'] .chatto-author::before {\n  content: '🛡 ';\n}"}
              className="w-full resize-y rounded-xl border border-line bg-canvas p-3 font-mono text-xs leading-relaxed outline-none focus:border-matcha"
            />
            <p className="text-xs text-ink-faint">
              可用的 class 與 CSS 變數請見 docs/theming.md，例如 .chatto-message、.chatto-author、--chatto-accent。
            </p>
          </Section>
        </div>

        <Tile
          title="即時預覽"
          className="min-h-0 p-3!"
          action={
            <div className="flex gap-1">
              {(Object.keys(BACKDROPS) as Backdrop[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`預覽背景 ${key}`}
                  onClick={() => setBackdrop(key)}
                  className={`size-6 rounded-full border-2 transition ${backdrop === key ? 'border-matcha' : 'border-line'}`}
                  style={{ background: BACKDROPS[key] }}
                />
              ))}
            </div>
          }
        >
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
            <LiveThemePreview theme={draft} backdrop={backdrop} />
          </div>
        </Tile>
      </div>
    </div>
  );
}
