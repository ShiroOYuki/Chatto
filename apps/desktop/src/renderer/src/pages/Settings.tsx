import {
  Download,
  Info,
  LayoutDashboard,
  Palette,
  PanelsTopLeft,
  RotateCw,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { AppPrefs, AppState, UpdateState } from '../../../shared/ipc';
import { SUPPORT_LINKS } from '../../../shared/support';
import { appPrefs, openExternal } from '../services/app';
import { Stagger } from '../components/motion';
import { ThemeSwitcher } from '../components/kibo-ui/theme-switcher';
import { TeaCup } from '../components/TeaCup';
import { ClientIdForm } from './ClientIdForm';
import { LegalDialog } from './LegalDialog';
import { ReportTile } from './ReportTile';
import { Button, PageHeader, Segmented, Select, SideNavItem, TextInput, Tile, Toggle } from '../components/kit';
import { useLocale, useMessages, type Messages } from '../i18n';
import { updater } from '../services/updater';
import { LOCALE_NAMES, LOCALES, type ChatLocalePref } from '@chatto/core';

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-4 last:border-b-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-ink-faint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Saved when the field loses focus or on Enter, not on every key. */
function EditorCommandField({ value }: { value: string }) {
  const m = useMessages().settings;
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text.trim() !== value) appPrefs.set({ editorCommand: text.trim() });
  };
  return (
    <TextInput
      aria-label={m.editorCommandLabel}
      value={text}
      placeholder='code "{folder}" "{file}"'
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
      className="w-72 font-mono text-xs md:text-xs"
    />
  );
}

/** What the update row says, and the one action it offers. */
function updateRow(update: UpdateState, m: Messages['settings']): { text: string; action: ReactNode } {
  const check = (
    <Button size="sm" onClick={() => updater.check()}>
      {m.checkForUpdate}
    </Button>
  );
  const version = update.version ?? '';
  switch (update.status) {
    case 'unsupported':
      return { text: m.updateUnsupported, action: null };
    case 'idle':
      return { text: m.updateIdle, action: check };
    case 'checking':
      return {
        text: m.updateChecking,
        action: (
          <Button size="sm" disabled>
            {m.checkForUpdate}
          </Button>
        ),
      };
    case 'not-available':
      return { text: m.updateLatest, action: check };
    case 'available':
      return {
        text: m.updateAvailable(version),
        action: (
          <Button size="sm" variant="primary" onClick={() => updater.download()}>
            <Download /> {m.downloadUpdate}
          </Button>
        ),
      };
    case 'downloading':
      return {
        text: m.updateDownloading(version, update.percent ?? 0),
        action: (
          <div
            role="progressbar"
            aria-label={m.downloadUpdate}
            aria-valuenow={update.percent ?? 0}
            className="h-1.5 w-32 overflow-hidden rounded-full bg-tile-muted"
          >
            <div className="h-full bg-matcha transition-[width]" style={{ width: `${update.percent ?? 0}%` }} />
          </div>
        ),
      };
    case 'downloaded':
      return {
        text: m.updateDownloaded(version),
        action: (
          <Button size="sm" variant="primary" onClick={() => updater.install()}>
            <RotateCw /> {m.restartToUpdate}
          </Button>
        ),
      };
    case 'error':
      return { text: m.updateError[update.error ?? 'unknown'], action: check };
    default: {
      const unhandled: never = update.status;
      return unhandled;
    }
  }
}

function UpdateRow({ update }: { update: UpdateState }) {
  const m = useMessages().settings;
  const { text, action } = updateRow(update, m);
  return (
    <div className="mt-4 flex items-center justify-between gap-6 border-t border-line pt-4">
      <div>
        <div className="text-sm font-medium">{m.update}</div>
        <div className="mt-0.5 text-xs text-ink-faint" role="status">
          {text}
        </div>
      </div>
      {action}
    </div>
  );
}

type SettingsSection = 'general' | 'appearance' | 'advanced' | 'about';

const SECTION_ICONS: Record<SettingsSection, ReactNode> = {
  general: <SlidersHorizontal />,
  appearance: <Palette />,
  advanced: <Wrench />,
  about: <Info />,
};

const SECTIONS = Object.keys(SECTION_ICONS) as SettingsSection[];

function GeneralSection({ prefs }: { prefs: AppPrefs }) {
  const m = useMessages().settings;
  const languages = LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }));
  return (
    <>
      <Tile title={m.language}>
        <Row title={m.interfaceLanguage} hint={m.interfaceLanguageHint}>
          <Select
            aria-label={m.interfaceLanguage}
            className="w-48"
            value={prefs.locale}
            options={languages}
            onChange={(locale) => appPrefs.set({ locale })}
          />
        </Row>
        <Row title={m.chatLanguage} hint={m.chatLanguageHint}>
          <Select<ChatLocalePref>
            aria-label={m.chatLanguage}
            className="w-60"
            value={prefs.chatLocale}
            options={[{ value: 'auto', label: m.followInterface(LOCALE_NAMES[prefs.locale]) }, ...languages]}
            onChange={(chatLocale) => appPrefs.set({ chatLocale })}
          />
        </Row>
      </Tile>

      <Tile title={m.windowAndStartup}>
        <Row title={m.closeToTray} hint={m.closeToTrayHint}>
          <Toggle
            checked={prefs.closeToTray}
            label={m.closeToTray}
            onChange={(closeToTray) => appPrefs.set({ closeToTray })}
          />
        </Row>
        <Row title={m.launchAtLogin} hint={m.launchAtLoginHint}>
          <Toggle
            checked={prefs.launchAtLogin}
            label={m.launchAtLogin}
            onChange={(launchAtLogin) => appPrefs.set({ launchAtLogin })}
          />
        </Row>
      </Tile>
    </>
  );
}

