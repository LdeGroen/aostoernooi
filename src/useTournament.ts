import { useState, useCallback } from 'react';
import type { TournamentState, RoundConfig } from './types';

const STORAGE_KEY = 'aostoernooi-state';

function defaultRound(numTables: number): RoundConfig {
  return {
    battleplan: null,
    tables: Array.from({ length: numTables }, (_, i) => ({
      tableNumber: i + 1,
      player1: '',
      player2: '',
    })),
  };
}

function getDefault(numTables = 12, totalRounds = 3): TournamentState {
  return {
    title: 'Gelderland Invitational II',
    numTables,
    totalRounds,
    roundDurationMinutes: 180,
    breakDurationMinutes: 30,
    phase: 'pre-tournament',
    currentRound: 0,
    timerRunning: false,
    timerEndMs: null,
    timerRemainingMs: null,
    rounds: Array.from({ length: totalRounds }, () => defaultRound(numTables)),
  };
}

function load(): TournamentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TournamentState;
  } catch {
    // ignore
  }
  return getDefault();
}

function save(state: TournamentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTournament() {
  const [state, setStateRaw] = useState<TournamentState>(load);

  const setState = useCallback((updater: (prev: TournamentState) => TournamentState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const updateTitle = (title: string) => setState(s => ({ ...s, title }));

  const updateNumTables = (numTables: number) =>
    setState(s => ({
      ...s,
      numTables,
      rounds: s.rounds.map(r => ({
        ...r,
        tables: Array.from({ length: numTables }, (_, i) => ({
          tableNumber: i + 1,
          player1: r.tables[i]?.player1 ?? '',
          player2: r.tables[i]?.player2 ?? '',
        })),
      })),
    }));

  const updateBreakDuration = (breakDurationMinutes: number) =>
    setState(s => ({ ...s, breakDurationMinutes }));

  const updateTable = (roundIndex: number, tableIndex: number, field: 'player1' | 'player2', value: string) =>
    setState(s => {
      const rounds = s.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        const tables = r.tables.map((t, ti) => {
          if (ti !== tableIndex) return t;
          return { ...t, [field]: value };
        });
        return { ...r, tables };
      });
      return { ...s, rounds };
    });

  const updateBattleplan = (roundIndex: number, battleplan: number | null) =>
    setState(s => {
      const rounds = s.rounds.map((r, ri) => ri === roundIndex ? { ...r, battleplan } : r);
      return { ...s, rounds };
    });

  // --- Timer controls ---

  const startRound = (roundNumber: number) => {
    const durationMs = state.roundDurationMinutes * 60 * 1000;
    setState(s => ({
      ...s,
      phase: 'round-active',
      currentRound: roundNumber,
      timerRunning: true,
      timerEndMs: Date.now() + durationMs,
      timerRemainingMs: null,
    }));
  };

  const startBreak = () => {
    const durationMs = state.breakDurationMinutes * 60 * 1000;
    setState(s => ({
      ...s,
      phase: 'break',
      timerRunning: true,
      timerEndMs: Date.now() + durationMs,
      timerRemainingMs: null,
    }));
  };

  const pauseTimer = () => {
    setState(s => {
      if (!s.timerRunning || s.timerEndMs === null) return s;
      const remaining = Math.max(0, s.timerEndMs - Date.now());
      return { ...s, timerRunning: false, timerEndMs: null, timerRemainingMs: remaining };
    });
  };

  const resumeTimer = () => {
    setState(s => {
      if (s.timerRunning || s.timerRemainingMs === null) return s;
      return {
        ...s,
        timerRunning: true,
        timerEndMs: Date.now() + s.timerRemainingMs,
        timerRemainingMs: null,
      };
    });
  };

  const adjustTimer = (deltaSeconds: number) => {
    setState(s => {
      if (s.timerRunning && s.timerEndMs !== null) {
        return { ...s, timerEndMs: s.timerEndMs + deltaSeconds * 1000 };
      } else if (!s.timerRunning && s.timerRemainingMs !== null) {
        return { ...s, timerRemainingMs: Math.max(0, s.timerRemainingMs + deltaSeconds * 1000) };
      }
      return s;
    });
  };

  const setFinished = () => setState(s => ({ ...s, phase: 'finished', timerRunning: false }));

  const resetAll = () => setState(() => getDefault());

  const setPreTournament = () =>
    setState(s => ({ ...s, phase: 'pre-tournament', timerRunning: false, currentRound: 0, timerEndMs: null, timerRemainingMs: null }));

  return {
    state,
    updateTitle,
    updateNumTables,
    updateBreakDuration,
    updateTable,
    updateBattleplan,
    startRound,
    startBreak,
    pauseTimer,
    resumeTimer,
    adjustTimer,
    setFinished,
    resetAll,
    setPreTournament,
  };
}
