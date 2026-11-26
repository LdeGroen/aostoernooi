export interface Player {
  id: string;
  name: string;
}

export interface TableAssignment {
  tableNumber: number;
  player1Id: string | null;
  player2Id: string | null;
}

export type TournamentPhase =
  | 'pre-tournament'
  | 'pre-game'       // countdown before round 1
  | 'round-active'
  | 'break'
  | 'finished';

export interface RoundConfig {
  battleplan: number | null; // 1-12
  tables: TableAssignment[];
}

export interface TournamentState {
  title: string;
  logoDataUrl: string | null;
  players: Player[];
  numTables: number;
  totalRounds: number;
  roundDurationMinutes: number;

  // Break durations (minutes)
  preGameDurationMinutes: number;   // countdown shown before round 1
  lunchBreakMinutes: number;        // break between round 1 and 2
  shortBreakMinutes: number;        // break between round 2 and 3

  // Announcement text shown after tournament ends
  announcementText: string;

  phase: TournamentPhase;
  currentRound: number; // 1-based, 0 = not started

  // Timer
  timerRunning: boolean;
  timerEndMs: number | null;
  timerRemainingMs: number | null;

  rounds: RoundConfig[];
}

// AoS General's Handbook 2026-27 battleplans (afbeeldingen: public/battleplan<n>.jpg)
export const BATTLEPLANS: Record<number, string> = {
  1:  'Into the Fire',
  2:  'Bloodstained Coasts',
  3:  'Avalanche of Ash',
  4:  'Caverns of Slaughter',
  5:  "What's Yours is Ours",
  6:  'Hidden Under Ash-Clouds',
  7:  'Warped Ruins',
  8:  'Curse of the Gnaw',
  9:  'Seize the Embers',
  10: 'Treacherous Ground',
  11: 'Escape from the Coast',
  12: 'Power of the Realms',
};

// Time remaining thresholds (in minutes) that mark phase transitions
// Round is 3h = 180 min; phases count DOWN
export const ROUND_PHASES = [
  { minRemaining: 170, label: 'Pre-game discussions & decisions' },
  { minRemaining: 150, label: 'Deployment' },
  { minRemaining: 110, label: 'Battle Round 1' },
  { minRemaining: 70,  label: 'Battle Round 2' },
  { minRemaining: 40,  label: 'Battle Round 3' },
  { minRemaining: 20,  label: 'Battle Round 4' },
  { minRemaining: 0,   label: 'Battle Round 5 — ask a judge before starting a new BR' },
] as const;