function AppearanceSection({ prefs }: { prefs: AppPrefs }) {
  const m = useMessages().settings;
  return (
    <Tile title={m.appearance}>
      <Row title={m.colorScheme} hint={m.colorSchemeHint}>
        <ThemeSwitcher
          value={prefs.appearance}
          onChange={(appearance) => appPrefs.set({ appearance })}
          className="h-9 bg-tile-muted p-1.5 ring-0 [&_button]:size-6"
        />
      </Row>
      <Row title={m.uiMode} hint={m.uiModeHint}>
        <Segmented
          size="sm"
          value={prefs.uiMode}
          onChange={(uiMode) => appPrefs.set({ uiMode })}
          options={[
            {
              value: 'full',
              label: (
                <>
                  <PanelsTopLeft /> {m.uiModeFull}
                </>
              ),
            },
            {
              value: 'compact',
              label: (
                <>
                  <LayoutDashboard /> {m.uiModeCompact}
                </>
              ),
            },
          ]}
        />
      </Row>
    </Tile>
  );
}

function AdvancedSection({ state }: { state: AppState }) {
  const { settings: m, connections } = useMessages();
  return (
    <>
      <Tile title="Twitch">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Client ID</h3>
          <p className="mt-0.5 text-xs text-ink-faint">{connections.clientIdSource[state.clientId.source]}</p>
        </div>
        <ClientIdForm clientId={state.clientId} />
      </Tile>

      <Tile title={m.customCss}>
        <Row title={m.externalEditor} hint={m.externalEditorHint}>
          <EditorCommandField value={state.prefs.editorCommand} />
        </Row>
      </Tile>

      <Tile title={m.localServer}>
        <Row title={m.port} hint={m.portHint}>
          <code className="rounded-lg bg-tile-muted px-3 py-1 font-mono text-sm">{state.server.port}</code>
        </Row>
      </Tile>
    </>
  );
}

function AboutSection({ state }: { state: AppState }) {
  const m = useMessages().settings;
  const locale = useLocale();
  const [legalOpen, setLegalOpen] = useState(false);
  return (
    <Tile title={m.about}>
      <div className="flex items-center gap-4">
        <TeaCup mood="happy" size={64} />
        <div className="flex-1">
          <div className="font-semibold">Chatto チャット</div>
          <div className="text-xs text-ink-faint">v{state.appInfo.version} · GPL-3.0-or-later · © 2026 Ciel</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setLegalOpen(true)}>
          {m.license}
        </Button>
        <LegalDialog open={legalOpen} onOpenChange={setLegalOpen} />
      </div>
      <UpdateRow update={state.update} />
      <div className="mt-4 flex items-center justify-between gap-6 border-t border-line pt-4">
        <div>
          <div className="text-sm font-medium">{m.support}</div>
          <div className="mt-0.5 text-xs text-ink-faint">{m.supportHint}</div>
        </div>
        <div className="flex gap-2">
          {SUPPORT_LINKS.map((link) => (
            <Button key={link.id} size="sm" onClick={() => openExternal(link.url)} title={link.hint[locale]}>
              {link.label[locale]}
            </Button>
          ))}
        </div>
      </div>
    </Tile>
  );
}

/** Settings, split into sections picked from a left menu. */
export function SettingsPage({ state }: { state: AppState }) {
  const m = useMessages().settings;
  const [section, setSection] = useState<SettingsSection>('general');
  return (
    <div className="max-w-5xl">
      <PageHeader title={m.title} />
      <div className="grid grid-cols-[176px_minmax(0,1fr)] items-start gap-6">
        <nav aria-label={m.title} className="sticky top-0 flex flex-col gap-0.5">
          {SECTIONS.map((id) => (
            <SideNavItem
              key={id}
              group="settings-section"
              active={section === id}
              icon={SECTION_ICONS[id]}
              label={m.sections[id]}
              onClick={() => setSection(id)}
            />
          ))}
        </nav>
        {/* Keyed so each section plays its entrance on its own. */}
        <Stagger key={section} className="flex min-w-0 flex-col gap-3">
          {section === 'general' ? <GeneralSection prefs={state.prefs} /> : null}
          {section === 'appearance' ? <AppearanceSection prefs={state.prefs} /> : null}
          {section === 'advanced' ? <AdvancedSection state={state} /> : null}
          {section === 'about' ? <AboutSection state={state} /> : null}
          {section === 'about' ? <ReportTile version={state.appInfo.version} /> : null}
        </Stagger>
      </div>
    </div>
  );
}
