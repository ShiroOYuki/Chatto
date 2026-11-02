import { ALERT_CATEGORIES, EVENT_CATALOG, platformOnlyEvents } from '@chatto/chat-ui';
import { SILENCE_THRESHOLD, type AlertSettings } from '@chatto/core';
import { Info, MessageCircleMore, Move, PartyPopper, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { alerts } from '../../services/alerts';
import { themes } from '../../services/themes';
import { Stagger } from '../../components/motion';
import { Button, Field, Hint, PageHeader, Select, Tile, Toggle } from '../../components/kit';
import { useLocale, useMessages, useThemeName } from '../../i18n';
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
  const m = useMessages().alerts;
  const themeName = useThemeName();
  const locale = useLocale();

  return (
    <div>
      <PageHeader title={m.title} description={m.description} />

      <Stagger className="grid grid-cols-2 gap-3">
        <Tile
          title={m.silence.title}
          icon={<MessageCircleMore />}
          action={
            <Toggle
              checked={settings.silence.enabled}
              label={m.silence.title}
              onChange={(enabled) => save(withSilence(settings, { enabled }))}
            />
          }
        >
          <p className="mb-2 text-sm text-ink-soft">{m.silence.intro}</p>
          <Row
            title={m.silence.threshold}
            hint={m.silence.thresholdRange(SILENCE_THRESHOLD.min, SILENCE_THRESHOLD.max)}
          >
            <NumberInput
              label={m.silence.threshold}
              value={settings.silence.thresholdSeconds}
              min={SILENCE_THRESHOLD.min}
              max={SILENCE_THRESHOLD.max}
              unit={m.seconds}
              onChange={(thresholdSeconds) => save(withSilence(settings, { thresholdSeconds }))}
            />
          </Row>
          <Row title={m.silence.flash} hint={m.silence.flashHint}>
            <Toggle
              checked={settings.silence.flash}
              label={m.silence.flash}
              onChange={(flash) => save(withSilence(settings, { flash }))}
            />
          </Row>
          <div className="pt-3">
            <Field label={m.silence.sound}>
              <SoundPicker
                label={m.silence.soundLabel}
                port={port}
                value={settings.silence.sound}
                onChange={(sound) => save(withSilence(settings, { sound }))}
              />
            </Field>
          </div>
          <p className="mt-3 flex gap-2 text-xs text-ink-faint">
            <Info className="size-4 shrink-0" />
            {m.silence.notMessages}
          </p>
        </Tile>

        <Tile
          title={m.overlay.title}
          icon={<PartyPopper />}
          action={<Toggle checked={overlayOn} label={m.overlay.title} onChange={(v) => alerts.setOverlayEnabled(v)} />}
        >
          <p className="mb-2 text-sm text-ink-soft">{m.overlay.intro}</p>
          <div className="grid grid-cols-2 gap-3 pb-1">
            <Field label={m.overlay.theme}>
              <Select
                value={state.selectedThemes.alerts}
                options={state.themes.map((theme) => ({ value: theme.id, label: themeName(theme) }))}
                onChange={(id) => themes.select('alerts', id)}
              />
            </Field>
            <Field label={m.overlay.bounds}>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={editing ? 'primary' : 'secondary'}
                  disabled={!overlayOn}
                  onClick={() => alerts.setOverlayEditing(!editing)}
                >
                  <Move /> {editing ? m.overlay.doneAdjusting : m.overlay.adjust}
                </Button>
                <Hint label={m.overlay.resetBounds}>
                  <Button
                    variant="ghost"
                    disabled={!overlayOn}
                    aria-label={m.overlay.resetBounds}
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
              {m.overlay.editingHint}
            </p>
          ) : null}
          <Row title={m.overlay.duration} hint={m.overlay.durationHint}>
            <NumberInput
              label={m.overlay.duration}
              value={settings.events.durationSeconds}
              min={1}
              max={60}
              unit={m.seconds}
              onChange={(durationSeconds) => save(withEvents(settings, { durationSeconds }))}
            />
          </Row>
          <Row title={m.overlay.hideInChat} hint={m.overlay.hideInChatHint}>
            <Toggle
              checked={settings.events.hideInChatOverlay}
              label={m.overlay.hideInChat}
              onChange={(hideInChatOverlay) => save(withEvents(settings, { hideInChatOverlay }))}
            />
          </Row>
        </Tile>

        <Tile title={m.rules.title} className="col-span-2">
          <RuleSection title={m.rules.any} hint={m.rules.anyHint}>
            {ALERT_CATEGORIES.map((category) => (
              <RuleRow
                key={category.key}
                ruleKey={category.key}
                label={category.label[locale]}
                description={category.description[locale]}
                amountLabel={'amountLabel' in category ? category.amountLabel[locale] : undefined}
                settings={settings}
                port={port}
              />
            ))}
          </RuleSection>
          {EVENT_CATALOG.map((group) => {
            const events = platformOnlyEvents(group);
            return events.length > 0 ? (
              <RuleSection key={group.platform} title={group.label} hint={m.rules.platformOnly(group.label)}>
                {events.map((event) => (
                  <RuleRow
                    key={event.key}
                    ruleKey={event.key}
                    label={event.label[locale]}
                    description={event.description[locale]}
                    amountLabel={event.amount?.label[locale]}
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
  const m = useMessages().alerts.rules;
  const rule = ruleFor(settings, ruleKey);
  const update = (patch: Parameters<typeof withRule>[2]) => alerts.setSettings(withRule(settings, ruleKey, patch));
  return (
    <div
      data-alert-rule={ruleKey}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.6fr)] items-center gap-6 border-b border-line py-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Toggle checked={rule.enabled} label={m.toggle(label)} onChange={(enabled) => update({ enabled })} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate text-xs text-ink-faint">{description}</div>
        </div>
      </div>
      <div className="w-44">
        {amountLabel ? (
          <span className="flex items-center gap-2 text-xs text-ink-faint">
            {m.atLeast}
            <NumberInput
              label={m.minimum(label, amountLabel)}
              value={rule.minimum}
              min={0}
              max={1_000_000}
              unit={amountLabel}
              onChange={(minimum) => update({ minimum })}
            />
          </span>
        ) : null}
      </div>
      <SoundPicker label={m.sound(label)} port={port} value={rule.sound} onChange={(sound) => update({ sound })} />
    </div>
  );
}
