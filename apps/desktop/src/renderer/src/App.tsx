import type { ViewerTarget } from '@chatto/core';
import { useEffect, useState } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';
import { PAGES, Sidebar, type PageId } from './components/Sidebar';
import { TeaCup } from './components/TeaCup';
import { TitleBar } from './components/TitleBar';
import { ChatPage } from './pages/Chat';
import { ConnectionsPage } from './pages/Connections';
import { OutputsPage } from './pages/Outputs';
import { OverviewPage } from './pages/Overview';
import { SettingsPage } from './pages/Settings';
import { ThemesPage } from './pages/Themes';
import { StoreProvider, useAppState, useChatLog } from './store';
import { AccountTile, ChannelTile, EmbedTile, HeroTile, OverlayTile, PreviewTile, ThemeTile } from './tiles';

const initialPage = (new URLSearchParams(location.search).get('page') as PageId | null) ?? 'overview';

/** Single-page bento dashboard (compact mode). */
function CompactDashboard({ state, onOpenThemes }: { state: AppState; onOpenThemes: () => void }) {
  const { stats } = useChatLog();
  const [target, setTarget] = useState<ViewerTarget>('overlay');
  return (
    <main className="mx-auto grid h-full min-h-[680px] w-full max-w-[1280px] auto-rows-[minmax(150px,auto)] grid-cols-4 gap-3 p-4">
      <HeroTile state={state} rate={stats.rate} />
      <AccountTile state={state} />
      <ChannelTile state={state} />
      <OverlayTile state={state} />
      <EmbedTile state={state} />
      <ThemeTile state={state} target={target} onTargetChange={setTarget} onOpenThemes={onOpenThemes} />
      <PreviewTile state={state} target={target} />
    </main>
  );
}

function Page({ id, state, onNavigate }: { id: PageId; state: AppState; onNavigate: (page: PageId) => void }) {
  switch (id) {
    case 'overview':
      return <OverviewPage state={state} onNavigate={onNavigate} />;
    case 'chat':
      return <ChatPage />;
    case 'themes':
      return <ThemesPage state={state} />;
    case 'outputs':
      return <OutputsPage state={state} />;
    case 'connections':
      return <ConnectionsPage state={state} />;
    case 'settings':
      return <SettingsPage state={state} />;
  }
}

function Shell() {
  const state = useAppState();
  const [page, setPage] = useState<PageId>(initialPage);

  useEffect(() => {
    const appearance = state?.prefs.appearance ?? 'system';
    if (appearance === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = appearance;
  }, [state?.prefs.appearance]);

  if (!state) {
    return (
      <div className="grid h-full place-items-center text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <TeaCup mood="happy" size={72} />
          泡茶中…
        </div>
      </div>
    );
  }

  const compact = state.prefs.uiMode === 'compact';
  // Pages that manage their own scrolling fill the viewport instead of the page scrolling.
  const fillsViewport = page === 'chat' || page === 'themes';

  return (
    <div className="flex h-full flex-col">
      <TitleBar state={state} title={compact ? '精簡模式' : PAGES.find((item) => item.id === page)?.label} />
      {compact ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CompactDashboard
            state={state}
            onOpenThemes={() => {
              setPage('themes');
              void api.setPrefs({ uiMode: 'full' });
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <Sidebar state={state} page={page} onNavigate={setPage} />
          <main className={`min-w-0 flex-1 ${fillsViewport ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <div
              key={page}
              className={`page-enter mx-auto max-w-[1360px] p-6 ${fillsViewport ? 'h-full overflow-y-auto' : ''}`}
            >
              <Page id={page} state={state} onNavigate={setPage} />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
