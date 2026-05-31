import { useState } from 'react';
import type { TournamentState } from './types';
import { useCountdown, formatTime } from './useCountdown';

const PASSWORD = 'GelderlandInvitational';
const BASE = import.meta.env.BASE_URL;

interface Props {
  state: TournamentState;
  updateTitle: (t: string) => void;
  updateNumTables: (n: number) => void;
  updateBreakDuration: (n: number) => void;
  updateTable: (roundIndex: number, tableIndex: number, field: 'player1' | 'player2', value: string) => void;
  updateBattleplan: (roundIndex: number, bp: number | null) => void;
  startRound: (round: number) => void;
  startBreak: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  adjustTimer: (deltaSeconds: number) => void;
  setFinished: () => void;
  resetAll: () => void;
  setPreTournament: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
      <h3 className="font-cinzel text-amber-500 text-xs tracking-widest uppercase mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', className = '' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-amber-700 text-xs uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-amber-950/40 border border-amber-800/40 rounded px-3 py-1.5 text-amber-100 text-sm focus:outline-none focus:border-amber-600"
      />
    </label>
  );
}

function Btn({ onClick, children, variant = 'default', disabled = false, className = '' }: {
  onClick: () => void; children: React.ReactNode; variant?: 'default' | 'primary' | 'danger' | 'success';
  disabled?: boolean; className?: string;
}) {
  const colors = {
    default: 'bg-amber-900/40 hover:bg-amber-800/50 border-amber-700/40 text-amber-200',
    primary: 'bg-amber-700 hover:bg-amber-600 border-amber-500 text-black font-bold',
    danger: 'bg-red-900/60 hover:bg-red-800 border-red-700 text-red-200',
    success: 'bg-green-900/60 hover:bg-green-800 border-green-700 text-green-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border rounded px-3 py-1.5 text-sm transition-colors ${colors[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

function RoundTables({ state, roundIndex, updateTable, updateBattleplan }: {
  state: TournamentState;
  roundIndex: number;
  updateTable: Props['updateTable'];
  updateBattleplan: Props['updateBattleplan'];
}) {
  const round = state.rounds[roundIndex];
  if (!round) return null;

  return (
    <div className="space-y-3">
      <div>
        <span className="text-amber-700 text-xs uppercase tracking-wider">Battleplan</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {[null, ...Array.from({ length: 12 }, (_, i) => i + 1)].map(bp => (
            <button
              key={bp ?? 'none'}
              onClick={() => updateBattleplan(roundIndex, bp)}
              className={`w-10 h-8 rounded border text-xs font-cinzel transition-colors ${
                round.battleplan === bp
                  ? 'bg-amber-700 border-amber-500 text-black font-bold'
                  : 'bg-amber-950/30 border-amber-800/30 text-amber-400 hover:border-amber-600'
              }`}
            >
              {bp ?? '—'}
            </button>
          ))}
        </div>
        {round.battleplan && (
          <img
            src={`${BASE}battleplan${round.battleplan}.png`}
            alt="battleplan preview"
            className="mt-2 rounded h-24 object-contain border border-amber-800/30"
          />
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {round.tables.map((t, ti) => (
          <div key={t.tableNumber} className="flex items-center gap-2">
            <span className="text-amber-600 font-bold font-cinzel w-6 text-center text-sm shrink-0">{t.tableNumber}</span>
            <input
              value={t.player1}
              onChange={e => updateTable(roundIndex, ti, 'player1', e.target.value)}
              placeholder="Speler 1"
              className="flex-1 bg-amber-950/40 border border-amber-800/30 rounded px-2 py-1 text-amber-100 text-xs focus:outline-none focus:border-amber-600"
            />
            <span className="text-amber-700 text-xs">vs</span>
            <input
              value={t.player2}
              onChange={e => updateTable(roundIndex, ti, 'player2', e.target.value)}
              placeholder="Speler 2"
              className="flex-1 bg-amber-950/40 border border-amber-800/30 rounded px-2 py-1 text-amber-100 text-xs focus:outline-none focus:border-amber-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel(props: Props) {
  const { state } = props;
  const [authenticated, setAuthenticated] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [activeRoundTab, setActiveRoundTab] = useState(0);

  const remainingMs = useCountdown(state);

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0a0806 0%, #130f07 100%)' }}
      >
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-8 w-80 text-center">
          <h1 className="font-cinzel text-amber-400 text-xl font-bold mb-1">Admin Toegang</h1>
          <p className="text-amber-800 text-xs mb-4">Voer het wachtwoord in</p>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pw === PASSWORD) setAuthenticated(true);
                else setPwError(true);
              }
            }}
            className="w-full bg-amber-950/40 border border-amber-800/40 rounded px-3 py-2 text-amber-100 text-sm focus:outline-none focus:border-amber-600 mb-3"
            placeholder="Wachtwoord"
          />
          {pwError && <p className="text-red-400 text-xs mb-2">Onjuist wachtwoord</p>}
          <button
            onClick={() => {
              if (pw === PASSWORD) setAuthenticated(true);
              else setPwError(true);
            }}
            className="w-full bg-amber-700 hover:bg-amber-600 text-black font-bold font-cinzel rounded py-2 text-sm transition-colors"
          >
            Inloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0a0806 0%, #130f07 100%)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-cinzel text-amber-400 text-xl font-bold">Admin Panel</h1>
          <div className="text-amber-700 text-sm font-cinzel">
            Status: <span className="text-amber-400">
              {state.phase === 'pre-tournament' && 'Voor toernooi'}
              {state.phase === 'round-active' && `Ronde ${state.currentRound}`}
              {state.phase === 'break' && 'Pauze'}
              {state.phase === 'finished' && 'Afgelopen'}
            </span>
            {(state.timerRunning || state.timerRemainingMs !== null) && (
              <span className="ml-2 text-amber-300 font-mono">{formatTime(remainingMs)}</span>
            )}
          </div>
        </div>

        {/* Timer controls */}
        <Section title="Timer & Flow">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: state.totalRounds }, (_, i) => i + 1).map(r => (
                <Btn
                  key={r}
                  onClick={() => props.startRound(r)}
                  variant={state.phase === 'round-active' && state.currentRound === r ? 'primary' : 'default'}
                >
                  ▶ Start Ronde {r}
                </Btn>
              ))}
              <Btn onClick={props.startBreak} variant="default">⏸ Start Pauze</Btn>
              <Btn onClick={props.setFinished} variant="default">🏁 Toernooi Klaar</Btn>
              <Btn onClick={props.setPreTournament} variant="default">↩ Terug naar Begin</Btn>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {state.timerRunning ? (
                <Btn onClick={props.pauseTimer} variant="danger">⏸ Pauzeer Timer</Btn>
              ) : (
                <Btn onClick={props.resumeTimer} variant="success" disabled={state.timerRemainingMs === null}>
                  ▶ Hervat Timer
                </Btn>
              )}
              <Btn onClick={() => props.adjustTimer(-60)}>−1 min</Btn>
              <Btn onClick={() => props.adjustTimer(60)}>+1 min</Btn>
              <Btn onClick={() => props.adjustTimer(-300)}>−5 min</Btn>
              <Btn onClick={() => props.adjustTimer(300)}>+5 min</Btn>
            </div>
          </div>
        </Section>

        {/* General settings */}
        <Section title="Toernooi Instellingen">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Titel"
              value={state.title}
              onChange={v => props.updateTitle(v)}
              className="col-span-2"
            />
            <Input
              label="Aantal Tafels"
              value={state.numTables}
              type="number"
              onChange={v => props.updateNumTables(Number(v))}
            />
            <Input
              label="Pauze (minuten)"
              value={state.breakDurationMinutes}
              type="number"
              onChange={v => props.updateBreakDuration(Number(v))}
            />
          </div>
        </Section>

        {/* Round tabs */}
        <Section title="Rondes — Tafels & Battleplan">
          <div className="flex gap-1 mb-4">
            {state.rounds.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveRoundTab(i)}
                className={`font-cinzel px-4 py-1.5 rounded text-sm border transition-colors ${
                  activeRoundTab === i
                    ? 'bg-amber-700 border-amber-500 text-black font-bold'
                    : 'bg-amber-950/30 border-amber-800/30 text-amber-400 hover:border-amber-600'
                }`}
              >
                Ronde {i + 1}
              </button>
            ))}
          </div>
          <RoundTables
            state={state}
            roundIndex={activeRoundTab}
            updateTable={props.updateTable}
            updateBattleplan={props.updateBattleplan}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Gevaarzone">
          <Btn onClick={() => { if (confirm('Weet je het zeker? Dit wist alle data!')) props.resetAll(); }} variant="danger">
            Reset alles
          </Btn>
        </Section>
      </div>
    </div>
  );
}
