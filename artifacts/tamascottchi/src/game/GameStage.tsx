import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Coins, Play, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { assetUrl, CHARACTER, GAME_SPRITES, preloadAll } from './assets';
import { itemById, type RewardChestTier } from './data';
import type { GameId, GameResult, SoundFn } from './engine';
import { CatchGame } from './games/CatchGame';
import { CupsGame } from './games/CupsGame';
import { MemoryGame } from './games/MemoryGame';
import { RunGame } from './games/RunGame';
import { TurboGame } from './games/TurboGame';
import { RewardChestArt } from './RewardChestArt';
import { CHEST_DEFINITIONS, type ChestOpenReward } from './rewardChests';
import { hasMaterialArt, MaterialArt } from './MaterialArt';

export type ChallengeChestReward = { id: string; title: string; tier: RewardChestTier };
export type RewardSummary = { coins: number; xp: number; newBest: boolean; best: number; challenges: string[]; challengeChests: ChallengeChestReward[]; reduced: boolean };
type Props = {
  id: GameId; name: string; rules: string; best: number; difficulty?: number; extras?: string[];
  sound: SoundFn;
  /** Checks/deducts energy. Returns false if the round may not start. */
  onRequestStart: () => boolean;
  /** Must grant rewards exactly once per session id. */
  onComplete: (sessionId: string, result: GameResult) => RewardSummary;
  onOpenChest: (tier: RewardChestTier) => ChestOpenReward | null;
  onExit: () => void;
};

export function GameStage({ id, name, rules, best, difficulty, extras, sound, onRequestStart, onComplete, onOpenChest, onExit }: Props) {
  const [phase, setPhase] = useState<'loading' | 'intro' | 'playing' | 'done'>('loading');
  const [session, setSession] = useState('');
  const [result, setResult] = useState<{ r: GameResult; reward: RewardSummary } | null>(null);
  const [openedChests, setOpenedChests] = useState<Record<string, ChestOpenReward>>({});
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
    setOpenedChests({});
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
  const pendingChest = result?.reward.challengeChests.find((chest) => !openedChests[chest.id]);
  const openNextChest = () => {
    if (!pendingChest) return;
    const reward = onOpenChest(pendingChest.tier);
    if (reward) setOpenedChests((current) => ({ ...current, [pendingChest.id]: reward }));
  };

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
        <div className="result-scroll">
          <img src={result.reward.newBest ? CHARACTER.excited : CHARACTER.happy} alt="" className="result-pet"/>
          <div className="eyebrow">{result.reward.newBest ? 'NEUER BESTWERT' : 'RUNDENENDE'}</div>
          <div className="score-big" data-testid="text-final-score">{result.r.score}</div>
          <div className="result-rewards"><span><Coins size={14}/> +{result.reward.coins}</span><span><Star size={14}/> +{result.reward.xp} XP</span></div>
          {result.reward.reduced && <p className="subline">Viele Runden heute: Belohnung halbiert.</p>}
          {result.reward.challengeChests.map((chest) => {
            const opened = openedChests[chest.id];
            return <div key={chest.id} className={`challenge-pop ${opened ? 'opened' : ''}`}>
              <span>Herausforderung geschafft: {chest.title}</span>
              <div className="challenge-chest-reward">
                <RewardChestArt tier={chest.tier} open={Boolean(opened)}/>
                {opened?.isCollectionFind && <img className="challenge-loot-art" src={assetUrl(`collections/items/${opened.itemId}.png`)} alt="" />}
                {opened && !opened.isCollectionFind && itemById(opened.itemId) && hasMaterialArt(itemById(opened.itemId)!) && <MaterialArt item={itemById(opened.itemId)!} size={30}/>}
                <span>{opened ? `${opened.itemName}${opened.quantity > 1 ? ` ×${opened.quantity}` : ''} · +${opened.coins} Münzen` : `Belohnung: ${CHEST_DEFINITIONS[chest.tier].label}`}</span>
              </div>
            </div>;
          })}
          {result.reward.challenges.filter((title) => !result.reward.challengeChests.some((chest) => chest.title === title)).map((title) => <p key={title} className="challenge-pop">Herausforderung geschafft: {title}</p>)}
        </div>
        <div className="dialog-actions result-actions">
          {pendingChest && <button className="button orange" onClick={openNextChest} data-testid="button-open-earned-chest"><Sparkles size={15}/> Kiste öffnen</button>}
          <button className="button" onClick={onExit} data-testid="button-games-done">Spielauswahl</button>
          <button className="button ghost" onClick={start} data-testid="button-replay"><RotateCcw size={15}/> Nochmal</button>
        </div>
      </div></div>}
    </div>
  </section>;
}
