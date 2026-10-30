import { BLANK_STARTER_CSS, PRESET_THEMES } from '@chatto/chat-ui';
import type { ChatTheme, EnterAnimation, MessageArrangement, RoleKey, RoleStyle } from '@chatto/core';
import {
  ArrowLeft,
  AtSign,
  Bell,
  Braces,
  Check,
  Download,
  Layers,
  LayoutList,
  MessageSquare,
  RotateCcw,
  Save,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Type,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { api } from '../api';
import { Button, Segmented, Tile } from '../components/kit';
import { motion, PageTransition, spring } from '../components/motion';
import {
  BoxEditor,
  ColorRow,
  FieldRow,
  NumberField,
  OptionalColorRow,
  SelectRow,
  ShadowEditor,
  TextRow,
  ToggleRow,
} from '../components/themeFields';
import { BACKDROPS, LiveThemePreview, type Backdrop } from '../components/ThemePreview';
import { Select } from '../components/kit';
import { exportTheme } from './themeIO';

const FONTS = [
  { value: "'Huninn', 'Noto Sans TC', 'Inter', system-ui, sans-serif", label: '粉圓（jf open Huninn）' },
  { value: "'Noto Sans TC', 'Inter', system-ui, sans-serif", label: '思源黑體（Noto Sans TC）' },
  { value: "'Noto Serif TC', 'Noto Serif JP', serif", label: '思源宋體（Noto Serif TC）' },
  { value: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace", label: '等寬（JetBrains Mono）' },
  { value: 'system-ui, sans-serif', label: '系統字型' },
];

const ANIMATIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: '無' },
  { value: 'fade', label: '淡入' },
  { value: 'slide-up', label: '向上滑入' },
  { value: 'slide-left', label: '從左滑入' },
  { value: 'slide-right', label: '從右滑入' },
  { value: 'pop', label: '彈出' },
];

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map((weight) => ({ value: String(weight), label: String(weight) }));

const ROLE_LABELS: { key: RoleKey; label: string }[] = [
  { key: 'broadcaster', label: '實況主' },
  { key: 'moderator', label: '管理員' },
  { key: 'vip', label: 'VIP' },
  { key: 'subscriber', label: '訂閱者' },
  { key: 'first-message', label: '首次發言' },
  { key: 'highlighted', label: '點數強調訊息' },
];

type SectionId =
  | 'base'
  | 'text'
  | 'list'
  | 'message'
  | 'author'
  | 'body'
  | 'parts'
  | 'notice'
  | 'roles'
  | 'motion'
  | 'behavior'
  | 'css';

const SECTIONS: { id: SectionId; label: string; icon: ReactNode; styledOnly?: boolean }[] = [
  { id: 'base', label: '基底與結構', icon: <Layers /> },
  { id: 'text', label: '文字', icon: <Type />, styledOnly: true },
  { id: 'list', label: '面板', icon: <LayoutList />, styledOnly: true },
  { id: 'message', label: '訊息', icon: <MessageSquare />, styledOnly: true },
  { id: 'author', label: '名稱', icon: <UserRound />, styledOnly: true },
  { id: 'body', label: '內容', icon: <AtSign />, styledOnly: true },
  { id: 'parts', label: '細節元件', icon: <Shapes />, styledOnly: true },
  { id: 'notice', label: '通知', icon: <Bell />, styledOnly: true },
  { id: 'roles', label: '身分樣式', icon: <UsersRound />, styledOnly: true },
  { id: 'motion', label: '動畫', icon: <Sparkles />, styledOnly: true },
  { id: 'behavior', label: '顯示規則', icon: <SlidersHorizontal /> },
  { id: 'css', label: '自訂 CSS', icon: <Braces /> },
];

