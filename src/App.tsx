import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import PublicDisplay from './PublicDisplay';
import AdminPanel from './AdminPanel';
import { useTournament } from './useTournament';

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
              updateNumTables={t.updateNumTables}
              updatePreGame={t.updatePreGame}
              updateLunchBreak={t.updateLunchBreak}
              updateShortBreak={t.updateShortBreak}
              updateAnnouncementText={t.updateAnnouncementText}
              updateTable={t.updateTable}
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
