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
import { ARTIFACTS, artifactBonusPercent } from './artifactSystem';
import { RARITY_LABEL } from './collectionWorld';

export type ChallengeChestReward = { id: string; title: string; tier: RewardChestTier };
export type RewardSummary = {
  coins: number; xp: number; newBest: boolean; best: number; challenges: string[];
  challengeChests: ChallengeChestReward[]; reduced: boolean;
  dailyXp: number; dailyXpCap: number; dailyCoins: number; dailyCoinCap: number;
  taskProgress: number; taskTarget: number; taskPointsEarned: number;
};
type Props = {
  id: GameId; name: string; rules: string; best: number; difficulty?: number; extras?: string[];
  sound: SoundFn;
  /** Checks/deducts energy. Returns false if the round may not start. */
  onRequestStart: () => boolean;
  /** Must grant rewards exactly once per session id. */
  onComplete: (game: GameId, sessionId: string, result: GameResult) => Promise<RewardSummary>;
  onOpenChest: (tier: RewardChestTier) => ChestOpenReward | null;
  onExit: () => void;
};

export function GameStage({ id, name, rules, best, difficulty, extras, sound, onRequestStart, onComplete, onOpenChest, onExit }: Props) {
  const [phase, setPhase] = useState<'loading' | 'intro' | 'playing' | 'rewarding' | 'done'>('loading');
  const [session, setSession] = useState('');
  const [result, setResult] = useState<{ r: GameResult; reward: RewardSummary | null; sessionId: string } | null>(null);
  const [submitError, setSubmitError] = useState(false);
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
    setSession(crypto.randomUUID());
    setPhase('playing'); sound(430);
  };
  const submitResult = useCallback(async (sid: string, r: GameResult) => {
    setSubmitError(false);
    setPhase('rewarding');
    try {
      const reward = await completeRef.current(id, sid, r);
      setResult({ r, reward, sessionId: sid });
      setPhase('done');
    } catch {
      setResult({ r, reward: null, sessionId: sid });
      setSubmitError(true);
      setPhase('done');
    }
  }, [id]);
  const handleEnd = useCallback((r: GameResult) => {
    const sid = sessionRef.current;
    if (!sid || finished.current.has(sid)) return;
    finished.current.add(sid);
    void submitResult(sid, r);
  }, [submitResult]);
  const pendingChest = result?.reward?.challengeChests.find((chest) => !openedChests[chest.id]);
  const openNextChest = () => {
    if (!pendingChest) return;
    const reward = onOpenChest(pendingChest.tier);
    if (reward) setOpenedChests((current) => ({ ...current, [pendingChest.id]: reward }));
  };

  const common = { onEnd: handleEnd, sound, difficulty, extras };
  return <section className={`game-screen stage-${id}`} data-testid="game-board">
    <div className="game-top"><button className="button small ghost" onClick={onExit} disabled={phase === 'rewarding'} data-testid="button-exit-game"><ChevronLeft size={15}/> Zurück</button><span className="eyebrow">{name}</span><span className="stat-pill"><Trophy size={14}/>{best}</span></div>
    <div className="stage-body">
      {phase === 'loading' && <div className="stage-skeleton" data-testid="status-loading"><div/><div/><div/></div>}
      {phase === 'rewarding' && <div className="stage-skeleton" role="status" data-testid="status-saving-game-reward"><div/><div/><div/><p>Belohnung wird sicher gespeichert …</p></div>}
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
          <img src={result.reward?.newBest ? CHARACTER.excited : CHARACTER.happy} alt="" className="result-pet"/>
          <div className="eyebrow">{result.reward?.newBest ? 'NEUER BESTWERT' : 'RUNDENENDE'}</div>
          <div className="score-big" data-testid="text-final-score">{result.r.score}</div>
          {result.reward
            ? <><div className="result-rewards"><span><Coins size={14}/> +{result.reward.coins}</span><span><Star size={14}/> +{result.reward.xp} XP</span></div>
              {result.reward.reduced && <p className="subline">Viele Runden heute: Grundbelohnung halbiert.</p>}
              <p className="subline">Tageslimit: {result.reward.dailyXp}/{result.reward.dailyXpCap} XP · {result.reward.dailyCoins}/{result.reward.dailyCoinCap} Coins · Tagesaufgabe {result.reward.taskProgress}/{result.reward.taskTarget}</p></>
            : <p className="subline" role="alert">{submitError ? 'Die Belohnung konnte nicht gespeichert werden. Bitte versuche es erneut.' : 'Die Belohnung wartet auf die Cloud.'}</p>}
          {result.reward?.challengeChests.map((chest) => {
            const opened = openedChests[chest.id];
            return <div key={chest.id} className={`challenge-pop ${opened ? 'opened' : ''}`}>
              <span>Herausforderung geschafft: {chest.title}</span>
              <div className="challenge-chest-reward">
                <RewardChestArt tier={chest.tier} open={Boolean(opened)}/>
                {opened?.collectionItem && <img className="challenge-loot-art" src={assetUrl(`collections/items/${opened.collectionItem.id}.png`)} alt="" />}
                {opened && !opened.collectionItem && itemById(opened.itemId) && hasMaterialArt(itemById(opened.itemId)!) && <MaterialArt item={itemById(opened.itemId)!} size={30}/>}
                <span>{opened
                  ? opened.isDuplicate
                    ? `Bereits entdeckt · +${opened.duplicateDust} Artefaktstaub${opened.epicEssence ? ` · +${opened.epicEssence} Epische Essenz` : ''}${opened.legendaryEssence ? ` · +${opened.legendaryEssence} Legendäre Essenz` : ''} · +${opened.coins} Münzen`
                    : `${opened.itemName}${opened.quantity > 1 ? ` ×${opened.quantity}` : ''} · +${opened.coins} Münzen`
                  : `Belohnung: ${CHEST_DEFINITIONS[chest.tier].label}`}</span>
              </div>
              {opened?.collectionItem && <small className="challenge-artifact-detail">
                {opened.isCollectionFind ? `Neues Artefakt · Stufe 1 · ${RARITY_LABEL[opened.rarity]}` : `Duplikat · ${RARITY_LABEL[opened.rarity]}`}
                {(() => {
                  const artifact = ARTIFACTS.find((entry) => entry.id === opened.collectionItem?.id);
                  return artifact ? ` · +${artifactBonusPercent(artifact, 1)}% ${artifact.effect.label}` : '';
                })()}
              </small>}
            </div>;
          })}
          {result.reward?.challenges.filter((title) => !result.reward!.challengeChests.some((chest) => chest.title === title)).map((title) => <p key={title} className="challenge-pop">Herausforderung geschafft: {title}</p>)}
        </div>
        <div className="dialog-actions result-actions">
          {pendingChest && <button className="button orange" onClick={openNextChest} data-testid="button-open-earned-chest"><Sparkles size={15}/> Kiste öffnen</button>}
          <button className="button" onClick={onExit} data-testid="button-games-done">Spielauswahl</button>
          {result.reward
            ? <button className="button ghost" onClick={start} data-testid="button-replay"><RotateCcw size={15}/> Nochmal</button>
            : <button className="button orange" onClick={() => void submitResult(result.sessionId, result.r)} data-testid="button-retry-game-reward"><RotateCcw size={15}/> Belohnung erneut senden</button>}
        </div>
      </div></div>}
    </div>
  </section>;
}
