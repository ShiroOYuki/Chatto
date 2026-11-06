import { ALERT_CATEGORIES, EVENT_CATALOG, platformOnlyEvents } from '@chatto/chat-ui';
import { SILENCE_THRESHOLD, type AlertSettings } from '@chatto/core';
import { ArrowRight, Info, MessageCircleMore, PartyPopper } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppState } from '../../../../shared/ipc';
import { alerts } from '../../services/alerts';
import type { PageId } from '../../components/Sidebar';
import { Stagger } from '../../components/motion';
import { Button, Field, PageHeader, Tile, Toggle } from '../../components/kit';
import { useLocale, useMessages } from '../../i18n';
import { redemptionAccess } from '../../services/twitch';
import { ruleFor, withEvents, withRedemptions, withRule, withSilence } from './draft';
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
 * and the event alert overlay with per-event rules and sounds. The overlay's
 * switch, theme and position live on the Outputs page with the other outputs.
 */
export function AlertsPage({ state, onNavigate }: { state: AppState; onNavigate: (page: PageId) => void }) {
  const settings = state.alerts;
  const { port } = state.server;
  const save = (next: AlertSettings) => alerts.setSettings(next);
  const overlayOn = state.alertsOverlay.enabled;
  const m = useMessages().alerts;
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
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('outputs')}>
              {m.overlay.outputSettings} <ArrowRight />
            </Button>
          }
        >
          <p className="mb-2 text-sm text-ink-soft">{m.overlay.intro}</p>
          {overlayOn ? null : (
            <p className="mb-1 flex gap-2 text-xs text-ink-faint">
              <Info className="size-4 shrink-0" />
              {m.overlay.off}
            </p>
          )}
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
                  >
                    {event.redemption ? <RedemptionOptions state={state} /> : null}
                  </RuleRow>
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

/** Redemptions' own options under their rule: OBS can leave them out, and a note when none can arrive. */
function RedemptionOptions({ state }: { state: AppState }) {
  const m = useMessages().redemptions;
  const settings = state.alerts;
  const access = redemptionAccess(state);
  const note = access === 'not-broadcaster' ? m.notBroadcaster : access === 'reauth' ? m.reauth : null;
  return (
    <div className="col-span-3 flex items-start gap-3 pl-14 max-[1180px]:col-span-2">
      <Toggle
        checked={settings.redemptions.showInObs}
        label={m.showInObs}
        onChange={(showInObs) => alerts.setSettings(withRedemptions(settings, { showInObs }))}
      />
      <div className="min-w-0">
        <div className="text-sm">{m.showInObs}</div>
        <div className="text-xs text-ink-faint">{m.showInObsHint}</div>
        {note ? (
          <p data-testid="redemption-note" className="mt-1 flex gap-2 text-xs text-ink-soft">
            <Info className="size-4 shrink-0 text-matcha" />
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** One alert rule: on/off, an optional minimum and its sound; `children` adds the event's own options below. */
function RuleRow({
  ruleKey,
  label,
  description,
  amountLabel,
  settings,
  port,
  children,
}: {
  ruleKey: string;
  label: string;
  description: string;
  amountLabel?: string;
  settings: AlertSettings;
  port: number;
  children?: ReactNode;
}) {
  const m = useMessages().alerts.rules;
  const rule = ruleFor(settings, ruleKey);
  const update = (patch: Parameters<typeof withRule>[2]) => alerts.setSettings(withRule(settings, ruleKey, patch));
  return (
    <div
      data-alert-rule={ruleKey}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.6fr)] items-center gap-6 border-b border-line py-3 last:border-b-0 max-[1180px]:grid-cols-[minmax(0,1fr)_auto] max-[1180px]:gap-x-4 max-[1180px]:gap-y-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Toggle checked={rule.enabled} label={m.toggle(label)} onChange={(enabled) => update({ enabled })} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium max-[1180px]:whitespace-normal">{label}</div>
          <div className="truncate text-xs text-ink-faint max-[1180px]:whitespace-normal">{description}</div>
        </div>
      </div>
      <div className="w-44 max-[1180px]:w-auto">
        {amountLabel ? (
          <span className="flex items-center gap-2 text-xs whitespace-nowrap text-ink-faint">
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
      {/* Narrow windows: the sound controls get their own line under the event's name. */}
      <div className="min-w-0 max-[1180px]:col-span-2 max-[1180px]:pl-14">
        <SoundPicker label={m.sound(label)} port={port} value={rule.sound} onChange={(sound) => update({ sound })} />
      </div>
      {children}
    </div>
  );
}
