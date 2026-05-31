import { useState } from 'react';
import type { TournamentState, Player } from './types';
import { BATTLEPLANS } from './types';
import { useCountdown, formatTime } from './useCountdown';

type Slot = 'player1Id' | 'player2Id';
interface DragPayload {
  playerId: string;
  from: 'pool' | { tableIndex: number; slot: Slot };
}

const PASSWORD = 'GelderlandInvitational';
const BASE = import.meta.env.BASE_URL;

interface Props {
  state: TournamentState;
  updateTitle: (t: string) => void;
  addPlayer: (name: string) => void;
  updatePlayerName: (id: string, name: string) => void;
  removePlayer: (id: string) => void;
  assignSlot: (ri: number, ti: number, slot: Slot, playerId: string) => void;
  clearSlot: (ri: number, ti: number, slot: Slot) => void;
  swapSlots: (ri: number, a: { tableIndex: number; slot: Slot }, b: { tableIndex: number; slot: Slot }) => void;
  updatePreGame: (n: number) => void;
  updateLunchBreak: (n: number) => void;
  updateShortBreak: (n: number) => void;
  updateAnnouncementText: (t: string) => void;
  updateBattleplan: (ri: number, bp: number | null) => void;
  startPreGame: () => void;
  startRound: (r: number) => void;
  startBreak: (type: 'lunch' | 'short') => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  adjustTimer: (ds: number) => void;
  setFinished: () => void;
  setPreTournament: () => void;
  resetAll: () => void;
}

function Btn({ onClick, children, variant = 'default', disabled = false, className = '' }: {
  onClick: () => void; children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'ghost';
  disabled?: boolean; className?: string;
}) {
  const base = 'rounded-lg px-3 py-2 text-sm font-medium transition-colors border';
  const variants = {
    default:  'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400',
    primary:  'bg-blue-700 border-blue-700 text-white hover:bg-blue-800',
    danger:   'bg-red-50 border-red-300 text-red-700 hover:bg-red-100',
    success:  'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
    ghost:    'bg-transparent border-transparent text-gray-500 hover:bg-gray-100',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700 text-sm tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NumInput({ label, value, onChange, min = 1 }: {
  label: string; value: number; onChange: (n: number) => void; min?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
      />
    </label>
  );
}

function setDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}
function getDrag(e: React.DragEvent): DragPayload | null {
  try { return JSON.parse(e.dataTransfer.getData('application/json')) as DragPayload; }
  catch { return null; }
}

function PlayerChip({ name, draggable, onDragStart, onRemove, muted = false }: {
  name: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onRemove?: () => void;
  muted?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm select-none ${
        muted
          ? 'bg-gray-50 border-gray-200 text-gray-400'
          : 'bg-white border-gray-300 text-gray-800 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400'
      }`}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 leading-none text-base shrink-0"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

function SlotBox({ name, empty, onDrop, onDragStart, onClear }: {
  name: string;
  empty: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onClear?: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(e); }}
      className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
        over ? 'border-blue-500 bg-blue-50'
        : empty ? 'border-dashed border-gray-300 bg-gray-50'
        : 'border-gray-300 bg-white'
      }`}
    >
      {empty ? (
        <span className="text-gray-300">Drop player…</span>
      ) : (
        <div
          draggable
          onDragStart={onDragStart}
          className="flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing"
        >
          <span className="truncate text-gray-800">{name}</span>
          {onClear && (
            <button onClick={onClear} className="text-gray-300 hover:text-red-500 leading-none text-base shrink-0" title="Unassign">×</button>
          )}
        </div>
      )}
    </div>
  );
}

