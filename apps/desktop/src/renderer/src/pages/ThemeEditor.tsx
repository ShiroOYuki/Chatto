import {
  ATTRIBUTE_REFERENCE,
  BLANK_STARTER_CSS,
  CLASS_REFERENCE,
  editEventStyle,
  EVENT_CATALOG,
  EVENT_REFERENCE,
  findEvent,
  linkEvent,
  PLAIN_PRESET,
  PRESET_THEMES,
  resolveEventStyle,
  type SelectorReference,
} from '@chatto/chat-ui';
import type { ChatTheme, EnterAnimation, EventStyle, MessageArrangement, RoleKey, RoleStyle } from '@chatto/core';
import {
  ArrowLeft,
  AtSign,
  Bell,
  Braces,
  Check,
  Crosshair,
  Download,
  Link2,
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
  X,
  Zap,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { api } from '../api';
import { CssEditor, type CursorRequest } from '../components/CssEditor';
import { describeInspected, InspectablePreview, type PreviewMode } from '../components/InspectablePreview';
import { Badge, Button, Hint, Segmented, Tile } from '../components/kit';
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
import { BACKDROPS, type Backdrop } from '../components/ThemePreview';
import { Select } from '../components/kit';
import { appendRule, buildSelector, scopesFor, type InspectedElement, type SelectorScope } from '../lib/cssSelector';
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
];

type BaseSectionId =
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

/** Platform event pages are `event:<platform>:<eventType>`. */
type SectionId = BaseSectionId | `event:${string}`;

/**
 * `selector` is what hovering the menu item outlines in the preview.
 * Sections without one (structure, motion, rules, CSS) have no single target.
 */
const SECTIONS: { id: BaseSectionId; label: string; icon: ReactNode; styledOnly?: boolean; selector?: string }[] = [
  { id: 'base', label: '基底與結構', icon: <Layers /> },
  { id: 'text', label: '文字', icon: <Type />, styledOnly: true, selector: '.chatto-root' },
  { id: 'list', label: '面板', icon: <LayoutList />, styledOnly: true, selector: '.chatto-list' },
  { id: 'message', label: '訊息', icon: <MessageSquare />, styledOnly: true, selector: '.chatto-message' },
  { id: 'author', label: '名稱', icon: <UserRound />, styledOnly: true, selector: '.chatto-message .chatto-header' },
  { id: 'body', label: '內容', icon: <AtSign />, styledOnly: true, selector: '.chatto-message .chatto-body' },
  {
    id: 'parts',
    label: '細節元件',
    icon: <Shapes />,
    styledOnly: true,
    selector:
      '.chatto-avatar, .chatto-badge, .chatto-time, .chatto-emote, .chatto-mention, .chatto-link, .chatto-reply',
  },
  {
    id: 'notice',
    label: '通用事件訊息',
    icon: <Bell />,
    styledOnly: true,
    selector: '.chatto-notice, .chatto-message[data-event]',
  },
  {
    id: 'roles',
    label: '身分樣式',
    icon: <UsersRound />,
    styledOnly: true,
    selector: '.chatto-message[data-roles], .chatto-message[data-highlight~="first-message"]',
  },
  { id: 'motion', label: '動畫', icon: <Sparkles />, styledOnly: true },
  { id: 'behavior', label: '顯示規則', icon: <SlidersHorizontal /> },
  { id: 'css', label: '自訂 CSS', icon: <Braces /> },
];

const REFERENCE_GROUPS: { label: string; items: SelectorReference[] }[] = [
  { label: '元件', items: CLASS_REFERENCE },
  { label: '條件', items: ATTRIBUTE_REFERENCE },
  { label: '平台事件', items: EVENT_REFERENCE },
];

const ROLE_NAMES: Record<string, string> = {
  broadcaster: '實況主',
  moderator: '管理員',
  vip: 'VIP',
  subscriber: '訂閱者',
  founder: '創始訂閱者',
  'first-message': '首次發言',
  highlighted: '點數強調訊息',
};

