import { useState, useEffect } from 'react';
import type { TournamentState } from './types';

export function useCountdown(state: TournamentState): number {
  const [remainingMs, setRemainingMs] = useState<number>(
    state.timerRunning && state.timerEndMs
      ? Math.max(0, state.timerEndMs - Date.now())
      : (state.timerRemainingMs ?? 0)
  );

  useEffect(() => {
    if (!state.timerRunning) {
      setRemainingMs(state.timerRemainingMs ?? 0);
      return;
    }
    if (state.timerEndMs === null) return;

    const tick = () => setRemainingMs(Math.max(0, state.timerEndMs! - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.timerRunning, state.timerEndMs, state.timerRemainingMs]);

  return remainingMs;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
