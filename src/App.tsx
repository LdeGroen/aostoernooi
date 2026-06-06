import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import PublicDisplay from './PublicDisplay';
import AdminPanel from './AdminPanel';
import { useTournament } from './useTournament';

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className="fixed bottom-3 left-4 text-gray-300 hover:text-gray-500 transition-colors select-none p-1"
    >
      {isFullscreen ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" />
        </svg>
      )}
    </button>
  );
}

function App() {
  const t = useTournament();

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="relative">
              <PublicDisplay state={t.state} />
              <FullscreenToggle />
              <Link
                to="/admin"
                className="fixed bottom-3 right-4 text-gray-300 hover:text-gray-500 text-xs transition-colors select-none"
              >
                admin
              </Link>
            </div>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPanel
              state={t.state}
              updateTitle={t.updateTitle}
              updateLogo={t.updateLogo}
              addPlayer={t.addPlayer}
              updatePlayerName={t.updatePlayerName}
              removePlayer={t.removePlayer}
              assignSlot={t.assignSlot}
              clearSlot={t.clearSlot}
              swapSlots={t.swapSlots}
              updatePreGame={t.updatePreGame}
              updateLunchBreak={t.updateLunchBreak}
              updateShortBreak={t.updateShortBreak}
              updateAnnouncementText={t.updateAnnouncementText}
              updateBattleplan={t.updateBattleplan}
              startPreGame={t.startPreGame}
              startRound={t.startRound}
              startBreak={t.startBreak}
              pauseTimer={t.pauseTimer}
              resumeTimer={t.resumeTimer}
              adjustTimer={t.adjustTimer}
              setFinished={t.setFinished}
              setPreTournament={t.setPreTournament}
              resetAll={t.resetAll}
            />
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