function RoundEditor({ state, roundIndex, assignSlot, clearSlot, swapSlots, updateBattleplan }: {
  state: TournamentState;
  roundIndex: number;
  assignSlot: Props['assignSlot'];
  clearSlot: Props['clearSlot'];
  swapSlots: Props['swapSlots'];
  updateBattleplan: Props['updateBattleplan'];
}) {
  const round = state.rounds[roundIndex];
  if (!round) return null;

  const nameOf = (id: string | null) => state.players.find(p => p.id === id)?.name ?? '';

  const assignedIds = new Set<string>();
  round.tables.forEach(t => { if (t.player1Id) assignedIds.add(t.player1Id); if (t.player2Id) assignedIds.add(t.player2Id); });
  const available = state.players.filter(p => !assignedIds.has(p.id));

  const handleDropOnSlot = (tableIndex: number, slot: Slot) => (e: React.DragEvent) => {
    const d = getDrag(e);
    if (!d) return;
    if (typeof d.from === 'object') {
      swapSlots(roundIndex, d.from, { tableIndex, slot });
    } else {
      assignSlot(roundIndex, tableIndex, slot, d.playerId);
    }
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    const d = getDrag(e);
    if (d && typeof d.from === 'object') clearSlot(roundIndex, d.from.tableIndex, d.from.slot);
  };

  return (
    <div className="space-y-4">
      {/* Battleplan picker */}
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Battleplan</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => updateBattleplan(roundIndex, null)}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
              round.battleplan === null
                ? 'bg-blue-700 border-blue-700 text-white'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            None
          </button>
          {Object.entries(BATTLEPLANS).map(([num, name]) => (
            <button
              key={num}
              onClick={() => updateBattleplan(roundIndex, Number(num))}
              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors text-left ${
                round.battleplan === Number(num)
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
              }`}
            >
              <span className="opacity-60 mr-1">{num}.</span>{name}
            </button>
          ))}
        </div>

        {round.battleplan && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={`${BASE}battleplan${round.battleplan}.png`}
              alt="preview"
              className="h-28 rounded border border-gray-200 object-contain"
            />
            <span className="text-sm text-gray-600 font-medium">{BATTLEPLANS[round.battleplan]}</span>
          </div>
        )}
      </div>

      {/* Available players pool */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleDropOnPool(e); }}
      >
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
          Available players — drag onto a table ({available.length})
        </p>
        <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2">
          {state.players.length === 0 && (
            <span className="text-gray-400 text-sm">Add players in the Players section above.</span>
          )}
          {state.players.length > 0 && available.length === 0 && (
            <span className="text-gray-400 text-sm">All players are seated.</span>
          )}
          {available.map(p => (
            <PlayerChip
              key={p.id}
              name={p.name || '(no name)'}
              draggable
              onDragStart={e => setDrag(e, { playerId: p.id, from: 'pool' })}
            />
          ))}
        </div>
      </div>

      {/* Tables */}
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Tables</p>
        {round.tables.length === 0 ? (
          <p className="text-gray-400 text-sm">Tables appear automatically as you add players.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {round.tables.map((t, ti) => (
              <div key={t.tableNumber} className="flex items-center gap-2">
                <span className="text-blue-700 font-bold font-cinzel text-sm w-6 text-center shrink-0">
                  {t.tableNumber}
                </span>
                <SlotBox
                  empty={!t.player1Id}
                  name={nameOf(t.player1Id) || '(no name)'}
                  onDrop={handleDropOnSlot(ti, 'player1Id')}
                  onDragStart={e => t.player1Id && setDrag(e, { playerId: t.player1Id, from: { tableIndex: ti, slot: 'player1Id' } })}
                  onClear={() => clearSlot(roundIndex, ti, 'player1Id')}
                />
                <span className="text-gray-400 text-xs font-medium shrink-0">vs</span>
                <SlotBox
                  empty={!t.player2Id}
                  name={nameOf(t.player2Id) || '(no name)'}
                  onDrop={handleDropOnSlot(ti, 'player2Id')}
                  onDragStart={e => t.player2Id && setDrag(e, { playerId: t.player2Id, from: { tableIndex: ti, slot: 'player2Id' } })}
                  onClear={() => clearSlot(roundIndex, ti, 'player2Id')}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayersCard({ players, addPlayer, updatePlayerName, removePlayer }: {
  players: Player[];
  addPlayer: Props['addPlayer'];
  updatePlayerName: Props['updatePlayerName'];
  removePlayer: Props['removePlayer'];
}) {
  const [newName, setNewName] = useState('');
  const add = () => {
    const n = newName.trim();
    if (!n) return;
    addPlayer(n);
    setNewName('');
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Player name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Btn onClick={add} variant="primary">+ Add player</Btn>
      </div>
      {players.length === 0 ? (
        <p className="text-gray-400 text-sm">No players yet. Add players, then drag them onto tables per round.</p>
      ) : (
        <>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">
            {players.length} players → {Math.ceil(players.length / 2)} tables
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <input
                  value={p.name}
                  onChange={e => updatePlayerName(p.id, e.target.value)}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removePlayer(p.id)}
                  className="text-gray-300 hover:text-red-500 leading-none text-lg px-1 shrink-0"
                  title="Remove player"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPanel(props: Props) {
  const { state } = props;
  const [authenticated, setAuthenticated] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const remainingMs = useCountdown(state);

  const phaseLabel = {
    'pre-tournament': 'Waiting',
    'pre-game': 'Pre-game',
    'round-active': `Round ${state.currentRound}`,
    'break': state.currentRound === 1 ? 'Lunch Break' : 'Short Break',
    'finished': 'Finished',
  }[state.phase];

  const tryLogin = () => {
    if (pw === PASSWORD) setAuthenticated(true);
    else setPwError(true);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-80">
          <h1 className="font-cinzel text-gray-900 text-xl font-bold text-center mb-1">Admin Panel</h1>
          <p className="text-gray-400 text-sm text-center mb-6">Enter the password to continue</p>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            placeholder="Password"
            autoFocus
          />
          {pwError && <p className="text-red-500 text-xs mb-2 text-center">Incorrect password</p>}
          <button
            onClick={tryLogin}
            className="w-full bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-800 transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-blue-800" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-cinzel text-gray-900 text-lg font-bold">Admin Panel</h1>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            {phaseLabel}
          </span>
        </div>
        {(state.timerRunning || state.timerRemainingMs !== null) && (
          <div className="font-mono text-2xl font-bold text-gray-800 tabular-nums">
            {formatTime(remainingMs)}
            <span className="ml-2 text-xs font-normal text-gray-400">remaining</span>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* === FLOW CONTROLS === */}
        <Card title="Tournament Flow">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={props.startPreGame} variant={state.phase === 'pre-game' ? 'primary' : 'default'}>
                ▶ Start Pre-game Countdown
              </Btn>
              {Array.from({ length: state.totalRounds }, (_, i) => i + 1).map(r => (
                <Btn
                  key={r}
                  onClick={() => props.startRound(r)}
                  variant={state.phase === 'round-active' && state.currentRound === r ? 'primary' : 'default'}
                >
                  ▶ Start Round {r}
                </Btn>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => props.startBreak('lunch')}
                variant={state.phase === 'break' && state.currentRound === 1 ? 'primary' : 'default'}>
                ☕ Lunch Break
              </Btn>
              <Btn onClick={() => props.startBreak('short')}
                variant={state.phase === 'break' && state.currentRound === 2 ? 'primary' : 'default'}>
                ⏸ Short Break
              </Btn>
              <Btn onClick={props.setFinished}
                variant={state.phase === 'finished' ? 'primary' : 'default'}>
                🏁 Finished
              </Btn>
              <Btn onClick={props.setPreTournament}>↩ Reset to Start</Btn>
            </div>
          </div>
        </Card>

        {/* === TIMER CONTROLS === */}
        <Card title="Timer Controls">
          <div className="flex flex-wrap gap-2 items-center">
            {state.timerRunning ? (
              <Btn onClick={props.pauseTimer} variant="danger">⏸ Pause Timer</Btn>
            ) : (
              <Btn onClick={props.resumeTimer} variant="success"
                disabled={state.timerRemainingMs === null && state.timerEndMs === null}>
                ▶ Resume Timer
              </Btn>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <Btn onClick={() => props.adjustTimer(-60)}>− 1 min</Btn>
            <Btn onClick={() => props.adjustTimer(60)}>+ 1 min</Btn>
            <Btn onClick={() => props.adjustTimer(-300)}>− 5 min</Btn>
            <Btn onClick={() => props.adjustTimer(300)}>+ 5 min</Btn>
          </div>
        </Card>

        {/* === SETTINGS === */}
        <Card title="Settings">
          <div className="space-y-4">
            <div>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Tournament Title</span>
                <input
                  type="text"
                  value={state.title}
                  onChange={e => props.updateTitle(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Pre-game (min)" value={state.preGameDurationMinutes} onChange={props.updatePreGame} />
              <NumInput label="Lunch Break (min)" value={state.lunchBreakMinutes} onChange={props.updateLunchBreak} />
              <NumInput label="Short Break (min)" value={state.shortBreakMinutes} onChange={props.updateShortBreak} />
            </div>
          </div>
        </Card>

        {/* === PLAYERS === */}
        <Card title="Players">
          <PlayersCard
            players={state.players}
            addPlayer={props.addPlayer}
            updatePlayerName={props.updatePlayerName}
            removePlayer={props.removePlayer}
          />
        </Card>

        {/* === ANNOUNCEMENT === */}
        <Card title="Announcement Screen (shown after tournament ends)">
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Announcement Text</span>
            <textarea
              value={state.announcementText}
              onChange={e => props.updateAnnouncementText(e.target.value)}
              rows={4}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Text shown on the big screen after the tournament..."
            />
          </label>
        </Card>

        {/* === ROUND TABS === */}
        <Card title="Rounds — Tables & Battleplan">
          <div className="flex gap-1 mb-4">
            {state.rounds.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Round {i + 1}
              </button>
            ))}
          </div>
          <RoundEditor
            state={state}
            roundIndex={activeTab}
            assignSlot={props.assignSlot}
            clearSlot={props.clearSlot}
            swapSlots={props.swapSlots}
            updateBattleplan={props.updateBattleplan}
          />
        </Card>

        {/* === DANGER === */}
        <Card title="Danger Zone">
          <Btn
            variant="danger"
            onClick={() => { if (confirm('Reset all data? This cannot be undone.')) props.resetAll(); }}
          >
            Reset all data
          </Btn>
        </Card>
      </div>
    </div>
  );
}
