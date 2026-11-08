import { useEffect, useRef, useState } from 'react';
import type { AppState } from '../../shared/ipc';
import { Sidebar, type PageId } from './components/Sidebar';
import { appPrefs } from './services/app';
import { PageTransition } from './components/motion';
import { TeaCup } from './components/TeaCup';
import { TitleBar } from './components/TitleBar';
import { Confetti, type ConfettiRef } from './components/ui/confetti';
import { useMessages } from './i18n';
import { TooltipProvider } from './components/ui/tooltip';
import { LazyBoundary, lazyNamed } from './components/lazy';
import { OverviewPage } from './pages/Overview';
import { StoreProvider, useAppState } from './store';

// The overview is the start page; every other page (and the compact dashboard)
// loads on first visit, which keeps startup and idle memory down (#57).
const AccountsPage = lazyNamed(() => import('./pages/accounts/AccountsPage'), 'AccountsPage');
const AlertsPage = lazyNamed(() => import('./pages/alerts/AlertsPage'), 'AlertsPage');
const ChatPage = lazyNamed(() => import('./pages/Chat'), 'ChatPage');
const ExplorePage = lazyNamed(() => import('./pages/explore/ExplorePage'), 'ExplorePage');
const OutputsPage = lazyNamed(() => import('./pages/Outputs'), 'OutputsPage');
const SettingsPage = lazyNamed(() => import('./pages/Settings'), 'SettingsPage');
const ThemesPage = lazyNamed(() => import('./pages/Themes'), 'ThemesPage');
const CompactDashboard = lazyNamed(() => import('./pages/compact/CompactDashboard'), 'CompactDashboard');

const initialPage = (new URLSearchParams(location.search).get('page') as PageId | null) ?? 'overview';

function Page({ id, state, onNavigate }: { id: PageId; state: AppState; onNavigate: (page: PageId) => void }) {
  switch (id) {
    case 'overview':
      return <OverviewPage state={state} onNavigate={onNavigate} />;
    case 'chat':
      return <ChatPage state={state} />;
    case 'themes':
      return <ThemesPage state={state} onNavigate={onNavigate} />;
    case 'explore':
      return <ExplorePage state={state} onNavigate={onNavigate} />;
    case 'outputs':
      return <OutputsPage state={state} onNavigate={onNavigate} />;
    case 'alerts':
      return <AlertsPage state={state} onNavigate={onNavigate} />;
    case 'accounts':
      return <AccountsPage state={state} />;
    case 'settings':
      return <SettingsPage state={state} />;
  }
}

function Shell() {
  const state = useAppState();
  const m = useMessages();
  const [page, setPageState] = useState<PageId>(initialPage);
  // Re-selecting the current page (e.g. Themes while editing) resets it to its start view.
  const [visit, setVisit] = useState(0);
  const setPage = (next: PageId) => {
    setPageState(next);
    setVisit((count) => count + 1);
    // Kept in the URL so a window rebuilt to free memory (#57) opens on the same page.
    const params = new URLSearchParams(location.search);
    params.set('page', next);
    history.replaceState(null, '', `${location.pathname}?${params}`);
  };

  // Resolve "system" to a concrete theme so `dark:` variants and Magic UI follow it too.
  useEffect(() => {
    const appearance = state?.prefs.appearance ?? 'system';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        appearance === 'system' ? (media.matches ? 'dark' : 'light') : appearance;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [state?.prefs.appearance]);

  // A small puff of tea leaves from the title bar's status dot the first time chat connects.
  const confettiRef = useRef<ConfettiRef>(null);
  const celebrated = useRef(false);
  const channelState = state?.channel.state;
  useEffect(() => {
    if (channelState !== 'connected' || celebrated.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Fire after the page settles; the timer also survives React StrictMode's remount.
    const timer = setTimeout(() => {
      celebrated.current = true;
      const dot = document.querySelector('[data-channel-status]')?.getBoundingClientRect();
      void confettiRef.current?.fire({
        particleCount: 22,
        angle: 300,
        spread: 50,
        startVelocity: 14,
        gravity: 0.7,
        ticks: 110,
        origin: dot
          ? { x: (dot.left + 6) / window.innerWidth, y: (dot.top + dot.height / 2) / window.innerHeight }
          : { x: 0.2, y: 0.03 },
        colors: ['#c0dd97', '#97c459', '#6b9b2e'],
        scalar: 0.7,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [channelState]);

  if (!state) {
    return (
      <div className="grid h-full place-items-center text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <TeaCup mood="happy" size={72} />
          {m.common.loading}
        </div>
      </div>
    );
  }

  const compact = state.prefs.uiMode === 'compact';
  // Pages that manage their own scrolling fill the viewport instead of the page scrolling.
  const fillsViewport = page === 'overview' || page === 'chat' || page === 'themes';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        <TitleBar state={state} title={compact ? m.shell.titleBar.compactMode : m.shell.pages[page]} />
        {compact ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LazyBoundary>
              <CompactDashboard
                state={state}
                onOpenThemes={() => {
                  setPage('themes');
                  appPrefs.set({ uiMode: 'full' });
                }}
              />
            </LazyBoundary>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <Sidebar state={state} page={page} onNavigate={setPage} />
            <main className={`min-w-0 flex-1 ${fillsViewport ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <PageTransition
                id={`${page}:${visit}`}
                className={`mx-auto max-w-[1360px] p-6 ${fillsViewport ? 'h-full overflow-y-auto' : ''}`}
              >
                <LazyBoundary>
                  <Page id={page} state={state} onNavigate={setPage} />
                </LazyBoundary>
              </PageTransition>
            </main>
          </div>
        )}
        <Confetti
          ref={confettiRef}
          manualstart
          globalOptions={{ resize: true, useWorker: false }}
          className="pointer-events-none fixed inset-0 z-50 size-full"
        />
      </div>
    </TooltipProvider>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
