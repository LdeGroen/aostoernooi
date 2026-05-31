import { useMemo } from 'react';
import type { TournamentState } from './types';
import { ROUND_PHASES, BATTLEPLANS } from './types';
import { useCountdown, formatTime } from './useCountdown';

const BASE = import.meta.env.BASE_URL;

const PHASE_MILESTONES = [
  { elapsedMin: 0,   label: 'Start',      short: 'Start' },
  { elapsedMin: 10,  label: 'Deployment', short: 'Deploy' },
  { elapsedMin: 70,  label: 'BR 1',       short: 'BR1' },
  { elapsedMin: 110, label: 'BR 2',       short: 'BR2' },
  { elapsedMin: 140, label: 'BR 3',       short: 'BR3' },
  { elapsedMin: 160, label: 'BR 4',       short: 'BR4' },
  { elapsedMin: 170, label: 'BR 5',       short: 'BR5' },
];

function getCurrentPhase(remainingMs: number) {
  const remainingMin = remainingMs / 60000;
  for (let i = 0; i < ROUND_PHASES.length; i++) {
    if (remainingMin >= ROUND_PHASES[i].minRemaining) return { phase: ROUND_PHASES[i], index: i };
  }
  return { phase: ROUND_PHASES[ROUND_PHASES.length - 1], index: ROUND_PHASES.length - 1 };
}

function getNextPhase(remainingMs: number): { label: string; inMs: number } | null {
  const remainingMin = remainingMs / 60000;
  for (let i = 0; i < ROUND_PHASES.length - 1; i++) {
    if (remainingMin >= ROUND_PHASES[i].minRemaining) {
      const inMs = (remainingMin - ROUND_PHASES[i].minRemaining) * 60000;
      return { label: ROUND_PHASES[i + 1].label, inMs };
    }
  }
  return null;
}