const CLASS_REFERENCE = [
  '.chatto-root',
  '.chatto-list',
  '.chatto-message',
  '.chatto-avatar',
  '.chatto-content',
  '.chatto-reply',
  '.chatto-header',
  '.chatto-time',
  '.chatto-badges',
  '.chatto-badge',
  '.chatto-author',
  '.chatto-separator',
  '.chatto-body',
  '.chatto-emote',
  '.chatto-mention',
  '.chatto-link',
  '.chatto-cheer',
  '.chatto-notice',
  '.chatto-notice-system',
  '[data-roles~="moderator"]',
  '[data-highlight~="first-message"]',
  '[data-platform="twitch"]',
];

const splitList = (text: string) =>
  text
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

/** Immutable update of a nested field by path. */
function setIn<T>(target: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const source = target as Record<string | number, unknown>;
  const copy = (Array.isArray(target) ? [...target] : { ...source }) as Record<string | number, unknown>;
  copy[head!] = setIn(source[head!], rest, value);
  return copy as T;
}

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
  const [section, setSection] = useState<SectionId>('base');
  const [backdrop, setBackdrop] = useState<Backdrop>('game');
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const blank = draft.base === 'blank';

  /** Typed setter: `set('author', 'box', 'padding')(value)`. */
  const set =
    (...path: (string | number)[]) =>
    (value: unknown) =>
      setDraft((current) => setIn(current, path, value));

  const save = async () => {
    await api.saveTheme(draft);
    setSaved(draft);
    onSaved(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  };

  /** Copies every parameter from a preset, keeping this theme's id and name. */
  const loadPreset = (presetId: string) => {
    const preset = PRESET_THEMES.find((item) => item.id === presetId);
    if (preset) setDraft({ ...structuredClone(preset), id: draft.id, name: draft.name, builtIn: false });
  };

  const sections = SECTIONS.filter((item) => !(blank && item.styledOnly));
  const active = sections.some((item) => item.id === section) ? section : 'base';
  const role = (key: RoleKey): RoleStyle => draft.roles[key] ?? {};
  const setRole = (key: RoleKey, patch: Partial<RoleStyle>) => {
    const next = { ...role(key), ...patch };
    for (const field of Object.keys(next) as (keyof RoleStyle)[]) if (next[field] === undefined) delete next[field];
    set('roles', key)(Object.keys(next).length ? next : undefined);
  };

  const {
    font,
    text,
    list,
    message,
    author,
    body,
    avatar,
    badges,
    timestamp,
    emote,
    mention,
    reply,
    notice,
    animation,
    options,
  } = draft;

  const panels: Record<SectionId, ReactNode> = {
    base: (
      <>
        <FieldRow label="基底" hint="空白不產生任何樣式，只保留結構與自訂 CSS。">
          <Segmented
            size="sm"
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
              { value: 'styled', label: '參數樣式' },
              { value: 'blank', label: '空白（Blank）' },
            ]}
          />
        </FieldRow>
        {!blank ? (
          <FieldRow label="載入預設參數" hint="把任一內建主題的參數套進來，再自行微調。">
            <Select
              value=""
              placeholder="選擇預設…"
              options={PRESET_THEMES.filter((item) => item.base === 'styled').map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={loadPreset}
            />
          </FieldRow>
        ) : null}
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">要輸出的結構</div>
        <ToggleRow label="頭像" value={avatar.show} onChange={set('avatar', 'show')} />
        <ToggleRow label="徽章" value={badges.show} onChange={set('badges', 'show')} />
        <ToggleRow label="時間" value={timestamp.show} onChange={set('timestamp', 'show')} />
        {timestamp.show ? (
          <ToggleRow label="12 小時制" value={timestamp.hour12} onChange={set('timestamp', 'hour12')} />
        ) : null}
        <ToggleRow
          label="使用者名稱顏色"
          hint="使用平台上的名稱顏色"
          value={author.useUserColor}
          onChange={set('author', 'useUserColor')}
        />
        <FieldRow label="新訊息位置">
          <Segmented
            size="sm"
            value={list.direction}
            onChange={set('list', 'direction')}
            options={[
              { value: 'bottom-up', label: '最新在下' },
              { value: 'top-down', label: '最新在上' },
            ]}
          />
        </FieldRow>
      </>
    ),
    text: (
      <>
        <SelectRow
          label="字型"
          value={FONTS.some((item) => item.value === font.family) ? font.family : 'custom'}
          options={[...FONTS, { value: 'custom', label: '自訂…' }]}
          onChange={(value) => value !== 'custom' && set('font', 'family')(value)}
        />
        <TextRow
          label="font-family"
          hint="可填入已安裝的字型"
          value={font.family}
          onChange={set('font', 'family')}
          mono
        />
        <NumberField label="字級" value={font.size} min={10} max={48} unit="px" onChange={set('font', 'size')} />
        <NumberField
          label="行高"
          value={font.lineHeight}
          min={1}
          max={2.4}
          step={0.05}
          onChange={set('font', 'lineHeight')}
        />
        <NumberField
          label="字距"
          value={font.letterSpacing}
          min={-0.1}
          max={0.3}
          step={0.01}
          unit="em"
          onChange={set('font', 'letterSpacing')}
        />
        <SelectRow
          label="字重"
          value={String(font.weight)}
          options={WEIGHTS}
          onChange={(value) => set('font', 'weight')(Number(value))}
        />
        <ColorRow label="文字顏色" value={text.color} onChange={set('text', 'color')} />
        <ColorRow label="次要文字" value={text.mutedColor} onChange={set('text', 'mutedColor')} />
        <ColorRow label="強調色" value={text.accentColor} onChange={set('text', 'accentColor')} />
        <NumberField
          label="文字描邊"
          value={text.strokeWidth}
          min={0}
          max={10}
          step={0.5}
          unit="px"
          onChange={set('text', 'strokeWidth')}
        />
        {text.strokeWidth > 0 ? (
          <ColorRow label="描邊顏色" value={text.strokeColor} onChange={set('text', 'strokeColor')} />
        ) : null}
        <ShadowEditor label="文字陰影" value={text.shadow} onChange={set('text', 'shadow')} text />
      </>
    ),
    list: (
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
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">
          面板外框（包住所有訊息）
        </div>
        <BoxEditor value={list.box} onChange={set('list', 'box')} />
      </>
    ),
    message: (
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
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">訊息外框</div>
        <BoxEditor value={message.box} onChange={set('message', 'box')} />
      </>
    ),
    author: (
      <>
        <ColorRow label="名稱顏色" value={author.color} onChange={set('author', 'color')} />
        <SelectRow
          label="字重"
          value={String(author.weight)}
          options={WEIGHTS}
          onChange={(value) => set('author', 'weight')(Number(value))}
        />
        <NumberField
          label="大小"
          value={author.size}
          min={0.5}
          max={2}
          step={0.05}
          unit="em"
          onChange={set('author', 'size')}
        />
        <SelectRow
          label="大小寫"
          value={author.transform}
          options={[
            { value: 'none', label: '原樣' },
            { value: 'uppercase', label: '全部大寫' },
            { value: 'lowercase', label: '全部小寫' },
            { value: 'capitalize', label: '字首大寫' },
          ]}
          onChange={set('author', 'transform')}
        />
        <TextRow label="前綴" value={author.prefix} onChange={set('author', 'prefix')} placeholder="例如 @" />
        <TextRow label="後綴" value={author.suffix} onChange={set('author', 'suffix')} />
        <TextRow
          label="分隔符號"
          hint="名稱與內容之間"
          value={author.separator}
          onChange={set('author', 'separator')}
          placeholder="例如 :"
        />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">
          名稱框（時間、徽章、名稱的外框）
        </div>
        <BoxEditor value={author.box} onChange={set('author', 'box')} />
      </>
    ),
    body: (
      <>
        <OptionalColorRow
          label="內容顏色"
          value={body.color || undefined}
          fallback={text.color}
          onChange={(value) => set('body', 'color')(value ?? '')}
        />
        <NumberField
          label="大小"
          value={body.size}
          min={0.5}
          max={2}
          step={0.05}
          unit="em"
          onChange={set('body', 'size')}
        />
        <SelectRow
          label="字重"
          value={String(body.weight)}
          options={WEIGHTS}
          onChange={(value) => set('body', 'weight')(Number(value))}
        />
        <ToggleRow label="斜體" value={body.italic} onChange={set('body', 'italic')} />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">內容框（例如對話泡泡）</div>
        <BoxEditor value={body.box} onChange={set('body', 'box')} />
      </>
    ),
    parts: (
      <>
        <div className="text-xs font-medium text-ink-faint">頭像</div>
        <NumberField label="尺寸" value={avatar.size} min={12} max={64} unit="px" onChange={set('avatar', 'size')} />
        <NumberField
          label="圓角"
          hint="50% 為圓形"
          value={avatar.radius}
          min={0}
          max={50}
          unit="%"
          onChange={set('avatar', 'radius')}
        />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">徽章</div>
        <NumberField
          label="尺寸"
          value={badges.size}
          min={0.6}
          max={2}
          step={0.05}
          unit="em"
          onChange={set('badges', 'size')}
        />
        <NumberField label="間距" value={badges.gap} min={0} max={12} unit="px" onChange={set('badges', 'gap')} />
        <NumberField label="圓角" value={badges.radius} min={0} max={12} unit="px" onChange={set('badges', 'radius')} />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">時間</div>
        <ColorRow label="顏色" value={timestamp.color} onChange={set('timestamp', 'color')} />
        <NumberField
          label="大小"
          value={timestamp.size}
          min={0.5}
          max={1.5}
          step={0.05}
          unit="em"
          onChange={set('timestamp', 'size')}
        />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">表情符號</div>
        <NumberField
          label="大小"
          value={emote.size}
          min={1}
          max={4}
          step={0.05}
          unit="em"
          onChange={set('emote', 'size')}
        />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">提及與連結</div>
        <ColorRow label="顏色" value={mention.color} onChange={set('mention', 'color')} />
        <ColorRow label="底色" value={mention.background} onChange={set('mention', 'background')} />
        <SelectRow
          label="字重"
          value={String(mention.weight)}
          options={WEIGHTS}
          onChange={(value) => set('mention', 'weight')(Number(value))}
        />
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">回覆引用</div>
        <ToggleRow label="顯示回覆" value={reply.show} onChange={set('reply', 'show')} />
        <ColorRow label="顏色" value={reply.color} onChange={set('reply', 'color')} />
      </>
    ),
    notice: (
      <>
        <ColorRow label="標題顏色" value={notice.titleColor} onChange={set('notice', 'titleColor')} />
        <NumberField
          label="左側色條"
          value={notice.accentWidth}
          min={0}
          max={12}
          unit="px"
          onChange={set('notice', 'accentWidth')}
        />
        {notice.accentWidth > 0 ? (
          <ColorRow label="色條顏色" value={notice.accentColor} onChange={set('notice', 'accentColor')} />
        ) : null}
        <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">通知外框</div>
        <BoxEditor value={notice.box} onChange={set('notice', 'box')} />
      </>
    ),
    roles: (
      <>
        <p className="pb-2 text-xs text-ink-faint">只會覆蓋開啟的項目；同時符合多個身分時，下方的設定優先。</p>
        {ROLE_LABELS.map(({ key, label }) => (
          <div key={key} className="border-t border-line py-2 first:border-t-0">
            <div className="text-sm font-medium">{label}</div>
            <OptionalColorRow
              label="名稱顏色"
              value={role(key).nameColor}
              onChange={(nameColor) => setRole(key, { nameColor })}
            />
            <OptionalColorRow
              label="名稱框底色"
              value={role(key).nameBackground}
              onChange={(nameBackground) => setRole(key, { nameBackground })}
            />
            <OptionalColorRow
              label="訊息底色"
              value={role(key).surfaceBackground}
              onChange={(surfaceBackground) => setRole(key, { surfaceBackground })}
            />
            <OptionalColorRow
              label="框線顏色"
              value={role(key).borderColor}
              onChange={(borderColor) => setRole(key, { borderColor })}
            />
          </div>
        ))}
      </>
    ),
    motion: (
      <>
        <SelectRow label="進場動畫" value={animation.enter} options={ANIMATIONS} onChange={set('animation', 'enter')} />
        <NumberField
          label="動畫時間"
          value={animation.duration}
          min={0}
          max={1500}
          step={10}
          unit="ms"
          onChange={set('animation', 'duration')}
        />
      </>
    ),
    behavior: (
      <>
        <NumberField
          label="停留時間"
          hint="0 代表一直顯示"
          value={options.messageLifetime}
          min={0}
          max={300}
          unit="s"
          onChange={set('options', 'messageLifetime')}
        />
        <NumberField
          label="最多則數"
          value={options.maxMessages}
          min={1}
          max={200}
          onChange={set('options', 'maxMessages')}
        />
        <TextRow
          label="隱藏的使用者"
          hint="逗號或空白分隔"
          value={options.hiddenUsers.join(', ')}
          onChange={(value) => set('options', 'hiddenUsers')(splitList(value.toLowerCase()))}
        />
        <TextRow
          label="隱藏的指令前綴"
          hint="例如 !"
          value={options.hiddenPrefixes.join(' ')}
          onChange={(value) => set('options', 'hiddenPrefixes')(splitList(value))}
        />
      </>
    ),
    css: (
      <>
        <textarea
          value={draft.customCss}
          onChange={(event) => set('customCss')(event.target.value)}
          spellCheck={false}
          rows={18}
          placeholder={".chatto-message[data-roles~='moderator'] .chatto-author::before {\n  content: '🛡 ';\n}"}
          className="w-full resize-y rounded-xl border border-line bg-canvas p-3 font-mono text-xs leading-relaxed outline-none focus:border-matcha"
        />
        <p className="pt-2 text-xs text-ink-faint">
          {blank
            ? '空白基底不會產生任何樣式，畫面完全由這裡的 CSS 決定。'
            : '這裡的 CSS 會套在參數樣式之後，可以覆蓋任何設定。'}
          點下面的 class 可以插入到最後。
        </p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {CLASS_REFERENCE.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => set('customCss')(`${draft.customCss.trimEnd()}\n\n${name} {\n  \n}\n`)}
              className="rounded-md bg-tile-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft transition-colors hover:bg-matcha-soft/50 hover:text-ink"
            >
              {name}
            </button>
          ))}
        </div>
      </>
    ),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft /> 主題
        </Button>
        <input
          value={draft.name}
          onChange={(event) => set('name')(event.target.value)}
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

      <div className="grid min-h-0 flex-1 grid-cols-[168px_minmax(0,1fr)_minmax(300px,380px)] gap-3">
        <nav className="flex flex-col gap-0.5 overflow-y-auto">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
                active === item.id ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {active === item.id ? (
                <motion.span
                  layoutId="editor-section"
                  transition={spring}
                  className="absolute inset-0 rounded-xl bg-tile shadow-sm"
                />
              ) : null}
              <span className={`relative [&>svg]:size-4 ${active === item.id ? 'text-matcha' : 'text-ink-faint'}`}>
                {item.icon}
              </span>
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </nav>

        <Tile className="min-h-0 overflow-y-auto">
          <PageTransition id={active}>
            <h2 className="mb-2 text-sm font-semibold">{sections.find((item) => item.id === active)?.label}</h2>
            {panels[active]}
          </PageTransition>
        </Tile>

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
