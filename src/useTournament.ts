import { useState, useCallback, useEffect, useRef } from 'react';
import type { TournamentState, RoundConfig } from './types';

const STORAGE_KEY = 'aostoernooi-state';
const CHANNEL_NAME = 'aostoernooi-sync';

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
    preGameDurationMinutes: 15,
    lunchBreakMinutes: 60,
    shortBreakMinutes: 20,
    announcementText: 'Thank you for participating!\nResults will be announced shortly.',
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
    if (raw) {
      const parsed = JSON.parse(raw) as TournamentState;
      // Migrate old states that might be missing new fields
      return { ...getDefault(), ...parsed };
    }
  } catch { /* ignore */ }
  return getDefault();
}

function save(state: TournamentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useTournament() {
  const [state, setStateRaw] = useState<TournamentState>(load);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Set up BroadcastChannel for cross-tab real-time sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'state') {
        setStateRaw(e.data.state as TournamentState);
      }
    };
    return () => { channelRef.current?.close(); };
  }, []);

  const setState = useCallback((updater: (prev: TournamentState) => TournamentState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      save(next);
      channelRef.current?.postMessage({ type: 'state', state: next });
      return next;
    });
  }, []);

  // --- Settings ---

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

  const updatePreGame = (preGameDurationMinutes: number) =>
    setState(s => ({ ...s, preGameDurationMinutes }));

  const updateLunchBreak = (lunchBreakMinutes: number) =>
    setState(s => ({ ...s, lunchBreakMinutes }));

  const updateShortBreak = (shortBreakMinutes: number) =>
    setState(s => ({ ...s, shortBreakMinutes }));

  const updateAnnouncementText = (announcementText: string) =>
    setState(s => ({ ...s, announcementText }));

  const updateTable = (roundIndex: number, tableIndex: number, field: 'player1' | 'player2', value: string) =>
    setState(s => ({
      ...s,
      rounds: s.rounds.map((r, ri) =>
        ri !== roundIndex ? r : {
          ...r,
          tables: r.tables.map((t, ti) =>
            ti !== tableIndex ? t : { ...t, [field]: value }
          ),
        }
      ),
    }));

  const updateBattleplan = (roundIndex: number, battleplan: number | null) =>
    setState(s => ({
      ...s,
      rounds: s.rounds.map((r, ri) => ri === roundIndex ? { ...r, battleplan } : r),
    }));

  // --- Timer controls ---

  const startPreGame = () => {
    const durationMs = state.preGameDurationMinutes * 60 * 1000;
    setState(s => ({
      ...s,
      phase: 'pre-game',
      timerRunning: true,
      timerEndMs: Date.now() + durationMs,
      timerRemainingMs: null,
    }));
  };

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

  const startBreak = (type: 'lunch' | 'short') => {
    const durationMs = (type === 'lunch' ? state.lunchBreakMinutes : state.shortBreakMinutes) * 60 * 1000;
    setState(s => ({
      ...s,
      phase: 'break',
      timerRunning: true,
      timerEndMs: Date.now() + durationMs,
      timerRemainingMs: null,
    }));
  };

  const pauseTimer = () =>
    setState(s => {
      if (!s.timerRunning || s.timerEndMs === null) return s;
      return { ...s, timerRunning: false, timerEndMs: null, timerRemainingMs: Math.max(0, s.timerEndMs - Date.now()) };
    });

  const resumeTimer = () =>
    setState(s => {
      if (s.timerRunning || s.timerRemainingMs === null) return s;
      return { ...s, timerRunning: true, timerEndMs: Date.now() + s.timerRemainingMs, timerRemainingMs: null };
    });

  const adjustTimer = (deltaSeconds: number) =>
    setState(s => {
      if (s.timerRunning && s.timerEndMs !== null)
        return { ...s, timerEndMs: s.timerEndMs + deltaSeconds * 1000 };
      if (!s.timerRunning && s.timerRemainingMs !== null)
        return { ...s, timerRemainingMs: Math.max(0, s.timerRemainingMs + deltaSeconds * 1000) };
      return s;
    });

  const setFinished = () =>
    setState(s => ({ ...s, phase: 'finished', timerRunning: false, timerEndMs: null, timerRemainingMs: null }));

  const setPreTournament = () =>
    setState(s => ({ ...s, phase: 'pre-tournament', timerRunning: false, timerEndMs: null, timerRemainingMs: null, currentRound: 0 }));

  const resetAll = () => setState(() => getDefault());

  return {
    state,
    updateTitle,
    updateNumTables,
    updatePreGame,
    updateLunchBreak,
    updateShortBreak,
    updateAnnouncementText,
    updateTable,
    updateBattleplan,
    startPreGame,
    startRound,
    startBreak,
    pauseTimer,
    resumeTimer,
    adjustTimer,
    setFinished,
    setPreTournament,
    resetAll,
  };
}
