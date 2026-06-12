import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { TournamentState } from './types';
import { ROUND_PHASES, BATTLEPLANS } from './types';
import { useCountdown, formatTime } from './useCountdown';

const BASE = import.meta.env.BASE_URL;

// Renders text on a single line, scaling the font down to fit its container
// instead of truncating, so distinguishing names (e.g. "Thomas M" vs
// "Thomas D") stay readable.
function FitText({ text, align = 'left', className = '' }: {
  text: string;
  align?: 'left' | 'right';
  className?: string;
}) {
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = innerRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const measure = () => {
      const prev = el.style.transform;
      el.style.transform = 'none';
      const natural = el.offsetWidth;
      el.style.transform = prev;
      const available = parent.clientWidth;
      setScale(natural > available && natural > 0 ? Math.max(0.55, available / natural) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span className={`block overflow-hidden ${align === 'right' ? 'text-right' : ''}`}>
      <span
        ref={innerRef}
        className={`inline-block whitespace-nowrap ${className}`}
        style={{ transform: `scale(${scale})`, transformOrigin: align === 'right' ? 'right center' : 'left center' }}
      >
        {text}
      </span>
    </span>
  );
}

const PHASE_MILESTONES = [
  { elapsedMin: 0,   label: 'Start',      short: 'Start' },
  { elapsedMin: 10,  label: 'Deployment', short: 'Deploy' },
  { elapsedMin: 30,  label: 'BR 1',       short: 'BR1' },
  { elapsedMin: 70,  label: 'BR 2',       short: 'BR2' },
  { elapsedMin: 110, label: 'BR 3',       short: 'BR3' },
  { elapsedMin: 140, label: 'BR 4',       short: 'BR4' },
  { elapsedMin: 160, label: 'BR 5',       short: 'BR5' },
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

function Timeline({ remainingMs, large = false }: { remainingMs: number; large?: boolean }) {
  const totalMin = 180;
  const elapsedMin = totalMin - remainingMs / 60000;
  const progressPct = Math.min(100, Math.max(0, (elapsedMin / totalMin) * 100));

  const barH = large ? 'h-12' : 'h-7';
  const labelsH = large ? 64 : 44;
  const dotSize = large ? 'w-5 h-5' : 'w-3 h-3';
  const labelText = large ? 'text-xl' : 'text-sm';

  return (
    <div className={`w-full ${large ? 'mt-6' : 'mt-5'}`}>
      {/* Bar */}
      <div className={`relative ${barH} rounded-full bg-gray-200 border border-gray-300 overflow-hidden`}>
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
      <div className="relative mt-2" style={{ height: labelsH }}>
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
              <div className={`${dotSize} rounded-full border-2 ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`} />
              <span className={`${labelText} font-semibold mt-1 whitespace-nowrap ${isCurrent ? 'text-blue-700' : active ? 'text-gray-600' : 'text-gray-400'}`}>
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
  const nameOf = (id: string | null) => state.players.find(p => p.id === id)?.name ?? '';
  const tables = round.tables.filter(t => t.player1Id || t.player2Id);
  if (tables.length === 0) return (
    <p className="text-gray-400 text-center py-4 text-lg">No table assignments entered yet</p>
  );

  const n = tables.length;
  const cols = n <= 6 ? 1 : n <= 14 ? 2 : 3;
  const rowsPerCol = Math.ceil(n / cols);
  // Fewer rows per column → taller bars → larger text.
  const tier = rowsPerCol <= 4 ? 'lg' : rowsPerCol <= 6 ? 'md' : rowsPerCol <= 9 ? 'sm' : 'xs';
  const numCls = { lg: 'text-3xl', md: 'text-2xl', sm: 'text-xl', xs: 'text-base' }[tier];
  const nameCls = { lg: 'text-2xl', md: 'text-xl', sm: 'text-lg', xs: 'text-sm' }[tier];
  const padX = { lg: 'px-5', md: 'px-4', sm: 'px-3', xs: 'px-2.5' }[tier];

  return (
    <div
      className="grid gap-2 h-full"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}
    >
      {tables.map(t => (
        <div
          key={t.tableNumber}
          className={`flex items-center gap-2 ${padX} rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden min-h-0`}
        >
          <span className={`text-blue-700 font-black font-cinzel ${numCls} text-center shrink-0`} style={{ minWidth: '1.4em' }}>{t.tableNumber}</span>
          <div className="flex-1 min-w-0">
            <FitText text={nameOf(t.player1Id) || '—'} align="left" className={`text-gray-900 font-semibold ${nameCls}`} />
          </div>
          <span className="text-gray-400 font-medium text-sm px-1 shrink-0">vs</span>
          <div className="flex-1 min-w-0">
            <FitText text={nameOf(t.player2Id) || '—'} align="right" className={`text-gray-900 font-semibold ${nameCls}`} />
          </div>
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

  const displayRoundIndex =
    state.phase === 'pre-tournament' || state.phase === 'pre-game'
      ? 0                       // before round 1 starts, show round 1's tables
      : state.phase === 'break'
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
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-blue-800 w-full shrink-0" />

      {/* Title */}
      <div className="flex items-center gap-4 py-4 px-8 border-b border-gray-200 shrink-0">
        {state.logoDataUrl && (
          <div className="shrink-0 flex items-center justify-start" style={{ width: 'clamp(110px, 13vw, 190px)' }}>
            <img
              src={state.logoDataUrl}
              alt="Event logo"
              className="object-contain max-w-full"
              style={{ maxHeight: 'clamp(3.5rem, 12vh, 7rem)' }}
            />
          </div>
        )}
        <div className="flex-1 text-center min-w-0">
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
        {/* Spacer to keep the title centered opposite the logo */}
        {state.logoDataUrl && (
          <div className="shrink-0" style={{ width: 'clamp(96px, 14vw, 200px)' }} aria-hidden />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col p-4 gap-4 max-w-screen-2xl mx-auto w-full">

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

        {/* === ROUND ACTIVE — compact (tables still on screen) === */}
        {state.phase === 'round-active' && showTables && (
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

        {/* === ROUND ACTIVE — centered (tables gone, timer takes over) === */}
        {state.phase === 'round-active' && !showTables && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-4">
            <p className="text-blue-600 font-bold tracking-widest uppercase"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
              Round {state.currentRound} of {state.totalRounds}
            </p>
            <p className="font-cinzel font-bold text-gray-900 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)' }}>
              {currentPhase?.label ?? ''}
            </p>
            <div className={`font-cinzel font-black tabular-nums leading-none ${timerColor}`}
              style={{ fontSize: 'clamp(5rem, 18vw, 13rem)' }}>
              {formatTime(remainingMs)}
            </div>
            <p className="text-gray-400 tracking-widest uppercase text-sm">remaining</p>
            {nextPhase && (
              <p className="text-gray-400" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.4rem)' }}>
                Next: <span className="text-gray-600 font-medium">{nextPhase.label}</span> in {formatTime(nextPhase.inMs)}
              </p>
            )}
            <div className="w-full max-w-6xl mt-4">
              <Timeline remainingMs={remainingMs} large />
            </div>
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
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Table assignments */}
            {showTables && (
              <div className="flex-1 min-w-0 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm flex flex-col min-h-0 overflow-hidden">
                <h2 className="font-cinzel text-gray-500 text-xs font-bold tracking-widest uppercase mb-3 text-center shrink-0">
                  Table Assignments — Round {displayRoundIndex + 1}
                </h2>
                <div className="flex-1 min-h-0">
                  <TableGrid state={state} roundIndex={displayRoundIndex} />
                </div>
              </div>
            )}

            {/* Battleplan — scales to fill the remaining space */}
            {showBattleplan && battleplanNum && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm flex flex-col items-center min-h-0"
                style={{ flex: '0 1 760px', maxWidth: 820, minWidth: 0 }}>
                <h2 className="font-cinzel text-gray-500 text-xs font-bold tracking-widest uppercase mb-1 text-center shrink-0">
                  Battleplan
                </h2>
                <p className="font-cinzel text-gray-800 font-bold text-xl text-center mb-2 shrink-0">
                  {BATTLEPLANS[battleplanNum]}
                </p>
                <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                  <img
                    src={`${BASE}battleplan${battleplanNum}.png`}
                    alt={BATTLEPLANS[battleplanNum]}
                    className="rounded-xl object-contain w-full h-full"
                  />
                </div>
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