function scopeLabel(scope: SelectorScope, info: InspectedElement): string {
  switch (scope.kind) {
    case 'all':
      return info.part === 'chatto-root' || info.part === 'chatto-list' ? '整個聊天室' : '全部';
    case 'role':
      return `身分：${ROLE_NAMES[scope.role] ?? scope.role}`;
    case 'highlight':
      return ROLE_NAMES[scope.highlight] ?? scope.highlight;
    case 'user':
      return `使用者：${scope.user}`;
    case 'event':
      return `事件：${findEvent(scope.event)?.label ?? scope.event}`;
    case 'platform':
      return `平台：${scope.platform}`;
    case 'badge':
      return `徽章：${scope.badge}`;
  }
}

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('specimen');
  const [inspect, setInspect] = useState(false);
  const [picked, setPicked] = useState<InspectedElement | null>(null);
  const [pickedScope, setPickedScope] = useState(0);
  /** Selector previewed while hovering a chip or a builder option. */
  const [hoverSelector, setHoverSelector] = useState<string | null>(null);
  /** Selector of the CSS rule the editor cursor is in. */
  const [cursorSelector, setCursorSelector] = useState<string | null>(null);
  const [cursorRequest, setCursorRequest] = useState<CursorRequest | null>(null);
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
    const preset = [PLAIN_PRESET, ...PRESET_THEMES].find((item) => item.id === presetId);
    if (!preset) return;
    // Style parameters only: display rules and custom CSS belong to this theme.
    setDraft((current) => ({
      ...structuredClone(preset),
      id: current.id,
      name: current.name,
      builtIn: false,
      options: current.options,
      customCss: current.customCss,
    }));
  };

  const sections = SECTIONS.filter((item) => !(blank && item.styledOnly));
  const eventGroups = blank ? [] : EVENT_CATALOG;
  const activeEvent = section.startsWith('event:') && !blank ? findEvent(section.slice('event:'.length)) : undefined;
  const active: SectionId = activeEvent ? section : sections.some((item) => item.id === section) ? section : 'base';
  const activeLabel = activeEvent ? activeEvent.label : sections.find((item) => item.id === active)?.label;

  /** Inserts an empty rule into the custom CSS and puts the cursor inside it. */
  const insertRule = (selector: string) => {
    const next = appendRule(draft.customCss, selector);
    set('customCss')(next.css);
    setSection('css');
    setCursorRequest({ position: next.cursor, nonce: Date.now() });
  };

  const pickedScopes = picked ? scopesFor(picked) : [];
  const pickedSelector = picked ? buildSelector(picked, pickedScopes[pickedScope] ?? { kind: 'all' }) : null;
  // Only explicit pointing highlights the preview (hover, inspect pick, CSS cursor);
  // simply opening a section does not, so the styling stays easy to judge.
  const highlight = hoverSelector ?? pickedSelector ?? (active === 'css' ? cursorSelector : null);
  const hoverProps = (selector?: string) =>
    selector
      ? {
          onMouseEnter: () => setHoverSelector(selector),
          onMouseLeave: () => setHoverSelector(null),
        }
      : {};
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

  const panels: Record<BaseSectionId, ReactNode> = {
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
          <FieldRow
            label="載入預設參數"
            hint="套用內建主題的樣式參數再微調；選「空白」會把所有參數歸零。顯示規則與自訂 CSS 不受影響。"
          >
            <Select
              value=""
              placeholder="選擇預設…"
              options={[PLAIN_PRESET, ...PRESET_THEMES.filter((item) => item.base === 'styled')].map((item) => ({
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
        <p className="pb-2 text-xs text-ink-faint">
          所有平台事件（訂閱、揪團、小奇點…）共用的樣式。各事件預設跟隨這裡，個別調整後會改用自己的樣式。
        </p>
        <EventStyleFields
          style={notice}
          fallbackBody={text.color}
          onField={(path, value) => set('notice', ...path)(value)}
        />
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
        <p className="pb-2 text-xs text-ink-faint">
          {blank
            ? '空白基底不會產生任何樣式，畫面完全由這裡的 CSS 決定。'
            : '這裡的 CSS 會套在參數樣式之後，可以覆蓋任何設定。'}
          游標所在規則符合的元素會在預覽中標示出來。
        </p>
        <div className="h-[360px]">
          <CssEditor
            value={draft.customCss}
            onChange={set('customCss')}
            onSelectorChange={setCursorSelector}
            cursorRequest={cursorRequest}
            placeholder={".chatto-message[data-roles~='moderator'] .chatto-author::before {\n  content: '🛡 ';\n}"}
          />
        </div>
        <p className="pt-3 text-xs text-ink-faint">
          滑過可在預覽中標示，點一下插入一條新規則。也可以開啟預覽的「檢查」直接點選元素。
        </p>
        {REFERENCE_GROUPS.map((group) => (
          <div key={group.label} className="pt-2">
            <div className="pb-1 text-[11px] font-medium text-ink-faint">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const selector = item.selector.startsWith('[')
                  ? `.chatto-message${item.selector}, .chatto-notice${item.selector}`
                  : item.selector;
                return (
                  <Hint key={item.selector} label={`${item.label}：${item.description}`} side="top">
                    <button
                      type="button"
                      onMouseEnter={() => setHoverSelector(selector)}
                      onMouseLeave={() => setHoverSelector(null)}
                      onFocus={() => setHoverSelector(selector)}
                      onBlur={() => setHoverSelector(null)}
                      onClick={() =>
                        insertRule(item.selector.startsWith('[') ? `.chatto-message${item.selector}` : item.selector)
                      }
                      className="rounded-md bg-tile-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft transition-colors hover:bg-matcha-soft/50 hover:text-ink"
                    >
                      {item.selector}
                    </button>
                  </Hint>
                );
              })}
            </div>
          </div>
        ))}
      </>
    ),
  };

  const eventPanel = (key: string) => {
    const override = draft.events[key];
    const linked = !override || override.linked;
    const event = findEvent(key)!;
    return (
      <>
        <p className="pb-2 text-xs text-ink-faint">
          {event.description}・
          {event.category === 'message' ? '保留聊天訊息結構，並加上事件標題與外框。' : '系統通知。'}
        </p>
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-tile-muted px-3 py-2">
          <Badge tone={linked ? 'matcha' : 'sakura'}>{linked ? '跟隨通用事件訊息' : '獨立樣式'}</Badge>
          <span className="min-w-0 flex-1 truncate text-xs text-ink-faint">
            {linked ? '修改任一項會改為獨立樣式。' : '通用事件訊息的變更不會影響這裡。'}
          </span>
          <Button size="sm" disabled={linked} onClick={() => setDraft((current) => linkEvent(current, key))}>
            <Link2 /> 與通用事件訊息同步
          </Button>
        </div>
        <EventStyleFields
          style={resolveEventStyle(draft, key)}
          fallbackBody={text.color}
          onField={(path, value) =>
            setDraft((current) => editEventStyle(current, key, (style) => setIn(style, path, value)))
          }
        />
      </>
    );
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
            <NavItem
              key={item.id}
              active={active === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => setSection(item.id)}
              {...hoverProps(item.selector)}
            />
          ))}
          {eventGroups.map((group) => (
            <div key={group.platform} className="mt-3 flex flex-col gap-0.5">
              <div className="px-3 pb-1 text-[11px] font-medium tracking-wide text-ink-faint">
                {group.label} 專屬元件
              </div>
              {group.events.map((event) => {
                const id: SectionId = `event:${event.key}`;
                const own = draft.events[event.key]?.linked === false;
                return (
                  <NavItem
                    key={event.key}
                    active={active === id}
                    icon={<Zap />}
                    label={event.label}
                    trailing={own ? <span className="size-1.5 rounded-full bg-sakura" aria-label="獨立樣式" /> : null}
                    onClick={() => setSection(id)}
                    {...hoverProps(`[data-event="${event.key}"]`)}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        <Tile className="min-h-0 overflow-y-auto">
          <PageTransition id={active}>
            <h2 className="mb-2 text-sm font-semibold">{activeLabel}</h2>
            {activeEvent ? eventPanel(activeEvent.key) : panels[active as BaseSectionId]}
          </PageTransition>
        </Tile>

        <Tile className="min-h-0 p-3!">
          <div className="mb-2 flex items-center gap-2">
            <Segmented
              size="sm"
              value={previewMode}
              onChange={setPreviewMode}
              options={[
                { value: 'specimen', label: '範例' },
                { value: 'live', label: '即時' },
              ]}
            />
            <Hint label="檢查：滑過預覽顯示 class，點一下產生選擇器">
              <button
                type="button"
                aria-pressed={inspect}
                onClick={() => {
                  setInspect((value) => !value);
                  setPicked(null);
                }}
                className={`grid size-8 place-items-center rounded-full transition-colors [&>svg]:size-4 ${
                  inspect ? 'bg-matcha-strong text-on-matcha' : 'text-ink-soft hover:bg-tile-muted'
                }`}
              >
                <Crosshair />
              </button>
            </Hint>
            <div className="ml-auto flex gap-1">
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
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <InspectablePreview
              theme={draft}
              backdrop={backdrop}
              mode={previewMode}
              inspect={inspect && !picked}
              highlight={highlight}
              onPick={(info) => {
                setPicked(info);
                setPickedScope(0);
              }}
            />
            {picked ? (
              <SelectorBuilder
                info={picked}
                scopes={pickedScopes}
                selected={pickedScope}
                onSelect={setPickedScope}
                onHover={(index) =>
                  setHoverSelector(index === null ? null : buildSelector(picked, pickedScopes[index]!))
                }
                onCancel={() => {
                  setPicked(null);
                  setHoverSelector(null);
                }}
                onInsert={() => {
                  if (pickedSelector) insertRule(pickedSelector);
                  setPicked(null);
                  setHoverSelector(null);
                }}
              />
            ) : null}
          </div>
        </Tile>
      </div>
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  trailing,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex h-9 shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors ${
        active ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {active ? (
        <motion.span
          layoutId="editor-section"
          transition={spring}
          className="absolute inset-0 rounded-xl bg-tile shadow-sm"
        />
      ) : null}
      <span className={`relative [&>svg]:size-4 ${active ? 'text-matcha' : 'text-ink-faint'}`}>{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="relative flex">{trailing}</span> : null}
    </button>
  );
}

/** Fields shared by the generic event style and every platform event. */
function EventStyleFields({
  style,
  fallbackBody,
  onField,
}: {
  style: EventStyle;
  fallbackBody: string;
  onField: (path: (keyof EventStyle)[], value: unknown) => void;
}) {
  const field = (key: keyof EventStyle) => (value: unknown) => onField([key], value);
  return (
    <>
      <ColorRow label="標題顏色" value={style.titleColor} onChange={field('titleColor')} />
      <TextRow
        label="標題圖示"
        hint="顯示在標題前，可用 emoji"
        value={style.icon}
        onChange={field('icon')}
        placeholder="例如 ✨"
      />
      <OptionalColorRow
        label="內容顏色"
        value={style.bodyColor || undefined}
        fallback={fallbackBody}
        onChange={(value) => onField(['bodyColor'], value ?? '')}
      />
      <NumberField
        label="左側色條"
        value={style.accentWidth}
        min={0}
        max={12}
        unit="px"
        onChange={field('accentWidth')}
      />
      {style.accentWidth > 0 ? (
        <ColorRow label="色條顏色" value={style.accentColor} onChange={field('accentColor')} />
      ) : null}
      <div className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-faint">事件外框</div>
      <BoxEditor value={style.box} onChange={field('box')} />
    </>
  );
}

/** Popover over the preview: pick how widely a picked part's rule applies. */
function SelectorBuilder({
  info,
  scopes,
  selected,
  onSelect,
  onHover,
  onCancel,
  onInsert,
}: {
  info: InspectedElement;
  scopes: SelectorScope[];
  selected: number;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  onCancel: () => void;
  onInsert: () => void;
}) {
  const { title } = describeInspected(info);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="absolute inset-x-2 bottom-2 z-20 rounded-2xl border border-line bg-tile p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{title}</span>
        <button
          type="button"
          aria-label="關閉"
          onClick={onCancel}
          className="grid size-6 place-items-center rounded-full text-ink-faint hover:bg-tile-muted [&>svg]:size-3.5"
        >
          <X />
        </button>
      </div>
      <div className="text-[11px] text-ink-faint">套用範圍</div>
      <div className="mt-1 flex max-h-44 flex-col gap-0.5 overflow-y-auto" onMouseLeave={() => onHover(null)}>
        {scopes.map((scope, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            onMouseEnter={() => onHover(index)}
            className={`rounded-lg px-2 py-1 text-left transition-colors ${
              index === selected ? 'bg-matcha-soft/50' : 'hover:bg-tile-muted'
            }`}
          >
            <div className="text-xs">{scopeLabel(scope, info)}</div>
            <div className="truncate font-mono text-[10px] text-ink-faint">{buildSelector(info, scope)}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" variant="primary" onClick={onInsert}>
          <Braces /> 插入到自訂 CSS
        </Button>
      </div>
    </motion.div>
  );
}
