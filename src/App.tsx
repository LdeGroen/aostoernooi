import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import PublicDisplay from './PublicDisplay';
import AdminPanel from './AdminPanel';
import { useTournament } from './useTournament';

function App() {
  const tournament = useTournament();

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="relative">
              <PublicDisplay state={tournament.state} />
              <Link
                to="/admin"
                className="fixed bottom-3 right-3 text-amber-900/40 hover:text-amber-700 text-xs font-cinzel transition-colors"
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
              state={tournament.state}
              updateTitle={tournament.updateTitle}
              updateNumTables={tournament.updateNumTables}
              updateBreakDuration={tournament.updateBreakDuration}
              updateTable={tournament.updateTable}
              updateBattleplan={tournament.updateBattleplan}
              startRound={tournament.startRound}
              startBreak={tournament.startBreak}
              pauseTimer={tournament.pauseTimer}
              resumeTimer={tournament.resumeTimer}
              adjustTimer={tournament.adjustTimer}
              setFinished={tournament.setFinished}
              resetAll={tournament.resetAll}
              setPreTournament={tournament.setPreTournament}
            />
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
