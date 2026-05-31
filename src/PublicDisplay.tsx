import { useMemo } from 'react';
import type { TournamentState } from './types';
import { ROUND_PHASES } from './types';
import { useCountdown, formatTime } from './useCountdown';

const BASE = import.meta.env.BASE_URL;

interface Props {
  state: TournamentState;
}

function getCurrentPhaseLabel(remainingMs: number): string {
  const remainingMin = remainingMs / 60000;
  for (const phase of ROUND_PHASES) {
    if (remainingMin >= phase.minRemaining) return phase.label;
  }
  return ROUND_PHASES[ROUND_PHASES.length - 1].label;
}

function getNextPhaseIn(remainingMs: number): { label: string; inMs: number } | null {
  const remainingMin = remainingMs / 60000;
  for (let i = 0; i < ROUND_PHASES.length - 1; i++) {
    const cur = ROUND_PHASES[i];
    const next = ROUND_PHASES[i + 1];
    if (remainingMin >= cur.minRemaining) {
      const inMs = (remainingMin - cur.minRemaining) * 60000;
      return { label: next.label, inMs };
    }
  }
  return null;
}

function PhaseTimeline({ remainingMs }: { remainingMs: number }) {
  const remainingMin = remainingMs / 60000;
  const totalMin = 180;
  const elapsed = totalMin - remainingMin;
  const progressPct = Math.min(100, (elapsed / totalMin) * 100);

  const milestones = [
    { at: 0, label: 'Start', short: 'Start' },
    { at: 10, label: 'Deployment', short: 'Deploy' },
    { at: 70, label: 'GR 1', short: 'GR1' },
    { at: 110, label: 'GR 2', short: 'GR2' },
    { at: 140, label: 'GR 3', short: 'GR3' },
    { at: 160, label: 'GR 4', short: 'GR4' },
    { at: 170, label: 'GR 5', short: 'GR5' },
  ];

  return (
    <div className="w-full px-4 py-2">
      <div className="relative h-3 rounded-full bg-amber-950/60 border border-amber-800/40 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #78350f, #c9a84c)',
          }}
        />
      </div>
      <div className="relative mt-1 flex justify-between">
        {milestones.map(m => {
          const pct = (m.at / totalMin) * 100;
          const active = elapsed >= m.at;
          return (
            <div
              key={m.at}
              className="flex flex-col items-center"
              style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${active ? 'bg-amber-400' : 'bg-amber-900'}`} />
              <span className={`text-[10px] mt-0.5 whitespace-nowrap ${active ? 'text-amber-300' : 'text-amber-800'}`}>
                {m.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableGrid({ state }: { state: TournamentState }) {
  const round = state.rounds[state.currentRound - 1];
  if (!round) return null;
  const tables = round.tables.filter(t => t.player1 || t.player2);
  if (tables.length === 0) return null;

  const cols = tables.length <= 6 ? 2 : tables.length <= 12 ? 3 : 4;

  return (
    <div
      className="grid gap-2 w-full"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {tables.map(t => (
        <div
          key={t.tableNumber}
          className="rounded border border-amber-800/30 bg-amber-950/20 px-3 py-2 flex items-center gap-2 text-sm"
        >
          <span className="text-amber-600 font-bold font-cinzel w-6 shrink-0 text-center">{t.tableNumber}</span>
          <span className="text-amber-100 flex-1 truncate">{t.player1 || '—'}</span>
          <span className="text-amber-600 text-xs">vs</span>
          <span className="text-amber-100 flex-1 truncate text-right">{t.player2 || '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function PublicDisplay({ state }: Props) {
  const remainingMs = useCountdown(state);
  const remainingMin = remainingMs / 60000;

  const phaseLabel = useMemo(() => {
    if (state.phase === 'round-active') return getCurrentPhaseLabel(remainingMs);
    return null;
  }, [state.phase, remainingMs]);

  const nextPhase = useMemo(() => {
    if (state.phase === 'round-active') return getNextPhaseIn(remainingMs);
    return null;
  }, [state.phase, remainingMs]);

  // Show tables: pre-tournament, break, or first 30 min of a round
  const showTables =
    state.phase === 'pre-tournament' ||
    state.phase === 'break' ||
    (state.phase === 'round-active' && remainingMin >= 150);

  // Show battleplan: same conditions as tables
  const showBattleplan = showTables;

  const currentRoundConfig = state.rounds[state.currentRound - 1];
  const battleplan = currentRoundConfig?.battleplan ?? null;

  // Determine which round's tables to show during break (next round)
  const tableRound =
    state.phase === 'break'
      ? state.currentRound // next round
      : state.currentRound;

  const tableRoundConfig = state.rounds[tableRound - 1] ?? state.rounds[0];

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'linear-gradient(160deg, #0a0806 0%, #130f07 60%, #0d0a04 100%)' }}
    >
      {/* Decorative top border */}
      <div className="w-full h-1" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />

      {/* Title */}
      <div className="text-center pt-6 pb-3 px-8">
        <h1
          className="font-cinzel font-black tracking-widest uppercase"
          style={{
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            color: '#c9a84c',
            textShadow: '0 0 40px rgba(201,168,76,0.4), 0 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '0.15em',
          }}
        >
          {state.title}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="h-px flex-1 max-w-32" style={{ background: 'linear-gradient(90deg, transparent, #8b6914)' }} />
          <span className="text-amber-700 text-xs tracking-widest uppercase font-cinzel">
            Warhammer Age of Sigmar
          </span>
          <div className="h-px flex-1 max-w-32" style={{ background: 'linear-gradient(90deg, #8b6914, transparent)' }} />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 w-full flex flex-col items-center gap-4 px-6 pb-6 max-w-7xl">

        {/* Phase banner + timer */}
        <div
          className="w-full rounded-xl border flex flex-col items-center py-5 px-6"
          style={{ borderColor: '#8b6914', background: 'rgba(19,15,7,0.8)' }}
        >
          {state.phase === 'pre-tournament' && (
            <div className="text-center">
              <p className="font-cinzel text-amber-400 text-2xl font-bold tracking-wider">Klaar voor de strijd</p>
              <p className="text-amber-700 mt-1 text-sm">Het toernooi begint binnenkort</p>
            </div>
          )}

          {state.phase === 'finished' && (
            <div className="text-center">
              <p className="font-cinzel text-amber-400 text-3xl font-bold tracking-wider">Toernooi afgelopen!</p>
              <p className="text-amber-600 mt-1">Goed gevochten, strijders</p>
            </div>
          )}

          {state.phase === 'break' && (
            <div className="text-center w-full">
              <p className="font-cinzel text-amber-500 text-lg tracking-widest uppercase">Pauze</p>
              <div
                className="font-cinzel font-black tabular-nums"
                style={{
                  fontSize: 'clamp(3rem, 10vw, 6rem)',
                  color: remainingMs < 60000 ? '#ef4444' : '#c9a84c',
                  textShadow: '0 0 30px rgba(201,168,76,0.5)',
                  lineHeight: 1,
                }}
              >
                {formatTime(remainingMs)}
              </div>
              <p className="text-amber-700 text-sm mt-2">
                Ronde {state.currentRound + 1} begint over {formatTime(remainingMs)}
              </p>
            </div>
          )}

          {state.phase === 'round-active' && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-cinzel text-amber-600 text-sm tracking-widest uppercase">
                    Ronde {state.currentRound} van {state.totalRounds}
                  </p>
                  <p className="font-cinzel text-amber-300 text-xl font-bold">{phaseLabel}</p>
                  {nextPhase && (
                    <p className="text-amber-700 text-xs mt-0.5">
                      Volgende: {nextPhase.label} over {formatTime(nextPhase.inMs)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="font-cinzel font-black tabular-nums"
                    style={{
                      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                      color: remainingMs < 600000 ? '#ef4444' : remainingMs < 1800000 ? '#f59e0b' : '#c9a84c',
                      textShadow: '0 0 20px rgba(201,168,76,0.4)',
                      lineHeight: 1,
                    }}
                  >
                    {formatTime(remainingMs)}
                  </div>
                  <p className="text-amber-700 text-xs">resterend</p>
                </div>
              </div>
              <PhaseTimeline remainingMs={remainingMs} />
            </div>
          )}
        </div>

        {/* Tables + Battleplan row */}
        {(showTables || showBattleplan) && (
          <div className="w-full flex gap-4 flex-1">
            {/* Table assignments */}
            {showTables && (
              <div
                className="flex-1 rounded-xl border p-4"
                style={{ borderColor: '#8b6914', background: 'rgba(19,15,7,0.8)' }}
              >
                <h2 className="font-cinzel text-amber-500 text-sm tracking-widest uppercase mb-3 text-center">
                  Tafelverdeling — Ronde {tableRound}
                </h2>
                {tableRoundConfig ? (
                  <TableGrid state={{ ...state, currentRound: tableRound }} />
                ) : (
                  <p className="text-amber-800 text-center text-sm">Nog geen tafels ingevoerd</p>
                )}
              </div>
            )}

            {/* Battleplan */}
            {showBattleplan && battleplan && (
              <div
                className="rounded-xl border p-3 flex flex-col items-center"
                style={{ borderColor: '#8b6914', background: 'rgba(19,15,7,0.8)', minWidth: 220 }}
              >
                <h2 className="font-cinzel text-amber-500 text-sm tracking-widest uppercase mb-2">
                  Battleplan {battleplan}
                </h2>
                <img
                  src={`${BASE}battleplan${battleplan}.png`}
                  alt={`Battleplan ${battleplan}`}
                  className="rounded-lg object-contain"
                  style={{ maxHeight: '40vh', maxWidth: 300 }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom border */}
      <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, #8b6914, transparent)' }} />
    </div>
  );
}