function Timeline({ remainingMs }: { remainingMs: number }) {
  const totalMin = 180;
  const elapsedMin = totalMin - remainingMs / 60000;
  const progressPct = Math.min(100, Math.max(0, (elapsedMin / totalMin) * 100));

  return (
    <div className="w-full mt-3">
      {/* Bar */}
      <div className="relative h-4 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
          style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #1e3a5f, #2563eb)' }}
        />
        {/* Milestone ticks */}
        {PHASE_MILESTONES.slice(1).map(m => {
          const pct = (m.elapsedMin / totalMin) * 100;
          return (
            <div
              key={m.elapsedMin}
              className="absolute top-0 bottom-0 w-px bg-gray-400/60"
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Labels below bar */}
      <div className="relative mt-1" style={{ height: 28 }}>
        {PHASE_MILESTONES.map(m => {
          const pct = (m.elapsedMin / totalMin) * 100;
          const active = elapsedMin >= m.elapsedMin;
          const isCurrent = (() => {
            const next = PHASE_MILESTONES[PHASE_MILESTONES.indexOf(m) + 1];
            return active && (!next || elapsedMin < next.elapsedMin);
          })();
          return (
            <div
              key={m.elapsedMin}
              className="absolute flex flex-col items-center"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-2 h-2 rounded-full border-2 ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`} />
              <span className={`text-[10px] font-semibold mt-0.5 whitespace-nowrap ${isCurrent ? 'text-blue-700' : active ? 'text-gray-600' : 'text-gray-400'}`}>
                {m.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableGrid({ state, roundIndex }: { state: TournamentState; roundIndex: number }) {
  const round = state.rounds[roundIndex];
  if (!round) return null;
  const tables = round.tables.filter(t => t.player1 || t.player2);
  if (tables.length === 0) return (
    <p className="text-gray-400 text-center py-4 text-lg">No table assignments entered yet</p>
  );

  const cols = tables.length <= 4 ? 1 : tables.length <= 8 ? 2 : 3;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {tables.map(t => (
        <div
          key={t.tableNumber}
          className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50"
        >
          <span className="text-blue-700 font-black font-cinzel text-2xl w-8 text-center shrink-0">{t.tableNumber}</span>
          <span className="flex-1 text-gray-900 font-semibold text-xl truncate">{t.player1 || '—'}</span>
          <span className="text-gray-400 font-medium text-sm px-2">vs</span>
          <span className="flex-1 text-gray-900 font-semibold text-xl truncate text-right">{t.player2 || '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function PublicDisplay({ state }: { state: TournamentState }) {
  const remainingMs = useCountdown(state);

  const { phase: currentPhase } = useMemo(() =>
    state.phase === 'round-active' ? getCurrentPhase(remainingMs) : { phase: null, index: -1 },
    [state.phase, remainingMs]
  );

  const nextPhase = useMemo(() =>
    state.phase === 'round-active' ? getNextPhase(remainingMs) : null,
    [state.phase, remainingMs]
  );

  const remainingMin = remainingMs / 60000;
  // Show tables during: pre-tournament, pre-game, break, or first 30 min of round (>150 min remaining)
  const showTables =
    state.phase === 'pre-tournament' ||
    state.phase === 'pre-game' ||
    state.phase === 'break' ||
    (state.phase === 'round-active' && remainingMin >= 150);

  const showBattleplan = showTables;

  const displayRoundIndex = state.phase === 'break'
    ? state.currentRound      // show next round's tables during break
    : state.currentRound - 1;

  const roundConfig = state.rounds[displayRoundIndex] ?? state.rounds[0];
  const battleplanNum = roundConfig?.battleplan ?? null;

  const timerColor = remainingMs < 600000
    ? 'text-red-600'
    : remainingMs < 1800000
    ? 'text-orange-500'
    : 'text-gray-900';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-blue-800 w-full" />

      {/* Title */}
      <div className="text-center py-5 px-8 border-b border-gray-200">
        <h1
          className="font-cinzel font-black tracking-widest uppercase text-gray-900"
          style={{ fontSize: 'clamp(2rem, 5.5vw, 4.5rem)', letterSpacing: '0.12em' }}
        >
          {state.title}
        </h1>
        <p className="text-blue-700 text-xs font-semibold tracking-widest uppercase mt-1">
          Warhammer Age of Sigmar
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 gap-5 max-w-screen-2xl mx-auto w-full">

        {/* === PRE-TOURNAMENT === */}
        {state.phase === 'pre-tournament' && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-8 text-center">
            <p className="font-cinzel text-3xl font-bold text-gray-700">Ready for Battle</p>
            <p className="text-gray-400 mt-2">The tournament will begin shortly</p>
          </div>
        )}

        {/* === PRE-GAME COUNTDOWN === */}
        {state.phase === 'pre-game' && (
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 text-center">
            <p className="font-cinzel text-blue-700 text-xl font-bold tracking-widest uppercase mb-2">
              Round 1 starts in
            </p>
            <div className={`font-cinzel font-black tabular-nums ${timerColor}`}
              style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 1 }}>
              {formatTime(remainingMs)}
            </div>
          </div>
        )}

        {/* === BREAK === */}
        {state.phase === 'break' && (
          <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
            <p className="font-cinzel text-gray-500 text-lg font-bold tracking-widest uppercase">
              {state.currentRound === 1 ? 'Lunch Break' : 'Short Break'}
            </p>
            <div className={`font-cinzel font-black tabular-nums ${timerColor}`}
              style={{ fontSize: 'clamp(3rem, 10vw, 6rem)', lineHeight: 1 }}>
              {formatTime(remainingMs)}
            </div>
            <p className="text-gray-400 mt-2 text-sm">
              Round {state.currentRound + 1} table assignments below
            </p>
          </div>
        )}

        {/* === ROUND ACTIVE === */}
        {state.phase === 'round-active' && (
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-blue-600 text-sm font-bold tracking-widest uppercase mb-0.5">
                  Round {state.currentRound} of {state.totalRounds}
                </p>
                <p className="font-cinzel text-2xl font-bold text-gray-900 leading-tight">
                  {currentPhase?.label ?? ''}
                </p>
                {nextPhase && (
                  <p className="text-gray-400 text-sm mt-1">
                    Next: <span className="text-gray-600 font-medium">{nextPhase.label}</span> in {formatTime(nextPhase.inMs)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className={`font-cinzel font-black tabular-nums leading-none ${timerColor}`}
                  style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>
                  {formatTime(remainingMs)}
                </div>
                <p className="text-gray-400 text-xs mt-1">remaining</p>
              </div>
            </div>
            <Timeline remainingMs={remainingMs} />
          </div>
        )}

        {/* === FINISHED === */}
        {state.phase === 'finished' && (
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-10 text-center">
            <p className="font-cinzel text-4xl font-black text-blue-800 mb-4">Tournament Complete</p>
            {state.announcementText && (
              <p className="text-gray-700 text-xl whitespace-pre-line leading-relaxed">
                {state.announcementText}
              </p>
            )}
          </div>
        )}

        {/* === TABLES + BATTLEPLAN === */}
        {(showTables || showBattleplan) && state.phase !== 'finished' && (
          <div className="flex gap-5 flex-1 min-h-0">
            {/* Table assignments */}
            {showTables && (
              <div className="flex-1 rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm overflow-hidden">
                <h2 className="font-cinzel text-gray-500 text-xs font-bold tracking-widest uppercase mb-4 text-center">
                  Table Assignments — Round {displayRoundIndex + 1}
                </h2>
                <TableGrid state={state} roundIndex={displayRoundIndex} />
              </div>
            )}

            {/* Battleplan */}
            {showBattleplan && battleplanNum && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm flex flex-col items-center"
                style={{ minWidth: 420, maxWidth: 560 }}>
                <h2 className="font-cinzel text-gray-500 text-xs font-bold tracking-widest uppercase mb-1 text-center">
                  Battleplan
                </h2>
                <p className="font-cinzel text-gray-800 font-bold text-lg text-center mb-3">
                  {BATTLEPLANS[battleplanNum]}
                </p>
                <img
                  src={`${BASE}battleplan${battleplanNum}.png`}
                  alt={BATTLEPLANS[battleplanNum]}
                  className="rounded-xl object-contain flex-1"
                  style={{ maxHeight: '70vh', maxWidth: '100%' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent */}
      <div className="h-1 bg-blue-800 w-full" />
    </div>
  );
}
