import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Coins, Play, RotateCcw, Star, Trophy } from 'lucide-react';
import { CHARACTER, GAME_SPRITES, preloadAll } from './assets';
import type { GameId, GameResult, SoundFn } from './engine';
import { CatchGame } from './games/CatchGame';
import { CupsGame } from './games/CupsGame';
import { MemoryGame } from './games/MemoryGame';
import { RunGame } from './games/RunGame';
import { TurboGame } from './games/TurboGame';

export type RewardSummary = { coins: number; xp: number; newBest: boolean; best: number; challenges: string[]; reduced: boolean };
type Props = {
  id: GameId; name: string; rules: string; best: number; difficulty?: number; extras?: string[];
  sound: SoundFn;
  /** Checks/deducts energy. Returns false if the round may not start. */
  onRequestStart: () => boolean;
  /** Must grant rewards exactly once per session id. */
  onComplete: (sessionId: string, result: GameResult) => RewardSummary;
  onExit: () => void;
};

export function GameStage({ id, name, rules, best, difficulty, extras, sound, onRequestStart, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'loading' | 'intro' | 'playing' | 'done'>('loading');
  const [session, setSession] = useState('');
  const [result, setResult] = useState<{ r: GameResult; reward: RewardSummary } | null>(null);
  const finished = useRef<Set<string>>(new Set());
  const sessionRef = useRef(session); sessionRef.current = session;
  const completeRef = useRef(onComplete); completeRef.current = onComplete;

  useEffect(() => {
    let live = true;
    void preloadAll(GAME_SPRITES).then(() => { if (live) setPhase((p) => p === 'loading' ? 'intro' : p); });
    return () => { live = false; };
  }, []);

  // lock page scrolling and pull-to-refresh while a round runs
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const { body, documentElement: html } = document;
    const prev = [body.style.overflow, html.style.overscrollBehavior];
    body.style.overflow = 'hidden'; html.style.overscrollBehavior = 'none';
    return () => { body.style.overflow = prev[0]; html.style.overscrollBehavior = prev[1]; };
  }, [phase]);

  const start = () => {
    if (!onRequestStart()) return;
    setResult(null);
    setSession(`${id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    setPhase('playing'); sound(430);
  };
  const handleEnd = useCallback((r: GameResult) => {
    const sid = sessionRef.current;
    if (!sid || finished.current.has(sid)) return;
    finished.current.add(sid);
    const reward = completeRef.current(sid, r);
    setResult({ r, reward }); setPhase('done');
  }, []);

  const common = { onEnd: handleEnd, sound, difficulty, extras };
  return <section className={`game-screen stage-${id}`} data-testid="game-board">
    <div className="game-top"><button className="button small ghost" onClick={onExit} data-testid="button-exit-game"><ChevronLeft size={15}/> Zurück</button><span className="eyebrow">{name}</span><span className="stat-pill"><Trophy size={14}/>{best}</span></div>
    <div className="stage-body">
      {phase === 'loading' && <div className="stage-skeleton" data-testid="status-loading"><div/><div/><div/></div>}
      {phase === 'intro' && <div className="stage-intro"><img src={CHARACTER.happy} alt="" className="intro-pet"/><h2 className="panel-title">{name}</h2><p>{rules}</p><p className="eyebrow">BESTWERT {best} · KOSTET 8 ENERGIE</p><button className="button orange" onClick={start} data-testid="button-start-round"><Play size={15}/> Los geht's</button></div>}
      {phase === 'playing' && session && <div key={session}>
        {id === 'catch' && <CatchGame {...common}/>}
        {id === 'run' && <RunGame {...common}/>}
        {id === 'turbo' && <TurboGame {...common}/>}
        {id === 'bone' && <CupsGame {...common}/>}
        {id === 'memory' && <MemoryGame {...common}/>}
      </div>}
      {phase === 'done' && result && <div className="overlay-result" data-testid="game-result"><div className="result-card">
        <img src={result.reward.newBest ? CHARACTER.excited : CHARACTER.happy} alt="" className="result-pet"/>
        <div className="eyebrow">{result.reward.newBest ? 'NEUER BESTWERT' : 'RUNDENENDE'}</div>
        <div className="score-big" data-testid="text-final-score">{result.r.score}</div>
        <div className="result-rewards"><span><Coins size={14}/> +{result.reward.coins}</span><span><Star size={14}/> +{result.reward.xp} XP</span></div>
        {result.reward.reduced && <p className="subline">Viele Runden heute: Belohnung halbiert.</p>}
        {result.reward.challenges.map((c) => <p key={c} className="challenge-pop">Herausforderung geschafft: {c}</p>)}
        <div className="dialog-actions" style={{ justifyContent: 'center' }}>
          <button className="button orange" onClick={start} data-testid="button-replay"><RotateCcw size={15}/> Nochmal</button>
          <button className="button" onClick={onExit} data-testid="button-games-done">Spielauswahl</button>
        </div>
      </div></div>}
    </div>
  </section>;
}
