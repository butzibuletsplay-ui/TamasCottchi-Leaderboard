import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Award, Bath, Check, ChevronLeft, Coins, Download, Dumbbell,
  Footprints, Gamepad2, Gift, Heart, Home, House, Medal, Moon, PawPrint, Play,
  Plus, RotateCcw, Settings, ShoppingBag, Sparkles, Star, Trophy,
  Utensils, Volume2, VolumeX, X, Zap,
} from 'lucide-react';
import Wuschel from '../../../attached_assets/EE81EE3F-4258-400F-B280-756A65D348D6_1794580180683.png';

type Room = 'Wohnzimmer' | 'Küche' | 'Bad' | 'Schlafzimmer' | 'Spielzimmer';
type NeedKey = 'hunger' | 'glueck' | 'energie' | 'sauberkeit';
type GameId = 'catch' | 'memory' | 'turbo' | 'bone' | 'run';
type GameRecord = { id: string; game: GameId; score: number; date: number };
type Item = { id: string; name: string; icon: string; price: number; type: 'food' | 'toy' | 'accessory' | 'room' | 'background'; effect?: NeedKey; amount?: number; unlockLevel?: number };
type DailyProgress = { feeds: number; games: number; baths: number; pets: number; coins: number };
type PetData = {
  version: number; name: string; needs: Record<NeedKey, number>; lastUpdated: number;
  coins: number; xp: number; inventory: Record<string, number>; owned: string[];
  equipped: string[]; room: Room; roomItems: string[]; activeBackground: string; records: GameRecord[];
  sleepUntil: number | null;
  stats: { games: number; catches: number; taps: number; care: number; rooms: number; purchases: number };
  daily: DailyProgress; missions: Record<string, boolean>; claimedAchievements: string[]; missionsDate: string;
  settings: { sound: boolean; music: boolean; volume: number; lampOn: boolean };
};
type GameState = { id: GameId; phase: 'intro' | 'playing' | 'done'; score: number; time: number; best?: number; message?: string };
type FallingItem = { id: number; x: number; y: number; good: boolean };
type PetAction = 'idle' | 'happy' | 'eating' | 'washing' | 'petting' | 'sleeping';

const STORE_KEY = 'tamascottchi-save-v1';
const ROOM_LIST: Room[] = ['Wohnzimmer', 'Küche', 'Bad', 'Schlafzimmer', 'Spielzimmer'];
const NEEDS: { id: NeedKey; name: string; icon: typeof Heart }[] = [
  { id: 'hunger', name: 'Sattheit', icon: Utensils }, { id: 'glueck', name: 'Laune', icon: Heart },
  { id: 'energie', name: 'Energie', icon: Zap }, { id: 'sauberkeit', name: 'Sauberkeit', icon: Sparkles },
];
const GAMES: { id: GameId; name: string; desc: string; icon: string }[] = [
  { id: 'catch', name: 'Snack Catch', desc: 'Schnapp dir die Snacks, bevor sie weg sind.', icon: '●' },
  { id: 'memory', name: 'Memory', desc: 'Finde alle Wuschel-Paare.', icon: '▦' },
  { id: 'turbo', name: 'Turbo Tap', desc: 'Wie viele Pfoten-Taps schaffst du?', icon: '↗' },
  { id: 'bone', name: 'Glücksknochen', desc: 'Erwisch den Knochen. Weiche dem Keks aus.', icon: '⌁' },
  { id: 'run', name: 'Wuschel Run', desc: 'Spring über die Hindernisse!', icon: '→' },
];
const ITEMS: Item[] = [
  { id: 'kibble', name: 'Hundekeks', icon: '▤', price: 5, type: 'food', effect: 'hunger', amount: 12 },
  { id: 'apple', name: 'Apfel', icon: '◉', price: 8, type: 'food', effect: 'hunger', amount: 16 },
  { id: 'chicken', name: 'Hähnchenkeule', icon: '⌁', price: 15, type: 'food', effect: 'hunger', amount: 28 },
  { id: 'burger', name: 'Burger', icon: '▰', price: 25, type: 'food', effect: 'hunger', amount: 40 },
  { id: 'special', name: 'Spezialmenü', icon: '✦', price: 50, type: 'food', effect: 'hunger', amount: 60 },
  { id: 'soap', name: 'Schaumbad', icon: '◌', price: 9, type: 'food', effect: 'sauberkeit', amount: 35 },
  { id: 'ball', name: 'Quietschball', icon: '●', price: 22, type: 'toy' },
  { id: 'bone-toy', name: 'Glücksknochen', icon: '⌁', price: 35, type: 'toy' },
  { id: 'bow', name: 'Rote Schleife', icon: '≋', price: 24, type: 'accessory' },
  { id: 'sunglasses', name: 'Sonnenbrille', icon: '◉', price: 36, type: 'accessory' },
  { id: 'scarf', name: 'Sternenschal', icon: '≋', price: 48, type: 'accessory' },
  { id: 'party-hat', name: 'Partyhut', icon: '△', price: 30, type: 'accessory' },
  { id: 'collar', name: 'Halsband', icon: '◉', price: 34, type: 'accessory' },
  { id: 'sleep-cap', name: 'Schlafmütze', icon: '⌂', price: 28, type: 'accessory' },
  { id: 'crown', name: 'Krönchen', icon: '♛', price: 75, type: 'accessory', unlockLevel: 3 },
  { id: 'plant', name: 'Fensterpflanze', icon: '♧', price: 30, type: 'room' },
  { id: 'lamp', name: 'Sonnenlampe', icon: '☼', price: 42, type: 'room', unlockLevel: 2 },
  { id: 'cushion', name: 'Knautschkissen', icon: '▰', price: 38, type: 'room', unlockLevel: 2 },
  { id: 'rug', name: 'Wolken-Teppich', icon: '▰', price: 35, type: 'room' },
  { id: 'plush', name: 'Kuschel-Freund', icon: '●', price: 32, type: 'room' },
  { id: 'poster', name: 'Wuschel-Poster', icon: '▤', price: 26, type: 'room' },
  { id: 'forest', name: 'Waldlichtung', icon: '♧', price: 44, type: 'background' },
  { id: 'beach', name: 'Sonniger Strand', icon: '≈', price: 54, type: 'background' },
  { id: 'night', name: 'Dunkles Zimmer', icon: '☾', price: 48, type: 'background', unlockLevel: 2 },
  { id: 'fantasy', name: 'Fantasiewelt', icon: '✦', price: 68, type: 'background', unlockLevel: 3 },
];
const initialData = (): PetData => ({
  version: 1, name: 'Wuschel', needs: { hunger: 78, glueck: 83, energie: 72, sauberkeit: 88 },
  lastUpdated: Date.now(), coins: 55, xp: 0, inventory: { kibble: 2, soap: 1 }, owned: [], equipped: [],
  room: 'Wohnzimmer', roomItems: [], activeBackground: 'classic', records: [], sleepUntil: null, stats: { games: 0, catches: 0, taps: 0, care: 0, rooms: 0, purchases: 0 },
  daily: { feeds: 0, games: 0, baths: 0, pets: 0, coins: 0 },
  missions: {}, claimedAchievements: [], missionsDate: new Date().toLocaleDateString('de-DE'),
  settings: { sound: true, music: false, volume: 65, lampOn: true },
});
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const levelFor = (xp: number) => Math.floor(xp / 100) + 1;
const today = () => new Date().toLocaleDateString('de-DE');
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const DAILY_GOALS: { id: keyof DailyProgress; title: string; detail: string; target: number; rewardCoins: number; rewardXp: number }[] = [
  { id: 'feeds', title: 'Snack-Zeit', detail: 'Füttere Wuschel dreimal', target: 3, rewardCoins: 8, rewardXp: 10 },
  { id: 'games', title: 'Spielrunde', detail: 'Spiele drei Minispiele', target: 3, rewardCoins: 15, rewardXp: 15 },
  { id: 'baths', title: 'Schaumparty', detail: 'Bade Wuschel zweimal', target: 2, rewardCoins: 10, rewardXp: 12 },
  { id: 'pets', title: 'Kraul-Meister', detail: 'Streichle Wuschel fünfmal', target: 5, rewardCoins: 10, rewardXp: 12 },
  { id: 'coins', title: 'Münz-Magnet', detail: 'Verdiene 100 Münzen', target: 100, rewardCoins: 12, rewardXp: 12 },
];
function advanceDaily(data: PetData, id: keyof DailyProgress, amount = 1): PetData {
  let next: PetData = {
    ...data,
    daily: { ...data.daily, [id]: data.daily[id] + amount },
    missions: { ...data.missions },
  };
  for (const goal of DAILY_GOALS) {
    if (next.daily[goal.id] >= goal.target && !next.missions[goal.id]) {
      next = {
        ...next,
        coins: next.coins + goal.rewardCoins,
        xp: next.xp + goal.rewardXp,
        missions: { ...next.missions, [goal.id]: true },
      };
    }
  }
  return next;
}

