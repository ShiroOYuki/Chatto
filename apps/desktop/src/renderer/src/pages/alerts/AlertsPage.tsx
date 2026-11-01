import { ALERT_CATEGORIES, EVENT_CATALOG, platformOnlyEvents } from '@chatto/chat-ui';
import { SILENCE_THRESHOLD, type AlertSettings } from '@chatto/core';
import { Info, MessageCircleMore, Move, PartyPopper, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { alerts } from '../../services/alerts';
import { themes } from '../../services/themes';
import { Stagger } from '../../components/motion';
import { Button, Field, Hint, PageHeader, Select, Tile, Toggle } from '../../components/kit';
import { ruleFor, withEvents, withRule, withSilence } from './draft';
import { NumberInput } from './NumberInput';
import { SoundPicker } from './SoundPicker';

function Row({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-ink-faint">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Streamer-only reminders: a nudge when chat speaks up after a quiet spell,
 * and the event alert overlay with per-event rules and sounds.
 */
export function AlertsPage({ state }: { state: AppState }) {
  const settings = state.alerts;
  const { port } = state.server;
  const save = (next: AlertSettings) => alerts.setSettings(next);
  const { enabled: overlayOn, editing } = state.alertsOverlay;

  return (
    <div>
      <PageHeader title="提醒" description="只給自己看的提醒，觀眾和 OBS 畫面都看不到。" />

      <Stagger className="grid grid-cols-2 gap-3">
        <Tile
          title="新留言提醒"
          icon={<MessageCircleMore />}
          action={
            <Toggle
              checked={settings.silence.enabled}
              label="新留言提醒"
              onChange={(enabled) => save(withSilence(settings, { enabled }))}
            />
          }
        >
          <p className="mb-2 text-sm text-ink-soft">聊天室安靜一段時間後，第一則新留言會響一聲並標示出來，不怕漏看。</p>
          <Row title="安靜多久算沉寂" hint={`${SILENCE_THRESHOLD.min}～${SILENCE_THRESHOLD.max} 秒`}>
            <NumberInput
              label="安靜多久算沉寂"
              value={settings.silence.thresholdSeconds}
              min={SILENCE_THRESHOLD.min}
              max={SILENCE_THRESHOLD.max}
              unit="秒"
              onChange={(thresholdSeconds) => save(withSilence(settings, { thresholdSeconds }))}
            />
          </Row>
          <Row title="在桌面 Overlay 標示" hint="外觀在主題編輯器的「新留言提醒」調整。">
            <Toggle
              checked={settings.silence.flash}
              label="在桌面 Overlay 標示"
              onChange={(flash) => save(withSilence(settings, { flash }))}
            />
          </Row>
          <div className="pt-3">
            <Field label="提示音">
              <SoundPicker
                label="新留言提示音"
                port={port}
                value={settings.silence.sound}
                onChange={(sound) => save(withSilence(settings, { sound }))}
              />
            </Field>
          </div>
          <p className="mt-3 flex gap-2 text-xs text-ink-faint">
            <Info className="size-4 shrink-0" />
            機器人、指令（例如 !uptime）和小奇點等事件不算留言。
          </p>
        </Tile>

        <Tile
          title="事件 Overlay"
          icon={<PartyPopper />}
          action={<Toggle checked={overlayOn} label="事件 Overlay" onChange={(v) => alerts.setOverlayEnabled(v)} />}
        >
          <p className="mb-2 text-sm text-ink-soft">
            訂閱、小奇點、揪團等事件會在桌面右上角跳出卡片，一次一張，依序顯示。
          </p>
          <div className="grid grid-cols-2 gap-3 pb-1">
            <Field label="主題">
              <Select
                value={state.selectedThemes.alerts}
                options={state.themes.map((theme) => ({ value: theme.id, label: theme.name }))}
                onChange={(id) => themes.select('alerts', id)}
              />
            </Field>
            <Field label="位置與大小">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={editing ? 'primary' : 'secondary'}
                  disabled={!overlayOn}
                  onClick={() => alerts.setOverlayEditing(!editing)}
                >
                  <Move /> {editing ? '完成調整' : '調整'}
                </Button>
                <Hint label="移回右上角">
                  <Button
                    variant="ghost"
                    disabled={!overlayOn}
                    aria-label="移回右上角"
                    onClick={() => alerts.resetOverlayBounds()}
                  >
                    <RotateCcw />
                  </Button>
                </Hint>
              </div>
            </Field>
          </div>
          {editing ? (
            <p className="mt-2 rounded-xl bg-matcha-soft/40 px-3 py-2 text-xs text-matcha-strong">
              直接拖曳事件 Overlay 移動位置、拖曳邊緣調整大小，完成後按「完成調整」。
            </p>
          ) : null}
          <Row title="每張卡片停留" hint="之後的事件會排隊等候。">
            <NumberInput
              label="每張卡片停留"
              value={settings.events.durationSeconds}
              min={1}
              max={60}
              unit="秒"
              onChange={(durationSeconds) => save(withEvents(settings, { durationSeconds }))}
            />
          </Row>
          <Row title="桌面聊天室不重複顯示" hint="事件 Overlay 開著時，桌面聊天室 Overlay 略過這些事件。OBS 不受影響。">
            <Toggle
              checked={settings.events.hideInChatOverlay}
              label="桌面聊天室不重複顯示"
              onChange={(hideInChatOverlay) => save(withEvents(settings, { hideInChatOverlay }))}
            />
          </Row>
        </Tile>

        <Tile title="要提醒的事件" className="col-span-2">
          <RuleSection title="通用" hint="所有平台共用，例如訂閱不論來自哪個平台都照這裡提醒。">
            {ALERT_CATEGORIES.map((category) => (
              <RuleRow
                key={category.key}
                ruleKey={category.key}
                label={category.label}
                description={category.description}
                amountLabel={'amountLabel' in category ? category.amountLabel : undefined}
                settings={settings}
                port={port}
              />
            ))}
          </RuleSection>
          {EVENT_CATALOG.map((group) => {
            const events = platformOnlyEvents(group);
            return events.length > 0 ? (
              <RuleSection key={group.platform} title={group.label} hint={`${group.label} 才有的事件。`}>
                {events.map((event) => (
                  <RuleRow
                    key={event.key}
                    ruleKey={event.key}
                    label={event.label}
                    description={event.description}
                    amountLabel={event.amount?.label}
                    settings={settings}
                    port={port}
                  />
                ))}
              </RuleSection>
            ) : null;
          })}
        </Tile>
      </Stagger>
    </div>
  );
}

function RuleSection({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mt-2 first:mt-0">
      <h3 className="text-xs font-medium text-ink-soft">{title}</h3>
      <p className="text-xs text-ink-faint">{hint}</p>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

/** One alert rule: on/off, an optional minimum and its sound. */
function RuleRow({
  ruleKey,
  label,
  description,
  amountLabel,
  settings,
  port,
}: {
  ruleKey: string;
  label: string;
  description: string;
  amountLabel?: string;
  settings: AlertSettings;
  port: number;
}) {
  const rule = ruleFor(settings, ruleKey);
  const update = (patch: Parameters<typeof withRule>[2]) => alerts.setSettings(withRule(settings, ruleKey, patch));
  return (
    <div
      data-alert-rule={ruleKey}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.6fr)] items-center gap-6 border-b border-line py-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Toggle checked={rule.enabled} label={`提醒${label}`} onChange={(enabled) => update({ enabled })} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate text-xs text-ink-faint">{description}</div>
        </div>
      </div>
      <div className="w-44">
        {amountLabel ? (
          <span className="flex items-center gap-2 text-xs text-ink-faint">
            至少
            <NumberInput
              label={`${label}的最低${amountLabel}`}
              value={rule.minimum}
              min={0}
              max={1_000_000}
              unit={amountLabel}
              onChange={(minimum) => update({ minimum })}
            />
          </span>
        ) : null}
      </div>
      <SoundPicker label={`${label}的提示音`} port={port} value={rule.sound} onChange={(sound) => update({ sound })} />
    </div>
  );
}
