export interface TableAssignment {
  tableNumber: number;
  player1: string;
  player2: string;
}

export type TournamentPhase =
  | 'pre-tournament'
  | 'round-active'
  | 'break'
  | 'finished';

export interface RoundConfig {
  battleplan: number | null; // 1-12
  tables: TableAssignment[];
}

export interface TournamentState {
  title: string;
  numTables: number;
  totalRounds: number;
  roundDurationMinutes: number;
  breakDurationMinutes: number;

  phase: TournamentPhase;
  currentRound: number; // 1-based, 0 = not started

  // Timer state
  timerRunning: boolean;
  timerEndMs: number | null;      // wall-clock ms when the current countdown hits 0
  timerRemainingMs: number | null; // used when paused

  rounds: RoundConfig[];
}

export const ROUND_PHASES = [
  { minRemaining: 170, label: 'Pre-game discussies & beslissingen' },
  { minRemaining: 110, label: 'Deployment' },
  { minRemaining: 70,  label: 'Gevechtsronde 1' },
  { minRemaining: 40,  label: 'Gevechtsronde 2' },
  { minRemaining: 20,  label: 'Gevechtsronde 3' },
  { minRemaining: 10,  label: 'Gevechtsronde 4' },
  { minRemaining: 0,   label: 'Gevechtsronde 5 — vraag toestemming aan judge voor nieuwe BR' },
] as const;