function loadData(): PetData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PetData>;
      if (parsed.version === 1 && parsed.needs && parsed.stats) {
        const elapsed = Math.max(0, Date.now() - (parsed.lastUpdated || Date.now()));
        const decay = Math.floor(elapsed / 240000);
        const dateChanged = parsed.missionsDate !== today();
        return {
          ...initialData(), ...parsed,
          needs: Object.fromEntries(Object.entries(parsed.needs).map(([key, value]) => [key, clamp(Number(value) - decay)])) as PetData['needs'],
          lastUpdated: Date.now(), missions: dateChanged ? {} : (parsed.missions || {}),
          daily: dateChanged ? initialData().daily : (parsed.daily || initialData().daily), claimedAchievements: parsed.claimedAchievements || [], missionsDate: today(),
          stats: { ...initialData().stats, ...parsed.stats },
          settings: {
            sound: parsed.settings?.sound ?? true,
            music: parsed.settings?.music ?? false,
            volume: parsed.settings?.volume ?? 65,
            lampOn: parsed.settings?.lampOn ?? true,
          },
        };
      }
    }
  } catch { /* a damaged local save starts a fresh, safe game */ }
  return initialData();
}

function App() {
  const [data, setData] = useState<PetData>(loadData);
  const [page, setPage] = useState('home');
  const [shopTab, setShopTab] = useState<Item['type']>('food');
  const [selectedFood, setSelectedFood] = useState('kibble');
  const [modal, setModal] = useState<'settings' | 'reset' | 'import' | 'name' | null>(null);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [petAction, setPetAction] = useState<PetAction>('idle');
  const [petSpeech, setPetSpeech] = useState('Ich bin eine Kreatur.');
  const [toast, setToast] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [cards, setCards] = useState<{ value: string; open: boolean; matched: boolean }[]>([]);
  const [firstCard, setFirstCard] = useState<number | null>(null);
  const [memoryPairs, setMemoryPairs] = useState(6);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [fallingItems, setFallingItems] = useState<FallingItem[]>([]);
  const [basketX, setBasketX] = useState(50);
  const [cups, setCups] = useState([0, 1, 2]);
  const [boneTarget, setBoneTarget] = useState(1);
  const [jumping, setJumping] = useState(false);
  const [fileText, setFileText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const soundContext = useRef<AudioContext | null>(null);
  const playfieldRef = useRef<HTMLDivElement>(null);
  const fallingItemsRef = useRef<FallingItem[]>([]);
  const basketXRef = useRef(50);
  const catchTickRef = useRef(0);
  const obstacleResolvedRef = useRef(false);
  const finishedGameRef = useRef(false);
  const petActionTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    const id = window.setInterval(() => {
      setData((old) => {
        const dayReset = old.missionsDate !== today();
        const current = dayReset ? { ...old, daily: { feeds: 0, games: 0, baths: 0, pets: 0, coins: 0 }, missions: {}, missionsDate: today() } : old;
        const elapsed = Date.now() - current.lastUpdated;
        if (elapsed < 240000) return current;
        const decay = Math.floor(elapsed / 240000);
        return { ...current, lastUpdated: Date.now(), needs: Object.fromEntries(Object.entries(current.needs).map(([key, value]) => [key, clamp(value - decay)])) as PetData['needs'] };
      });
    }, 30000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => {
      setData((old) => {
        if (!old.sleepUntil) return old;
        if (old.room !== 'Schlafzimmer' || Date.now() >= old.sleepUntil) return { ...old, sleepUntil: null };
        return { ...old, needs: { ...old.needs, energie: clamp(old.needs.energie + 5) } };
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    const interval = window.setInterval(() => {
      setGame((old) => {
        if (!old || old.phase !== 'playing') return old;
        if (old.time <= 1) return { ...old, time: 0 };
        return { ...old, time: old.time - 1 };
      });
      if (game.id === 'turbo') setTarget({ x: 8 + Math.random() * 84, y: 12 + Math.random() * 76 });
      if (game.id === 'run') setTarget((point) => ({ ...point, x: Math.max(8, point.x - 4.5) }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [game?.id, game?.phase]);
  useEffect(() => {
    if (!game || game.phase !== 'playing' || game.id !== 'catch') return undefined;
    catchTickRef.current = 0;
    fallingItemsRef.current = [];
    setFallingItems([]);
    const timer = window.setInterval(() => {
      catchTickRef.current += 1;
      const next: FallingItem[] = [];
      let scoreDelta = 0;
      let caughtGood = 0;
      for (const item of fallingItemsRef.current) {
        const moved = { ...item, y: item.y + 1.2 + Math.max(0, 25 - game.time) / 45 };
        if (moved.y >= 83 && Math.abs(moved.x - basketXRef.current) < 14) {
          scoreDelta += moved.good ? 2 : -3;
          if (moved.good) caughtGood += 1;
        } else if (moved.y < 102) next.push(moved);
      }
      if (catchTickRef.current % 5 === 0) {
        next.push({ id: Date.now() + catchTickRef.current, x: 8 + Math.random() * 84, y: -8, good: Math.random() > .28 });
      }
      fallingItemsRef.current = next;
      setFallingItems(next);
      if (scoreDelta) setGame((old) => old && old.phase === 'playing' ? { ...old, score: Math.max(0, old.score + scoreDelta), message: scoreDelta > 0 ? 'Snack gefangen!' : 'Iih, lieber nicht!' } : old);
      if (caughtGood) setData((old) => ({ ...old, stats: { ...old.stats, catches: old.stats.catches + caughtGood } }));
    }, 100);
    return () => window.clearInterval(timer);
  }, [game?.id, game?.phase]);
  useEffect(() => {
    if (!game || game.phase !== 'playing' || game.id !== 'bone') return undefined;
    const timer = window.setInterval(() => {
      setCups((old) => {
        const next = [...old];
        const first = Math.floor(Math.random() * 3);
        let second = Math.floor(Math.random() * 2);
        if (second >= first) second += 1;
        [next[first], next[second]] = [next[second], next[first]];
        return next;
      });
    }, 720);
    return () => window.clearInterval(timer);
  }, [game?.id, game?.phase]);
  useEffect(() => {
    if (game?.phase === 'playing' && game.time <= 0) finishGame(game);
  }, [game?.time, game?.phase]);
  useEffect(() => {
    if (!game || game.phase !== 'playing' || game.id !== 'memory' || !cards.length) return undefined;
    if (cards.every((card) => card.matched)) {
      const id = window.setTimeout(() => setGame((old) => old ? finishGame({ ...old, time: Math.max(0, old.time), score: old.score + Math.max(0, old.time) * 2 }) : old), 700);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [cards, game?.id, game?.phase]);
  useEffect(() => {
    if (game?.id === 'run' && game.phase === 'playing' && target.x <= 8) {
      if (target.y > 0 && !jumping) setGame((old) => old && old.phase === 'playing' ? { ...old, score: Math.max(0, old.score - 3), message: 'Platsch! Hindernis erwischt.' } : old);
      setTarget({ x: 105, y: Math.random() > .4 ? 0 : 35 });
    }
  }, [game?.id, game?.phase, target.x, target.y, jumping]);
  const level = levelFor(data.xp);
  const previousLevel = useRef(level);
  const xpProgress = data.xp % 100;
  const topScore = useMemo(() => [...data.records].sort((a, b) => b.score - a.score).slice(0, 10), [data.records]);
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); }, []);
  useEffect(() => {
    if (level > previousLevel.current) {
      const levelsGained = level - previousLevel.current;
      previousLevel.current = level;
      setData((old) => ({ ...old, coins: old.coins + levelsGained * 20 }));
      notify(`Level ${level}! ${levelsGained * 20} Münzen warten auf dich.`);
    }
  }, [level, notify]);
  const sound = useCallback((frequency = 540) => {
    if (!data.settings.sound || data.settings.volume <= 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      soundContext.current ??= new AudioCtx();
      const ctx = soundContext.current;
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.08 * data.settings.volume / 100, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .17);
    } catch { /* audio is optional */ }
  }, [data.settings.sound, data.settings.volume]);
  function showPetAction(action: PetAction, line: string) {
    setPetAction(action);
    setPetSpeech(line);
    if (petActionTimer.current) window.clearTimeout(petActionTimer.current);
    if (action !== 'sleeping') {
      petActionTimer.current = window.setTimeout(() => setPetAction('idle'), 1800);
    }
  }
  useEffect(() => {
    if (!data.settings.music || data.settings.volume <= 0) return undefined;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return undefined;
    soundContext.current ??= new AudioCtx();
    const context = soundContext.current;
    void context.resume();
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 392, 349.23];
    let index = 0;
    const playNote = () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = notes[index++ % notes.length];
      gain.gain.setValueAtTime(.001, context.currentTime);
      gain.gain.linearRampToValueAtTime(.012 * data.settings.volume / 100, context.currentTime + .08);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .48);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + .5);
    };
    playNote();
    const timer = window.setInterval(playNote, 650);
    return () => window.clearInterval(timer);
  }, [data.settings.music, data.settings.volume]);

  function award(coins: number, xp: number, stat?: keyof PetData['stats']) {
    setData((old) => ({ ...old, coins: old.coins + coins, xp: old.xp + xp, stats: { ...old.stats, ...(stat ? { [stat]: old.stats[stat] + 1 } : {}) } }));
  }
  function finishGame(finalGame: GameState): GameState {
    if (finishedGameRef.current) return finalGame;
    finishedGameRef.current = true;
    const record: GameRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, game: finalGame.id, score: finalGame.score, date: Date.now() };
    const rewardCoins = Math.max(5, Math.floor(finalGame.score / 2));
    setData((old) => {
      let next: PetData = {
        ...old, records: [record, ...old.records].slice(0, 100), coins: old.coins + rewardCoins,
        xp: old.xp + Math.max(5, Math.floor(finalGame.score / 3)), stats: { ...old.stats, games: old.stats.games + 1 },
      };
      next = advanceDaily(next, 'games');
      return advanceDaily(next, 'coins', rewardCoins);
    });
    const done = { ...finalGame, phase: 'done' as const, message: 'Runde geschafft!' };
    setGame(done); sound(780); return done;
  }
  function beginGame(id: GameId, pairCount = memoryPairs) {
    if (data.needs.energie < 20) { notify('Wuschel braucht erst Schlaf. Besuch das Schlafzimmer.'); return; }
    const durations: Record<GameId, number> = { catch: 30, memory: pairCount === 6 ? 75 : pairCount === 8 ? 100 : 135, turbo: 10, bone: 25, run: 30 };
    setData((old) => ({ ...old, needs: { ...old.needs, energie: clamp(old.needs.energie - 8) } }));
    finishedGameRef.current = false;
    setGame({ id, phase: 'playing', score: 0, time: durations[id] });
    setTarget({ x: 50, y: 50 }); setCards([]); setFirstCard(null); setJumping(false); setFallingItems([]); fallingItemsRef.current = [];
    setBasketX(50); basketXRef.current = 50; setCups([0, 1, 2]); setBoneTarget(Math.floor(Math.random() * 3)); obstacleResolvedRef.current = false;
    if (id === 'memory') {
      const values = ['●', '✦', '⌁', '▰', '◉', '♧', '◇', '♥', '≈', '☼', '♛', '✿'].slice(0, pairCount);
      setCards([...values, ...values].sort(() => Math.random() - .5).map((value) => ({ value, open: false, matched: false })));
    }
    sound(430);
  }
  function hitTarget(e?: PointerEvent<HTMLButtonElement>) {
    e?.stopPropagation();
    if (!game || game.phase !== 'playing') return;
    setGame({ ...game, score: game.score + (game.id === 'catch' ? 2 : game.id === 'bone' ? 5 : 1), message: '' });
    setTarget({ x: 8 + Math.random() * 84, y: 12 + Math.random() * 76 }); sound(game.id === 'bone' ? 820 : 620);
    if (game.id === 'catch') award(0, 0, 'catches');
    if (game.id === 'turbo') award(0, 0, 'taps');
  }
  function moveBasket(e: PointerEvent<HTMLDivElement>) {
    if (game?.id !== 'catch' || game.phase !== 'playing') return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const nextX = Math.max(7, Math.min(93, ((e.clientX - bounds.left) / bounds.width) * 100));
    basketXRef.current = nextX;
    setBasketX(nextX);
  }
  function chooseCup(position: number) {
    if (!game || game.id !== 'bone' || game.phase !== 'playing') return;
    if (cups[position] === boneTarget) {
      setGame((old) => old ? { ...old, score: old.score + 10, message: 'Gefunden! +10 Punkte.' } : old);
      setBoneTarget(Math.floor(Math.random() * 3));
      setCups([0, 1, 2]); sound(800);
    } else {
      setGame((old) => old ? { ...old, time: Math.max(0, old.time - 2), message: 'Daneben! Zwei Sekunden verloren.' } : old);
      sound(240);
    }
  }
  function playMemory(index: number) {
    if (!game || game.phase !== 'playing' || cards[index]?.open || cards[index]?.matched || cards.filter((card) => card.open && !card.matched).length >= 2) return;
    sound(500);
    if (firstCard === null) {
      setFirstCard(index); setCards((old) => old.map((card, i) => i === index ? { ...card, open: true } : card)); return;
    }
    const pairIndex = firstCard;
    const openNow = cards.map((card, i) => i === index || i === pairIndex ? { ...card, open: true } : card);
    setCards(openNow); setFirstCard(null);
    if (cards[pairIndex].value === cards[index].value) {
      setTimeout(() => setCards((old) => old.map((card, i) => i === index || i === pairIndex ? { ...card, matched: true } : card)), 300);
      setGame((old) => old ? { ...old, score: old.score + 10 } : old); sound(740);
    } else setTimeout(() => setCards((old) => old.map((card, i) => i === index || i === pairIndex ? { ...card, open: false } : card)), 700);
  }
  function jump() {
    if (!game || game.id !== 'run' || game.phase !== 'playing') return;
    if (target.y > 0 && target.x <= 35 && target.x > 8) {
      setGame({ ...game, score: game.score + 5, message: 'Hindernis übersprungen! +5' });
      award(0, 0, 'taps'); setTarget({ x: 100, y: Math.random() > .22 ? 0 : 37 }); sound(700);
    }
    setJumping(true); window.setTimeout(() => setJumping(false), 420);
  }
  function performNeed(id: NeedKey) {
    if (id === 'hunger') {
      const preferred = ITEMS.find((item) => item.id === selectedFood && item.effect === 'hunger');
      const food = (preferred && data.inventory[preferred.id] > 0 ? preferred : null)
        || ITEMS.find((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0);
      if (!food) { notify('Der Vorrat ist leer. Im Laden gibt es Snacks.'); return; }
      if (data.needs.hunger >= 100) { notify('Wuschel ist schon pappsatt.'); return; }
      setData((old) => advanceDaily({
        ...old,
        inventory: { ...old.inventory, [food.id]: Math.max(0, (old.inventory[food.id] || 0) - 1) },
        needs: { ...old.needs, hunger: clamp(old.needs.hunger + (food.amount || 12)) },
        xp: old.xp + 9,
        stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'feeds'));
      showPetAction('eating', `Mmmh, ${food.name.toLowerCase()}!`);
      notify(`${food.name} für ${data.name}!`); sound(680); return;
    }
    if (id === 'sauberkeit') {
      const soap = ITEMS.find((item) => item.id === 'soap');
      if ((data.inventory.soap || 0) < 1) { notify('Für ein Schaumbad brauchst du noch Seife aus dem Laden.'); return; }
      if (data.needs.sauberkeit >= 100) { notify('Wuschel ist schon blitzsauber.'); return; }
      setData((old) => advanceDaily({
        ...old,
        inventory: { ...old.inventory, soap: Math.max(0, (old.inventory.soap || 0) - 1) },
        needs: { ...old.needs, sauberkeit: clamp(old.needs.sauberkeit + (soap?.amount || 30)) },
        xp: old.xp + 10,
        stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'baths'));
      showPetAction('washing', 'Blasen! Blasen! Das kitzelt.');
      notify('Schaumwolke! Wuschel ist wieder sauber.'); sound(760); return;
    }
    if (id === 'glueck') {
      if (data.needs.energie < 10) { notify('Wuschel braucht erst eine Pause.'); return; }
      setData((old) => ({
        ...old,
        needs: { ...old.needs, glueck: clamp(old.needs.glueck + 12), energie: clamp(old.needs.energie - 4) },
        xp: old.xp + 4,
        stats: { ...old.stats, care: old.stats.care + 1 },
      }));
      showPetAction('happy', 'Wuff oder so!');
      notify('Wuschel macht einen Quatsch-Sprung.'); sound(720);
    }
  }
  function pet() {
    setData((old) => advanceDaily({
      ...old,
      needs: { ...old.needs, glueck: clamp(old.needs.glueck + 8) },
      xp: old.xp + 4,
      stats: { ...old.stats, care: old.stats.care + 1 },
    }, 'pets'));
    const lines = ['Das kitzelt!', 'Was guckst du?', 'Wuff oder so!', 'Ich bin eine Kreatur.', 'Was passiert hier eigentlich?', 'Ich habe existenzielle Fragen.'];
    showPetAction('petting', lines[Math.floor(Math.random() * lines.length)]);
    notify('Wuschel freut sich.'); sound(650);
  }
  function buy(item: Item) {
    if (item.unlockLevel && level < item.unlockLevel) { notify(`Ab Level ${item.unlockLevel} freigeschaltet.`); return; }
    if (item.type !== 'food' && data.owned.includes(item.id)) { notify('Das gehört schon dir.'); return; }
    if (data.coins < item.price) { notify('Noch nicht genug Münzen.'); return; }
    setData((old) => {
      const stats = { ...old.stats, purchases: old.stats.purchases + 1 };
      if (item.type === 'food') return { ...old, coins: old.coins - item.price, inventory: { ...old.inventory, [item.id]: (old.inventory[item.id] || 0) + 1 }, stats };
      return { ...old, coins: old.coins - item.price, owned: [...old.owned, item.id], stats };
    });
    notify(`${item.name} gekauft.`); sound(760);
  }
  function equip(id: string) {
    setData((old) => {
      const item = ITEMS.find((value) => value.id === id);
      if (!item) return old;
      if (item.type === 'room') return { ...old, roomItems: old.roomItems.includes(id) ? old.roomItems.filter((value) => value !== id) : [...old.roomItems, id] };
      if (item.type === 'background') return { ...old, activeBackground: old.activeBackground === id ? 'classic' : id };
      return { ...old, equipped: old.equipped.includes(id) ? old.equipped.filter((value) => value !== id) : [...old.equipped, id] };
    });
  }
  function changeRoom(room: Room) {
    setData((old) => ({ ...old, room, sleepUntil: room === 'Schlafzimmer' ? old.sleepUntil : null, xp: old.xp + (old.missions.room ? 0 : 8), stats: { ...old.stats, rooms: old.stats.rooms + 1 }, missions: { ...old.missions, room: true } }));
    sound(520);
  }
  function sleep() {
    if (data.room !== 'Schlafzimmer') { notify('Wuschel kann nur im Schlafzimmer schlafen.'); return; }
    if (data.sleepUntil && data.sleepUntil > Date.now()) {
      setData((old) => ({ ...old, sleepUntil: null, settings: { ...old.settings, lampOn: true } }));
      showPetAction('idle', 'Morgen! Was gibt es?');
      notify('Wuschel ist wieder wach.'); sound(500); return;
    }
    setData((old) => ({ ...old, sleepUntil: Date.now() + 60000, settings: { ...old.settings, lampOn: false }, xp: old.xp + 2 }));
    showPetAction('sleeping', 'Zzz…');
    notify(`${data.name} schläft jetzt eine Runde. Energie erholt sich.`);
    sound(420);
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify({ ...data, lastUpdated: Date.now() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'tamascottchi-save.json'; link.click(); URL.revokeObjectURL(link.href); notify('Spielstand exportiert.');
  }
  function importSave() {
    try {
      const value = JSON.parse(fileText) as Partial<PetData>;
      if (value.version !== 1 || !value.needs || !value.stats || !Number.isFinite(value.coins) || !Number.isFinite(value.xp)) throw new Error('invalid');
      const defaults = initialData();
      const now = Date.now();
      const decay = Math.floor(Math.max(0, now - (value.lastUpdated || now)) / 240000);
      const sameDay = value.missionsDate === today();
      const imported: PetData = {
        ...defaults, ...value,
        needs: {
          hunger: clamp(Number(value.needs.hunger ?? defaults.needs.hunger) - decay),
          glueck: clamp(Number(value.needs.glueck ?? defaults.needs.glueck) - decay),
          energie: clamp(Number(value.needs.energie ?? defaults.needs.energie) - decay),
          sauberkeit: clamp(Number(value.needs.sauberkeit ?? defaults.needs.sauberkeit) - decay),
        },
        stats: { ...defaults.stats, ...value.stats },
        daily: sameDay ? { ...defaults.daily, ...value.daily } : defaults.daily,
        missions: sameDay ? (value.missions || {}) : {},
        claimedAchievements: value.claimedAchievements || [],
        settings: { ...defaults.settings, ...value.settings },
        lastUpdated: now,
        missionsDate: today(),
      };
      setData(imported); setModal(null); setFileText(''); notify('Spielstand geladen.');
    } catch { notify('Datei ist kein gültiger tamascottchi-Spielstand.'); }
  }
  function resetGame() { localStorage.removeItem(STORE_KEY); setData(initialData()); setPage('home'); setGame(null); setModal(null); notify('Neuer Spielstand gestartet.'); }
  const nav = [
    { id: 'home', label: 'Zuhause', icon: Home }, { id: 'shop', label: 'Laden', icon: ShoppingBag },
    { id: 'games', label: 'Spiele', icon: Gamepad2 }, { id: 'closet', label: 'Fundstücke', icon: Sparkles },
    { id: 'leaderboard', label: 'Bestenliste', icon: Trophy }, { id: 'achievements', label: 'Erfolge', icon: Award },
  ];
  const missions = DAILY_GOALS.map((goal) => ({
    ...goal,
    progress: Math.min(data.daily[goal.id], goal.target),
    done: data.missions[goal.id] || false,
    reward: `+${goal.rewardCoins} Münzen · +${goal.rewardXp} XP`,
  }));
  const achievements = [
    { id: 'first-game', title: 'Pfoten in Bewegung', detail: 'Schließe dein erstes Spiel ab', progress: data.stats.games, goal: 1, icon: '✦', rewardCoins: 12, rewardXp: 10 },
    { id: 'ten-games', title: 'Spielplatz-Stammgast', detail: 'Spiele insgesamt 10 Runden', progress: data.stats.games, goal: 10, icon: '▦', rewardCoins: 30, rewardXp: 20 },
    { id: 'careful', title: 'Gute Pfote', detail: 'Kümmere dich 5-mal um Wuschel', progress: data.stats.care, goal: 5, icon: '♥', rewardCoins: 16, rewardXp: 12 },
    { id: 'collector', title: 'Kleiner Sammler', detail: 'Kaufe 3 Dinge im Laden', progress: data.stats.purchases, goal: 3, icon: '◇', rewardCoins: 18, rewardXp: 12 },
    { id: 'room-hop', title: 'Zimmerreise', detail: 'Wechsle 5-mal den Raum', progress: data.stats.rooms, goal: 5, icon: '⌂', rewardCoins: 14, rewardXp: 12 },
    { id: 'snack', title: 'Snack-Spezialist', detail: 'Fang 25 Snacks', progress: data.stats.catches, goal: 25, icon: '●', rewardCoins: 22, rewardXp: 16 },
  ];
  function claimAchievement(id: string) {
    const achievement = achievements.find((item) => item.id === id);
    if (!achievement || achievement.progress < achievement.goal || data.claimedAchievements.includes(id)) return;
    setData((old) => advanceDaily({
      ...old,
      coins: old.coins + achievement.rewardCoins,
      xp: old.xp + achievement.rewardXp,
      claimedAchievements: [...old.claimedAchievements, id],
    }, 'coins', achievement.rewardCoins));
    notify(`Erfolg abgeholt: +${achievement.rewardCoins} Münzen.`);
  }
  const equipped = data.equipped.map((id) => ITEMS.find((item) => item.id === id)).filter(Boolean) as Item[];
  const roomDecor = data.roomItems.map((id) => ITEMS.find((item) => item.id === id)).filter(Boolean) as Item[];
  const currentGame = GAMES.find((item) => item.id === game?.id);

  function renderGameBoard() {
    if (!game || !currentGame) return null;
    const gameClass = game.id === 'catch' ? 'catch' : game.id === 'memory' ? 'memory' : game.id === 'turbo' ? 'tap' : game.id === 'bone' ? 'bone' : 'run';
    return <section className={`game-screen ${gameClass}`} data-testid="game-board">
      <div className="game-top"><button className="button small ghost" onClick={() => setGame(null)} data-testid="button-exit-game"><ChevronLeft size={15}/> Zurück</button><span className="eyebrow">{currentGame.name}</span><span className="stat-pill"><Zap size={14}/>{game.score}</span></div>
      {game.id === 'memory' ? <><p className="subline">Finde {cards.length / 2} Paare · {fmtTime(game.time)} übrig</p><div className="memory-grid">{cards.map((card, i) => <button key={i} className={`memory-card ${card.open || card.matched ? 'open' : ''}`} onClick={() => playMemory(i)} disabled={card.matched} data-testid={`memory-card-${i}`}>{card.open || card.matched ? card.value : '?'}</button>)}</div></>
        : <><div ref={playfieldRef} className="game-playfield" onPointerMove={game.id === 'catch' ? moveBasket : undefined} data-testid="game-playfield">
          {game.id === 'catch' && <>
            {fallingItems.map((item) => <span key={item.id} className={`falling-item ${item.good ? 'good' : 'bad'}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-label={item.good ? 'Snack' : 'Schmutz'}>{item.good ? '●' : '×'}</span>)}
            <div className="snack-basket" style={{ left: `${basketX}%` }} aria-label="Futterkorb">▰</div>
          </>}
          {game.id === 'turbo' && <button className="catch-item" style={{ left: `${target.x}%`, top: `${target.y}%` }} onPointerDown={hitTarget} data-testid="game-target" aria-label="Pfote treffen"><PawPrint size={34}/></button>}
          {game.id === 'bone' && <div className="cup-row">{cups.map((cup, position) => <button className="cup" style={{ left: `${16 + position * 34}%` }} key={cup} onClick={() => chooseCup(position)} data-testid={`cup-${position}`} aria-label={`Becher ${position + 1} wählen`}><span>∩</span><small>?</small></button>)}</div>}
          {game.id === 'run' && <div className="run-track" onPointerDown={jump}><span className="runner" style={{ transform: jumping ? 'translateY(-68px) rotate(-12deg)' : 'translateY(0)' }}><img src={Wuschel} alt="" style={{ width: 60, height: 60, objectFit: 'contain' }}/></span>{target.y > 0 && <span className="obstacle" style={{ left: `${target.x}%` }}>▰</span>}</div>}
          {game.id === 'run' && <button className="button orange" style={{ marginTop: 15 }} onPointerDown={(e) => { e.stopPropagation(); jump(); }} data-testid="button-jump"><Footprints size={16}/> Springen</button>}
          {game.id === 'catch' && <p className="subline">Ziehe den Korb nach links und rechts und fange die fallenden Snacks.</p>}
          {game.id === 'turbo' && <p className="subline">Triff die Pfote so oft du kannst, bevor die Zeit abläuft.</p>}
          {game.id === 'bone' && <p className="subline">Merke dir den Knochenbecher und wähle ihn nach dem Mischen.</p>}
          {game.id === 'run' && <p className="subline">Tippe auf das Feld oder „Springen“, wenn ein Hindernis kommt.</p>}
          </div><div className="panel-head" style={{ margin: '12px 0 0' }}><span className="eyebrow">ZEIT</span><span className="score-big">{fmtTime(game.time)}</span></div></>}
      {game.message && game.phase !== 'done' && <p className="subline">{game.message}</p>}
      {game.phase === 'done' && <div className="overlay-result"><div><div className="eyebrow">RUNDENENDE</div><h2 className="panel-title" style={{ fontSize: 27 }}>{game.message || 'Stark gemacht!'}</h2><p>Punktzahl: <strong>{game.score}</strong><br/>Münzen und Erfahrung sind gutgeschrieben.</p><button className="button orange" onClick={() => beginGame(game.id)} data-testid="button-replay"><RotateCcw size={15}/> Nochmal spielen</button><button className="button" style={{ marginLeft: 9 }} onClick={() => { setGame(null); setPage('games'); }} data-testid="button-games-done">Spielauswahl</button></div></div>}
    </section>;
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">t</span>tamascottchi</div>
      <div className="topstats">
        <div className="stat-pill" data-testid="status-coins"><Coins size={16}/>{data.coins}</div>
        <div className="stat-pill" data-testid="status-level"><Star size={15}/><span>Lv. {level}</span></div>
        <button className="stat-pill" aria-label="Einstellungen" onClick={() => setModal('settings')} data-testid="button-settings"><Settings size={16}/></button>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <div className="nav-card"><div className="nav-label">DEIN KLEINES UNIVERSUM</div><div className="nav-list">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setGame(null); }} className={`nav-button ${page === id ? 'active' : ''}`} data-testid={`nav-${id}`}><Icon/>{label}</button>)}</div></div>
        <div className="side-note"><strong>Level {level} · Wuschel-Fan</strong><div className="progress-track"><span style={{ width: `${xpProgress}%` }}/></div><div style={{ marginTop: 7 }}>{xpProgress} / 100 XP bis zum nächsten Level</div></div>
      </aside>
      <main className="main">
        <div className="main-head"><div><div className="eyebrow">{page === 'home' ? 'DEIN ZUHAUSE' : 'TAMASCOTTCHI'}</div><h1>{page === 'home' ? `Hallo, ${data.name}.` : page === 'shop' ? 'Der kleine Laden' : page === 'games' ? 'Spielzeit!' : page === 'closet' ? 'Fundstücke' : page === 'leaderboard' ? 'Bestenliste' : 'Erfolge'}</h1><div className="subline">{page === 'home' ? 'Heute ist ein guter Tag für Quatsch.' : page === 'leaderboard' ? 'Nur deine Ergebnisse auf diesem Gerät.' : 'Ein gemütlicher Ort für Wuschel und dich.'}</div></div>
          {page === 'home' && <button className="button small" onClick={() => { setNameDraft(data.name); setModal('name'); }} data-testid="button-rename">Name ändern</button>}
          {page === 'home' && <div className="level-tag" aria-label={`Level ${level}`}></div>}
        </div>

        {page === 'home' && <>
          <div className="hero-grid">
            <section className={`room-card room-${data.room.toLowerCase()} background-${data.activeBackground} ${data.room === 'Schlafzimmer' && !data.settings.lampOn ? 'room-dark' : ''}`} data-testid="room-scene">
              <div className="room-sky"/><div className="room-floor"/><div className="room-window"/><div className="room-art">W</div><div className="rug"/>
              {roomDecor.map((item, i) => <div className="room-item" key={item.id} style={{ left: `${20 + i * 18}%` }}>{item.icon}</div>)}
              <div className="room-badge">{data.room}</div>
              <div className="pet-speech">{data.sleepUntil && data.sleepUntil > Date.now() ? 'Zzz…' : data.needs.hunger < 20 ? 'Bro, ich hab Hunger.' : data.needs.energie < 20 ? 'Ich bin müde.' : petSpeech}</div>
              {data.room === 'Schlafzimmer' && <button className="button small room-light" onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, lampOn: !old.settings.lampOn } }))} data-testid="button-bedroom-light">{data.settings.lampOn ? 'Licht aus' : 'Licht an'}</button>}
              <img src={Wuschel} className={`pet action-${petAction} ${data.sleepUntil && data.sleepUntil > Date.now() ? 'sleeping' : ''}`} role="button" tabIndex={0} aria-label="Wuschel streicheln" alt="Wuschel, dein flauschiger Hund-Mensch" onClick={pet} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pet(); }} data-testid="img-wuschel"/>
              {equipped.map((item) => <span key={item.id} className="room-item" style={{ top: '34%', left: '56%', bottom: 'auto', fontSize: 24 }}>{item.icon}</span>)}
              <div className="room-controls">{ROOM_LIST.map((room) => <button key={room} className={`room-chip ${data.room === room ? 'selected' : ''}`} onClick={() => changeRoom(room)} data-testid={`room-${room.toLowerCase()}`}>{room}</button>)}</div>
            </section>
            <section className="panel need-panel">
              <div className="panel-head"><h2 className="panel-title">Wuschels Wohlgefühl</h2><Activity size={18}/></div>
              {NEEDS.map(({ id, name, icon: Icon }) => <div className="need-row" key={id} data-testid={`need-${id}`}>
                <div className="need-icon"><Icon/></div><div><div className="need-label">{name}</div><div className="meter"><div className={`meter-fill ${data.needs[id] < 30 ? 'low' : data.needs[id] < 55 ? 'mid' : ''}`} style={{ width: `${data.needs[id]}%` }}/></div></div><div className="need-value">{data.needs[id]}%</div>
              </div>)}
              {data.room === 'Küche' && <div className="room-controls" style={{ position: 'static', flexWrap: 'wrap', margin: '0 0 3px' }} aria-label="Futter auswählen">
                {ITEMS.filter((item) => item.type === 'food' && item.effect === 'hunger').map((item) => <button key={item.id} className={`room-chip ${selectedFood === item.id ? 'selected' : ''}`} disabled={!data.inventory[item.id]} onClick={() => setSelectedFood(item.id)} data-testid={`food-choice-${item.id}`}>{item.name} · {data.inventory[item.id] || 0}</button>)}
              </div>}
              <div className="pet-actions">
                <button className="action-button" onClick={() => performNeed('hunger')} disabled={!ITEMS.some((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0)} data-testid="button-feed"><Utensils/>Füttern · {data.inventory[selectedFood] || 0}</button>
                <button className="action-button" onClick={() => performNeed('glueck')} data-testid="button-play-care"><Dumbbell/>Spielen</button>
                <button className="action-button" onClick={() => performNeed('sauberkeit')} data-testid="button-bath"><Bath/>Baden {data.inventory.soap ? `· ${data.inventory.soap}` : ''}</button>
                <button className="action-button" onClick={pet} data-testid="button-cuddle"><Heart/>Kraulen</button>
                {data.room === 'Schlafzimmer' && <button className="action-button" onClick={sleep} data-testid="button-sleep"><Moon size={15}/>{data.sleepUntil && data.sleepUntil > Date.now() ? 'Aufwachen' : 'Schlafen'}</button>}
              </div>
            </section>
          </div>
          <div className="section-grid">
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Heute für euch</h2><Gift size={18}/></div><div className="mission-list">{missions.map((mission) => <div className="mission" key={mission.id} data-testid={`mission-${mission.id}`}><div className={`mission-check ${mission.done ? 'done' : ''}`}>{mission.done && <Check/>}</div><div><div className="mission-title">{mission.title}</div><div className="mission-progress">{mission.done ? 'Für heute erledigt' : `${mission.progress} / ${mission.target} · ${mission.detail}`}</div></div><span className="reward">{mission.done ? '✓' : mission.reward}</span></div>)}</div></section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Eine Runde?</h2><button className="text-link" onClick={() => setPage('games')} data-testid="link-all-games">Alle Spiele</button></div><div className="game-list">{GAMES.slice(0, 4).map((item) => <button key={item.id} className="game-tile" onClick={() => { setPage('games'); beginGame(item.id); }} data-testid={`start-${item.id}`}><span className="game-icon">{item.icon}</span><span className="game-name">{item.name}</span><span className="game-desc">{item.desc}</span></button>)}</div></section>
          </div>
        </>}

        {page === 'games' && <>{game ? renderGameBoard() : <section className="page-grid">{GAMES.map((item) => <article className="panel" key={item.id} data-testid={`game-card-${item.id}`}><div className="panel-head"><h2 className="panel-title">{item.name}</h2><span style={{ font: '600 22px Fredoka', color: 'var(--orange)' }}>{item.icon}</span></div><p className="subline" style={{ minHeight: 32 }}>{item.desc}</p>{item.id === 'memory' && <div className="memory-difficulty" aria-label="Memory-Schwierigkeit">{[6, 8, 12].map((pairs) => <button key={pairs} className={`room-chip ${memoryPairs === pairs ? 'selected' : ''}`} onClick={() => setMemoryPairs(pairs)} data-testid={`memory-difficulty-${pairs}`}>{pairs === 6 ? 'Leicht' : pairs === 8 ? 'Mittel' : 'Schwer'} · {pairs}</button>)}</div>}<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}><span className="eyebrow">ERGEBNISSE ZÄHLEN FÜR DEINE BESTENLISTE</span><button className="button orange" onClick={() => beginGame(item.id, memoryPairs)} data-testid={`button-start-${item.id}`}><Play size={14}/> Start</button></div></article>)}</section>}</>}

        {page === 'shop' && <section className="panel"><div className="panel-head"><h2 className="panel-title">Ein paar gute Dinge</h2><span className="stat-pill"><Coins size={14}/>{data.coins}</span></div><div className="room-controls" style={{ position: 'static', margin: '0 0 14px' }}>{(['food', 'toy', 'accessory', 'room', 'background'] as const).map((tab) => <button className={`room-chip ${shopTab === tab ? 'selected' : ''}`} key={tab} onClick={() => setShopTab(tab)} data-testid={`shop-tab-${tab}`}>{tab === 'food' ? 'Futter & Pflege' : tab === 'toy' ? 'Spielzeug' : tab === 'accessory' ? 'Accessoires' : tab === 'room' ? 'Zimmer' : 'Hintergründe'}</button>)}</div>
          <div className="page-grid">{ITEMS.filter((item) => item.type === shopTab).map((item) => <div className="shop-item" key={item.id} data-testid={`shop-item-${item.id}`}><div className="item-icon">{item.icon}</div><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.unlockLevel && level < item.unlockLevel ? `Ab Level ${item.unlockLevel} freigeschaltet` : item.type === 'food' ? `${item.amount}% ${NEEDS.find((need) => need.id === item.effect)?.name.toLowerCase()} · Vorrat: ${data.inventory[item.id] || 0}` : item.type === 'room' ? 'Dekoration für dein Zuhause' : item.type === 'background' ? 'Ein neues Motiv für Wuschels Zimmer' : item.type === 'toy' ? 'Macht Wuschel glücklich' : 'Zum Anziehen und Angeben'}</div></div><button className="button small" onClick={() => buy(item)} disabled={(item.type !== 'food' && data.owned.includes(item.id)) || (!!item.unlockLevel && level < item.unlockLevel)} data-testid={`button-buy-${item.id}`}><Coins size={13}/>{item.type !== 'food' && data.owned.includes(item.id) ? 'Gekauft' : item.unlockLevel && level < item.unlockLevel ? `Level ${item.unlockLevel}` : item.price}</button></div>)}</div>
        </section>}

        {page === 'closet' && <div className="page-grid">
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Wuschel trägt</h2><Sparkles size={18}/></div>{data.owned.filter((id) => ['accessory', 'toy'].includes(ITEMS.find((item) => item.id === id)?.type || '')).length ? data.owned.filter((id) => ['accessory', 'toy'].includes(ITEMS.find((item) => item.id === id)?.type || '')).map((id) => { const item = ITEMS.find((value) => value.id === id)!; return <div className="shop-item" key={id}><div className="item-icon">{item.icon}</div><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.type === 'toy' ? 'Spielzeug' : 'Accessoire'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-equip-${id}`}>{data.equipped.includes(id) ? 'Ablegen' : 'Anziehen'}</button></div>; }) : <div className="empty-state">Noch nichts im Körbchen. Im Laden warten Accessoires und Spielzeug auf euch.</div>}
           </section><section className="panel"><div className="panel-head"><h2 className="panel-title">Zimmerstücke</h2><House size={18}/></div>{data.owned.filter((id) => ITEMS.find((item) => item.id === id)?.type === 'room').length ? data.owned.filter((id) => ITEMS.find((item) => item.id === id)?.type === 'room').map((id) => { const item = ITEMS.find((value) => value.id === id)!; return <div className="shop-item" key={id}><div className="item-icon">{item.icon}</div><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.roomItems.includes(id) ? 'Steht schon im Zimmer' : 'Passt gut ins Zimmer'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-place-${id}`}>{data.roomItems.includes(id) ? 'Wegräumen' : 'Aufstellen'}</button></div>; }) : <div className="empty-state">Mit einer Pflanze oder Lampe wird es gleich viel wohnlicher.</div>}</section>
           <section className="panel"><div className="panel-head"><h2 className="panel-title">Hintergründe</h2><House size={18}/></div>{data.owned.filter((id) => ITEMS.find((item) => item.id === id)?.type === 'background').length ? data.owned.filter((id) => ITEMS.find((item) => item.id === id)?.type === 'background').map((id) => { const item = ITEMS.find((value) => value.id === id)!; return <div className="shop-item" key={id}><div className="item-icon">{item.icon}</div><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.activeBackground === id ? 'Gerade ausgewählt' : 'Zimmermotiv'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-background-${id}`}>{data.activeBackground === id ? 'Auswählen' : 'Anwenden'}</button></div>; }) : <div className="empty-state">Freischaltbare Zimmermotive findest du im Laden.</div>}</section>
        </div>}

        {page === 'leaderboard' && <section className="panel"><div className="panel-head"><h2 className="panel-title">Deine stärksten Runden</h2><Trophy size={18}/></div><div className="side-note" style={{ margin: '0 0 12px' }}><strong>Geräte-lokale Bestenliste</strong>Hier stehen nur echte Spielrunden aus diesem Browser. Es gibt keine Online-Spieler und keinen Serverabgleich.</div>{topScore.length ? topScore.map((record, index) => <div className="leaderboard-row" key={record.id} data-testid={`score-row-${index}`}><span className="rank">#{index + 1}</span><div><strong>{GAMES.find((g) => g.id === record.game)?.name}</strong><div className="score-game">{new Date(record.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div><strong>{record.score} Pkt.</strong><Medal size={16}/></div>) : <div className="empty-state"><Trophy size={28}/><p>Noch keine Ergebnisse. Spiel eine Runde – deine echten Punkte erscheinen hier.</p><button className="button orange" onClick={() => setPage('games')} data-testid="button-play-first">Zu den Spielen</button></div>}</section>}

        {page === 'achievements' && <section className="panel"><div className="panel-head"><h2 className="panel-title">Kleine große Momente</h2><Award size={18}/></div><div className="page-grid">{achievements.map((item) => <div className={`achievement ${item.progress < item.goal ? 'locked' : ''}`} key={item.id} data-testid={`achievement-${item.id}`}><div className="item-icon">{item.progress >= item.goal ? item.icon : '·'}</div><div className="item-info"><div className="item-title">{item.title}</div><div className="item-meta">{item.detail}</div><div className="progress-track"><span style={{ width: `${Math.min(100, item.progress / item.goal * 100)}%` }}/></div><div className="item-meta">{Math.min(item.progress, item.goal)} / {item.goal} · Belohnung {item.rewardCoins} Münzen</div></div>{item.progress >= item.goal ? data.claimedAchievements.includes(item.id) ? <span className="reward">Abgeholt</span> : <button className="button small" onClick={() => claimAchievement(item.id)} data-testid={`button-claim-${item.id}`}>Abholen</button> : null}</div>)}</div></section>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Hauptnavigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setGame(null); }} data-testid={`mobile-nav-${id}`}><Icon/><span>{label}</span></button>)}</nav>

    {modal === 'settings' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><div className="panel-head"><h2>Einstellungen & Spielstand</h2><button className="button small ghost" onClick={() => setModal(null)} data-testid="button-close-settings"><X/></button></div><div className="settings-stack">
      <div className="setting-row"><div><strong>Spielklänge</strong><small>Werden direkt im Browser erzeugt</small></div><button className={`switch ${data.settings.sound ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, sound: !old.settings.sound } }))} aria-label="Spielklänge umschalten" data-testid="switch-sound">{data.settings.sound ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <div className="setting-row"><div><strong>Hintergrundmusik</strong><small>Eine leise, selbst erzeugte Melodie</small></div><button className={`switch ${data.settings.music ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, music: !old.settings.music } }))} aria-label="Hintergrundmusik umschalten" data-testid="switch-music">{data.settings.music ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <label className="setting-row volume-row"><span><strong>Lautstärke</strong><small>{data.settings.volume}%</small></span><input type="range" min="0" max="100" value={data.settings.volume} aria-label="Lautstärke" data-testid="input-volume" onChange={(e) => setData((old) => ({ ...old, settings: { ...old.settings, volume: Number(e.target.value) } }))}/></label>
      <div className="setting-row"><div><strong>Spielstand exportieren</strong><small>Versionierter JSON-Spielstand</small></div><button className="button small" onClick={exportSave} data-testid="button-export"><Download size={14}/> Export</button></div>
      <div className="setting-row"><div><strong>Spielstand importieren</strong><small>Vorhandene tamascottchi-JSON laden</small></div><button className="button small" onClick={() => setModal('import')} data-testid="button-import"><Plus size={14}/> Import</button></div>
      <div className="setting-row"><div><strong>Neu anfangen</strong><small>Löscht diesen lokalen Spielstand</small></div><button className="button small orange" onClick={() => setModal('reset')} data-testid="button-reset">Zurücksetzen</button></div>
      <p className="subline">Autospeicherung ist aktiv. Dein Spielstand bleibt auf diesem Gerät.</p>
    </div></section></div>}
    {modal === 'name' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wie soll Wuschel heißen?</h2><input className="input" value={nameDraft} maxLength={18} onChange={(e) => setNameDraft(e.target.value)} data-testid="input-pet-name"/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-rename">Abbrechen</button><button className="button orange" onClick={() => { setData((old) => ({ ...old, name: nameDraft.trim() || 'Wuschel' })); setModal(null); }} data-testid="button-save-name">Speichern</button></div></section></div>}
    {modal === 'import' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Spielstand importieren</h2><p>Wähle die JSON-Datei, die du zuvor exportiert hast.</p><input ref={fileRef} type="file" accept="application/json,.json" className="input" data-testid="input-import-file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void file.text().then(setFileText); }}/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-import">Abbrechen</button><button className="button orange" onClick={importSave} disabled={!fileText} data-testid="button-confirm-import">Spielstand laden</button></div></section></div>}
    {modal === 'reset' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wirklich von vorn?</h2><p>Wuschel, Münzen, Ergebnisse und alle Gegenstände auf diesem Gerät werden gelöscht. Diese Aktion lässt sich nicht rückgängig machen.</p><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-reset">Abbrechen</button><button className="button orange" onClick={resetGame} data-testid="button-confirm-reset">Spielstand löschen</button></div></section></div>}
    {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
  </div>;
}

export default App;
