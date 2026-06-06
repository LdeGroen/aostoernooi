import { useState, useCallback, useEffect, useRef } from 'react';
import type { TournamentState, RoundConfig, Player } from './types';

const STORAGE_KEY = 'aostoernooi-state';
const CHANNEL_NAME = 'aostoernooi-sync';

function newId(): string {
  return (crypto.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

function tablesForPlayers(count: number): number {
  return Math.ceil(count / 2);
}

function emptyTables(numTables: number): RoundConfig['tables'] {
  return Array.from({ length: numTables }, (_, i) => ({
    tableNumber: i + 1,
    player1Id: null,
    player2Id: null,
  }));
}

function defaultRound(numTables: number): RoundConfig {
  return { battleplan: null, tables: emptyTables(numTables) };
}

function getDefault(totalRounds = 3): TournamentState {
  return {
    title: 'Gelderland Invitational II',
    logoDataUrl: null,
    players: [],
    numTables: 0,
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
    rounds: Array.from({ length: totalRounds }, () => defaultRound(0)),
  };
}

type LegacyTable = { player1?: string; player2?: string };
type LegacyRound = { battleplan?: number | null; tables?: LegacyTable[] };

// Migrate a legacy state where table slots stored player names as strings
// (player1/player2) into the roster + id model.
function migrate(parsed: unknown): TournamentState {
  const base = getDefault();
  const raw = (parsed ?? {}) as Record<string, unknown>;
  const merged = { ...base, ...raw } as TournamentState;

  if (Array.isArray(raw.players) && raw.players.length > 0) {
    // Already in new format.
    return merged;
  }

  // Build roster from unique non-empty names across all rounds.
  const nameToId = new Map<string, string>();
  const players: Player[] = [];
  const getId = (name: string): string | null => {
    const key = name.trim();
    if (!key) return null;
    let id = nameToId.get(key.toLowerCase());
    if (!id) {
      id = newId();
      nameToId.set(key.toLowerCase(), id);
      players.push({ id, name: key });
    }
    return id;
  };

  const legacyRounds = (raw.rounds as LegacyRound[] | undefined) ?? [];
  // First pass: register all names so the roster is complete.
  legacyRounds.forEach(r => (r.tables ?? []).forEach(t => {
    getId(String(t.player1 ?? ''));
    getId(String(t.player2 ?? ''));
  }));

  const numTables = tablesForPlayers(players.length);
  const sourceRounds = legacyRounds.length > 0 ? legacyRounds : base.rounds.map(() => ({} as LegacyRound));
  const rounds: RoundConfig[] = sourceRounds.map(r => {
    const legacyTables = r.tables ?? [];
    return {
      battleplan: r.battleplan ?? null,
      tables: Array.from({ length: numTables }, (_, i) => ({
        tableNumber: i + 1,
        player1Id: getId(String(legacyTables[i]?.player1 ?? '')),
        player2Id: getId(String(legacyTables[i]?.player2 ?? '')),
      })),
    };
  });

  return { ...merged, players, numTables, rounds };
}

function load(): TournamentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
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

  const updateLogo = (logoDataUrl: string | null) => setState(s => ({ ...s, logoDataUrl }));

  // Resize every round's table list to match the player count (ceil/2),
  // preserving existing assignments where they still fit.
  const resizeTables = (s: TournamentState, players: Player[]): TournamentState => {
    const numTables = tablesForPlayers(players.length);
    const valid = new Set(players.map(p => p.id));
    const keep = (id: string | null) => (id && valid.has(id) ? id : null);
    return {
      ...s,
      players,
      numTables,
      rounds: s.rounds.map(r => ({
        ...r,
        tables: Array.from({ length: numTables }, (_, i) => ({
          tableNumber: i + 1,
          player1Id: keep(r.tables[i]?.player1Id ?? null),
          player2Id: keep(r.tables[i]?.player2Id ?? null),
        })),
      })),
    };
  };

  const addPlayer = (name: string) =>
    setState(s => resizeTables(s, [...s.players, { id: newId(), name: name.trim() }]));

  const updatePlayerName = (id: string, name: string) =>
    setState(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, name } : p) }));

  const removePlayer = (id: string) =>
    setState(s => resizeTables(s, s.players.filter(p => p.id !== id)));

  // Place a player in a slot, removing them from any other slot in that round
  // (a player can only sit at one table per round).
  const assignSlot = (roundIndex: number, tableIndex: number, slot: 'player1Id' | 'player2Id', playerId: string) =>
    setState(s => ({
      ...s,
      rounds: s.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        return {
          ...r,
          tables: r.tables.map((t, ti) => {
            // Remove the player from wherever they currently sit this round.
            const cleared = {
              ...t,
              player1Id: t.player1Id === playerId ? null : t.player1Id,
              player2Id: t.player2Id === playerId ? null : t.player2Id,
            };
            if (ti !== tableIndex) return cleared;
            return { ...cleared, [slot]: playerId };
          }),
        };
      }),
    }));

  const clearSlot = (roundIndex: number, tableIndex: number, slot: 'player1Id' | 'player2Id') =>
    setState(s => ({
      ...s,
      rounds: s.rounds.map((r, ri) => ri !== roundIndex ? r : {
        ...r,
        tables: r.tables.map((t, ti) => ti !== tableIndex ? t : { ...t, [slot]: null }),
      }),
    }));

  // Swap the occupants of two slots within a round.
  const swapSlots = (
    roundIndex: number,
    a: { tableIndex: number; slot: 'player1Id' | 'player2Id' },
    b: { tableIndex: number; slot: 'player1Id' | 'player2Id' },
  ) =>
    setState(s => ({
      ...s,
      rounds: s.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        const valA = r.tables[a.tableIndex]?.[a.slot] ?? null;
        const valB = r.tables[b.tableIndex]?.[b.slot] ?? null;
        return {
          ...r,
          tables: r.tables.map((t, ti) => {
            let nt = t;
            if (ti === a.tableIndex) nt = { ...nt, [a.slot]: valB };
            if (ti === b.tableIndex) nt = { ...nt, [b.slot]: valA };
            return nt;
          }),
        };
      }),
    }));

  const updatePreGame = (preGameDurationMinutes: number) =>
    setState(s => ({ ...s, preGameDurationMinutes }));

  const updateLunchBreak = (lunchBreakMinutes: number) =>
    setState(s => ({ ...s, lunchBreakMinutes }));

  const updateShortBreak = (shortBreakMinutes: number) =>
    setState(s => ({ ...s, shortBreakMinutes }));

  const updateAnnouncementText = (announcementText: string) =>
    setState(s => ({ ...s, announcementText }));

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
    updateLogo,
    addPlayer,
    updatePlayerName,
    removePlayer,
    assignSlot,
    clearSlot,
    swapSlots,
    updatePreGame,
    updateLunchBreak,
    updateShortBreak,
    updateAnnouncementText,
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
