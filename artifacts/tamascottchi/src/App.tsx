import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Award, Bath, Check, Coins, Download, Dumbbell, Gamepad2, Gift, Heart, Home, House,
  Medal, Moon, Play, Plus, Settings, Shirt, ShoppingBag, Sparkles, Star, Target, Trophy,
  Utensils, Volume2, VolumeX, X, Sun, Sunset, Library, Shirt as ShirtIcon, Compass, Users,
} from 'lucide-react';
import { BACKGROUNDS, CORE_SPRITES, preloadAll, preloadImage } from './game/assets';
import type { GameId, GameResult, SoundFn } from './game/engine';
import { GameStage, type RewardSummary } from './game/GameStage';
import { SLOT_OF, Scottchi } from './game/Scottchi';
import { OutfitLab } from './game/OutfitLab';
import { World } from './game/World';
import { CollectionsPage } from './game/CollectionsPage';
import { AimLayer, FlyingToy, type Point, type Throw } from './game/ToyPlay';
import {
  FAVORITE_TOY, FOOD_LINES, IDLE_CLASS, IDLE_LINES, PHASE_INFO, SURPRISES, TOY_LINES, TRAITS, absenceDecay, dayPhase, dominant, hasCharacter, nudge,
  type Trait,
} from './game/personality';
import {
  CHALLENGES, COLLECTIONS, GAMES, ITEMS, ROOM_BG, ROOM_LIST, STORE_KEY, STYLE_SETS, SaveLoadError, assertSave, clamp, initialData, itemById, levelFor, loadData,
  moodFor, normalize, rewardFor, today, type DailyProgress, type FullPetData, type GameRecord, type Item, type NeedKey, type Room,
} from './game/data';
type PetData = FullPetData;

type PetAction = 'idle' | 'happy' | 'eating' | 'washing' | 'petting' | 'sleeping' | 'spin' | 'wiggle' | 'run' | 'chew' | 'wake' | 'yawn' | 'cuddle';
const NEEDS: { id: NeedKey; name: string; icon: typeof Heart }[] = [
  { id: 'hunger', name: 'Sattheit', icon: Utensils }, { id: 'glueck', name: 'Laune', icon: Heart },
  { id: 'energie', name: 'Energie', icon: Activity }, { id: 'sauberkeit', name: 'Sauberkeit', icon: Sparkles },
];
const DAILY_GOALS: { id: keyof DailyProgress; title: string; detail: string; target: number; rewardCoins: number; rewardXp: number }[] = [
  { id: 'feeds', title: 'Snack-Zeit', detail: 'Füttere Scottchi dreimal', target: 3, rewardCoins: 8, rewardXp: 10 },
  { id: 'games', title: 'Spielrunde', detail: 'Spiele drei Minispiele', target: 3, rewardCoins: 15, rewardXp: 15 },
  { id: 'baths', title: 'Schaumparty', detail: 'Bade Scottchi zweimal', target: 2, rewardCoins: 10, rewardXp: 12 },
  { id: 'pets', title: 'Kraul-Meister', detail: 'Streichle Scottchi fünfmal', target: 5, rewardCoins: 10, rewardXp: 12 },
  { id: 'coins', title: 'Münz-Magnet', detail: 'Verdiene 100 Münzen', target: 100, rewardCoins: 12, rewardXp: 12 },
];
type ToyUse = { action: PetAction; line: string; fx: 'throw' | 'arc' | 'bounce' | 'shake'; need: Partial<Record<NeedKey, number>>; energy?: number; freq: number; slide?: number; room?: Room; cooldown: number };
const TOY_USE: Record<string, ToyUse> = {
  ball: { action: 'run', line: 'Ball! Ball! BALL!', fx: 'throw', need: { glueck: 12, energie: -5 }, energy: 10, freq: 700, cooldown: 15 },
  'bone-toy': { action: 'chew', line: 'Knusper. Meins.', fx: 'bounce', need: { glueck: 14, hunger: 3 }, freq: 520, cooldown: 20 },
  duck: { action: 'happy', line: 'Was war DAS?', fx: 'bounce', need: { glueck: 6 }, freq: 1300, slide: 700, cooldown: 6 },
  rope: { action: 'wiggle', line: 'Grrr, ich gewinne!', fx: 'shake', need: { glueck: 16, energie: -7 }, energy: 12, freq: 380, cooldown: 25 },
  frisbee: { action: 'run', line: 'Ich fliege fast mit!', fx: 'arc', need: { glueck: 14, energie: -6 }, energy: 12, freq: 820, slide: 1100, cooldown: 20 },
  teddy: { action: 'cuddle', line: 'Mein bester Freund.', fx: 'bounce', need: { glueck: 9, energie: 2 }, freq: 460, cooldown: 20 },
  shampoo: { action: 'washing', line: 'Duftet nach Kokos!', fx: 'shake', need: { sauberkeit: 45, glueck: 3 }, freq: 760, room: 'Bad', cooldown: 90 },
};

function advanceDaily(data: PetData, id: keyof DailyProgress, amount = 1): PetData {
  let next: PetData = { ...data, daily: { ...data.daily, [id]: data.daily[id] + amount }, missions: { ...data.missions } };
  for (const goal of DAILY_GOALS) {
    if (next.daily[goal.id] >= goal.target && !next.missions[goal.id]) {
      next = { ...next, coins: next.coins + goal.rewardCoins, xp: next.xp + goal.rewardXp, missions: { ...next.missions, [goal.id]: true } };
    }
  }
  return next;
}
function applyNeeds(needs: PetData['needs'], delta: Partial<Record<NeedKey, number>>) {
  const out = { ...needs };
  for (const [k, v] of Object.entries(delta) as [NeedKey, number][]) out[k] = clamp(out[k] + v);
  return out;
}

function ItemIcon({ item }: { item: Item }) {
  return <div className={`item-icon ${item.img ? 'has-img' : ''}`}>{item.img ? <img src={item.img} alt="" loading="lazy"/> : item.icon}</div>;
}

const TOY_TRAIT: Record<string, Trait> = { ball: 'verspielt', 'bone-toy': 'verspielt', duck: 'frech', rope: 'frech', frisbee: 'neugierig', teddy: 'anhaenglich', shampoo: 'anhaenglich' };
const ownsAll = (owned: string[], ids: string[]) => ids.every((id) => owned.includes(id));

function SaveError({ error }: { error: SaveLoadError }) {
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([error.raw], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tamascottchi-unlesbarer-spielstand.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const startFresh = () => {
    localStorage.setItem(`tamascottchi-unreadable-save-${Date.now()}`, error.raw);
    localStorage.removeItem(STORE_KEY);
    window.location.reload();
  };
  return <div className="app-shell save-error" data-testid="save-error">
    <div className="brand"><span className="brand-mark">t</span>tamascottchi</div>
    <section className="dialog" style={{ margin: '40px auto' }}>
      <h2>Spielstand nicht lesbar</h2>
      <p data-testid="text-save-error">{error.message}</p>
      <p>Nichts wurde gelöscht. Lade die Datei herunter, bevor du etwas anderes tust.</p>
      <div className="dialog-actions">
        <button className="button" onClick={download} data-testid="button-download-broken-save"><Download size={14}/> Rohdaten sichern</button>
        <button className="button ghost" onClick={() => window.location.reload()} data-testid="button-retry-load">Erneut versuchen</button>
        {confirm ? <button className="button orange" onClick={startFresh} data-testid="button-confirm-fresh">Ja, neu starten (Kopie bleibt im Browser)</button>
          : <button className="button orange" onClick={() => setConfirm(true)} data-testid="button-start-fresh">Neu anfangen…</button>}
      </div>
    </section>
  </div>;
}

function App() {
  const lab = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
  const [loaded] = useState<{ data?: PetData; error?: SaveLoadError }>(() => {
    try { return { data: loadData() }; } catch (e) { return { error: e instanceof SaveLoadError ? e : new SaveLoadError(String(e), localStorage.getItem(STORE_KEY) || '') }; }
  });
  if (import.meta.env.DEV && lab && (lab.get('outfitEditor') === '1' || lab.get('outfitGallery') === '1')) {
    return <OutfitLab initialMode={lab.get('outfitEditor') === '1' ? 'editor' : 'gallery'}/>;
  }
  if (loaded.error || !loaded.data) return <SaveError error={loaded.error!}/>;
  return <Game initial={loaded.data}/>;
}

function Game({ initial }: { initial: PetData }) {
  const [data, setData] = useState<PetData>(initial);
  const dataRef = useRef(data); dataRef.current = data;
  const [page, setPage] = useState('home');
  const [shopTab, setShopTab] = useState<Item['type']>('food');
  const [selectedFood, setSelectedFood] = useState('kibble');
  const [modal, setModal] = useState<'settings' | 'reset' | 'import' | 'name' | null>(null);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [petAction, setPetAction] = useState<PetAction>('idle');
  const [petSpeech, setPetSpeech] = useState('Ich bin eine Kreatur.');
  const [excited, setExcited] = useState(false);
  const [toast, setToast] = useState('');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [memoryPairs, setMemoryPairs] = useState(6);
  const [cupLevel, setCupLevel] = useState(1);
  const [toyFx, setToyFx] = useState<{ id: string; fx: string; key: number } | null>(null);
  const [aim, setAim] = useState<'ball' | 'frisbee' | null>(null);
  const [flight, setFlight] = useState<Throw | null>(null);
  const [run, setRun] = useState<{ dx: number; flip: boolean }>({ dx: 0, flip: false });
  const [chewing, setChewing] = useState(false);
  const roomRef = useRef<HTMLElement>(null);
  const [fileText, setFileText] = useState('');
  const [now, setNow] = useState(Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const soundContext = useRef<AudioContext | null>(null);
  const timers = useRef<Record<string, number | undefined>>({});
  const toyCooldown = useRef<Record<string, number>>({});
  const rewardedSessions = useRef<Set<string>>(new Set());

  const later = useCallback((key: string, fn: () => void, ms: number) => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(fn, ms);
  }, []);
  useEffect(() => () => { Object.values(timers.current).forEach((t) => window.clearTimeout(t)); }, []);

  // autosave
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }, [data]);
  // preload character sprites + room backgrounds so mood/room swaps never flash
  useEffect(() => {
    void preloadAll(CORE_SPRITES).then(() => Object.values(BACKGROUNDS).forEach((b) => void preloadImage(b.src)));
  }, []);
  // need decay + daily reset + sleep regen in one interval
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      setData((old) => {
        let cur = old;
        if (cur.missionsDate !== today()) cur = { ...cur, daily: { feeds: 0, games: 0, baths: 0, pets: 0, coins: 0 }, missions: {}, missionsDate: today() };
        const elapsed = Date.now() - cur.lastUpdated;
        if (elapsed >= 240000) {
          // Long gaps preserve needs; only active, short intervals cause decay.
          const evening = ['abend', 'nacht'].includes(dayPhase());
          const needs = Object.fromEntries(Object.entries(cur.needs).map(([k, v]) => [k, clamp(absenceDecay(v, elapsed * (evening && k === 'energie' && elapsed < 1200000 ? 1.5 : 1)))])) as PetData['needs'];
          cur = { ...cur, lastUpdated: Date.now(), needs };
        }
        return cur;
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, []);
  // hidden tab: freeze the clock while away, then apply the same capped absence rule on return
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') { setData((old) => ({ ...old, routine: { ...old.routine, lastSeen: Date.now() } })); return; }
      setNow(Date.now());
      setData((old) => {
        const away = Date.now() - old.lastUpdated;
        if (away < 240000) return old;
        return { ...old, lastUpdated: Date.now(), needs: Object.fromEntries(Object.entries(old.needs).map(([k, v]) => [k, clamp(absenceDecay(v, away))])) as PetData['needs'] };
      });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => {
      setData((old) => {
        if (!old.sleepUntil) return old;
        if (old.room !== 'Schlafzimmer' || Date.now() >= old.sleepUntil) return { ...old, sleepUntil: null };
        const gain = old.owned.includes('teddy') ? 7 : 5;
        return { ...old, needs: { ...old.needs, energie: clamp(old.needs.energie + gain) } };
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  const level = levelFor(data.xp);
  const previousLevel = useRef(level);
  const xpProgress = data.xp % 100;
  const topScore = useMemo(() => [...data.records].sort((a, b) => b.score - a.score).slice(0, 10), [data.records]);
  const notify = useCallback((message: string) => { setToast(message); later('toast', () => setToast(''), 2400); }, [later]);
  useEffect(() => {
    if (level > previousLevel.current) {
      const gained = level - previousLevel.current;
      previousLevel.current = level;
      setData((old) => ({ ...old, coins: old.coins + gained * 20 }));
      notify(`Level ${level}! ${gained * 20} Münzen warten auf dich.`);
    }
  }, [level, notify]);

  const settingsRef = useRef(data.settings); settingsRef.current = data.settings;
  const sound: SoundFn = useCallback((frequency = 540, opts = {}) => {
    const st = settingsRef.current;
    if (!st.sound || st.volume <= 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      soundContext.current ??= new AudioCtx();
      const ctx = soundContext.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const dur = opts.dur ?? 0.16;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = opts.type ?? 'triangle'; osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, ctx.currentTime + dur);
      gain.gain.setValueAtTime(0.08 * st.volume / 100, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* audio is optional */ }
  }, []);
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
      const o = context.createOscillator(); const g = context.createGain();
      o.type = 'sine'; o.frequency.value = notes[index++ % notes.length];
      g.gain.setValueAtTime(0.001, context.currentTime);
      g.gain.linearRampToValueAtTime(0.012 * data.settings.volume / 100, context.currentTime + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.48);
      o.connect(g); g.connect(context.destination); o.start(); o.stop(context.currentTime + 0.5);
    };
    playNote();
    const timer = window.setInterval(playNote, 650);
    return () => window.clearInterval(timer);
  }, [data.settings.music, data.settings.volume]);

  const sleeping = !!data.sleepUntil && data.sleepUntil > now;
  const mood = moodFor(data.needs, excited, sleeping);
  const phase = dayPhase(new Date(now));
  const trait = dominant(data.personality);
  const showsTrait = hasCharacter(data.personality);
  const idleStyle = sleeping ? undefined : phase === 'abend' || phase === 'nacht' ? 'sway' : showsTrait ? IDLE_CLASS[trait] : undefined;
  function cheer(ms = 3500) { setExcited(true); later('excited', () => setExcited(false), ms); }
  function showPetAction(action: PetAction, line: string, ms = 1800) {
    setPetAction(action); setPetSpeech(line);
    if (action !== 'sleeping') later('pet', () => setPetAction('idle'), ms);
  }
  const grow = (t: Trait, amount = 1) => setData((old) => ({ ...old, personality: nudge(old.personality, t, amount) }));

  // ---------- daily routine: greeting once per local day, welcome back without penalty ----------
  useEffect(() => {
    const d = dataRef.current;
    const awayH = (Date.now() - (d.routine.lastSeen || Date.now())) / 3600000;
    const p = dayPhase();
    if (d.routine.greetedDate !== today()) {
      const line = p === 'morgen' ? `Guten Morgen! *streck* Neue Tagesaufgaben sind da.` : p === 'abend' ? 'Guten Abend! Schön, dass du da bist.' : p === 'nacht' ? 'Oh, du bist noch wach? Hallo!' : 'Hallo! Neuer Tag, neue Aufgaben.';
      showPetAction('wake', awayH > 24 ? `Du warst weg, aber alles gut. ${line}` : line, 2600);
      notify(p === 'morgen' ? 'Scottchi ist aufgewacht. Neue Tagesaufgaben!' : 'Neue Tagesaufgaben sind da.');
      setData((old) => ({ ...old, routine: { ...old.routine, greetedDate: today(), lastSeen: Date.now() } }));
    } else if (awayH > 6) {
      showPetAction('happy', 'Da bist du ja wieder! Ich hab dich vermisst.', 2400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setData((old) => ({ ...old, routine: { ...old.routine, lastSeen: Date.now() } })), 60000);
    return () => window.clearInterval(id);
  }, []);
  // ---------- personality idle chatter + small surprises (visible tab, home page, awake) ----------
  const idleCtx = useRef({ page, sleeping, petAction, aim, flight: !!flight });
  idleCtx.current = { page, sleeping, petAction, aim, flight: !!flight };
  useEffect(() => {
    const id = window.setInterval(() => {
      const c = idleCtx.current; const d = dataRef.current;
      if (document.visibilityState !== 'visible' || c.page !== 'home' || c.sleeping || c.petAction !== 'idle' || c.aim || c.flight) return;
      const p = dayPhase(); const t = dominant(d.personality); const character = hasCharacter(d.personality);
      const surprisesToday = d.routine.surpriseDate === today() ? d.routine.surprises : 0;
      if (p !== 'nacht' && surprisesToday < 3 && Math.random() < 0.22) {
        const pool = SURPRISES[character ? t : (['verspielt', 'neugierig', 'anhaenglich'] as Trait[])[Math.floor(Math.random() * 3)]];
        const s = pool[Math.floor(Math.random() * pool.length)];
        setData((old) => ({ ...old, coins: old.coins + s.coins, needs: applyNeeds(old.needs, s.need || {}), routine: { ...old.routine, surpriseDate: today(), surprises: (old.routine.surpriseDate === today() ? old.routine.surprises : 0) + 1 } }));
        showPetAction('happy', 'Schau mal, was ich habe!', 2200); notify(`${s.line} +${s.coins} Münzen`);
        return;
      }
      if ((p === 'abend' || p === 'nacht') && Math.random() < 0.5) { showPetAction('yawn', IDLE_LINES.verschlafen[Math.floor(Math.random() * 3)], 2400); return; }
      const lines = character ? IDLE_LINES[t] : ['Was guckst du?', 'Ich bin eine Kreatur.', 'Was passiert hier eigentlich?'];
      setPetSpeech(lines[Math.floor(Math.random() * lines.length)]);
    }, 28000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- games ----------
  const requestStart = useCallback(() => {
    if (dataRef.current.needs.energie < 20) { notify('Scottchi braucht erst Schlaf. Besuch das Schlafzimmer.'); return false; }
    setData((old) => ({ ...old, needs: { ...old.needs, energie: clamp(old.needs.energie - 8) } }));
    return true;
  }, [notify]);
  const completeGame = useCallback((sessionId: string, result: GameResult): RewardSummary => {
    const cur = dataRef.current;
    const game = sessionId.split('-')[0] as GameId;
    const prevBest = cur.highscores[game] || 0;
    const { coins, xp, reduced } = rewardFor(game, result.score, cur.daily.games);
    const newChallenges = CHALLENGES.filter((c) => c.game === game && !cur.challenges[c.id] && c.test(result.score, result.metrics));
    const summary: RewardSummary = {
      coins: coins + newChallenges.reduce((a, c) => a + c.coins, 0), xp: xp + newChallenges.reduce((a, c) => a + c.xp, 0),
      newBest: result.score > prevBest && result.score > 0, best: Math.max(prevBest, result.score), challenges: newChallenges.map((c) => c.title), reduced,
    };
    if (rewardedSessions.current.has(sessionId)) return { ...summary, coins: 0, xp: 0, challenges: [] };
    rewardedSessions.current.add(sessionId);
    const record: GameRecord = { id: sessionId, game, score: result.score, date: Date.now() };
    setData((old) => {
      if (old.records.some((r) => r.id === sessionId)) return old;
      const challenges = { ...old.challenges };
      let bonusCoins = 0, bonusXp = 0;
      for (const c of newChallenges) if (!challenges[c.id]) { challenges[c.id] = Date.now(); bonusCoins += c.coins; bonusXp += c.xp; }
      let next: PetData = {
        ...old, records: [record, ...old.records].slice(0, 100), coins: old.coins + coins + bonusCoins, xp: old.xp + xp + bonusXp,
        highscores: { ...old.highscores, [game]: Math.max(old.highscores[game] || 0, result.score) }, challenges,
        needs: applyNeeds(old.needs, { glueck: 6 }),
        stats: { ...old.stats, games: old.stats.games + 1, catches: old.stats.catches + (result.metrics.caught || 0), taps: old.stats.taps + (result.metrics.hits || 0) },
      };
      next = advanceDaily({ ...next, personality: nudge(next.personality, 'verspielt', 0.8) }, 'games');
      return advanceDaily(next, 'coins', coins + bonusCoins);
    });
    sound(780, { dur: 0.25, slide: 1170 });
    if (result.score > 0 || newChallenges.length) cheer(5000);
    return summary;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);
  function openGame(id: GameId) { setPage('games'); setActiveGame(id); }

  // ---------- care ----------
  function performNeed(id: NeedKey) {
    if (id === 'hunger') {
      const preferred = ITEMS.find((item) => item.id === selectedFood && item.effect === 'hunger');
      const food = (preferred && data.inventory[preferred.id] > 0 ? preferred : null) || ITEMS.find((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0);
      if (!food) { notify('Der Vorrat ist leer. Im Laden gibt es Snacks.'); return; }
      if (data.needs.hunger >= 100) { notify('Scottchi ist schon pappsatt.'); return; }
      const bowl = data.owned.includes('bowl') ? 1.25 : 1;
      setData((old) => advanceDaily({
        ...old, inventory: { ...old.inventory, [food.id]: Math.max(0, (old.inventory[food.id] || 0) - 1) },
        needs: { ...old.needs, hunger: clamp(old.needs.hunger + (food.amount || 12) * bowl) }, xp: old.xp + 9, stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'feeds'));
      showPetAction('eating', showsTrait ? FOOD_LINES[trait] : `Mmmh, ${food.name.toLowerCase()}!`, 2000);
      if (showsTrait && trait === 'frech') grow('frech', 0.3);
      notify(`${food.name} für ${data.name}${bowl > 1 ? ' aus dem Napf' : ''}!`); sound(680); return;
    }
    if (id === 'sauberkeit') {
      if ((data.inventory.soap || 0) < 1) { notify(data.owned.includes('shampoo') ? 'Keine Seife. Im Bad kannst du das Shampoo benutzen.' : 'Für ein Schaumbad brauchst du noch Seife aus dem Laden.'); return; }
      if (data.needs.sauberkeit >= 100) { notify('Scottchi ist schon blitzsauber.'); return; }
      setData((old) => advanceDaily({
        ...old, inventory: { ...old.inventory, soap: Math.max(0, (old.inventory.soap || 0) - 1) },
        needs: { ...old.needs, sauberkeit: clamp(old.needs.sauberkeit + 35) }, xp: old.xp + 10, stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'baths'));
      showPetAction('washing', 'Blasen! Blasen! Das kitzelt.');
      notify('Schaumwolke! Scottchi ist wieder sauber.'); sound(760); return;
    }
    if (data.needs.energie < 10) { notify('Scottchi braucht erst eine Pause.'); return; }
    setData((old) => ({ ...old, needs: { ...old.needs, glueck: clamp(old.needs.glueck + 12), energie: clamp(old.needs.energie - 4) }, xp: old.xp + 4, stats: { ...old.stats, care: old.stats.care + 1 } }));
    showPetAction('happy', 'Wuff oder so!'); cheer(1800); grow('frech', 0.8);
    notify('Scottchi macht einen Quatsch-Sprung.'); sound(720);
  }
  function pet() {
    if (sleeping) { showPetAction('sleeping', 'Zzz… nur noch fünf Minuten.'); return; }
    setData((old) => advanceDaily({ ...old, needs: { ...old.needs, glueck: clamp(old.needs.glueck + 8) }, xp: old.xp + 4, stats: { ...old.stats, care: old.stats.care + 1 } }, 'pets'));
    const lines = ['Das kitzelt!', 'Was guckst du?', 'Wuff oder so!', 'Ich bin eine Kreatur.', 'Was passiert hier eigentlich?', 'Ich habe existenzielle Fragen.'];
    const pool = showsTrait ? [...lines.slice(0, 3), ...IDLE_LINES[trait]] : lines;
    showPetAction('petting', pool[Math.floor(Math.random() * pool.length)]); grow('anhaenglich', 0.7);
    notify(`${data.name} freut sich.`); sound(650);
  }
  function playToy(id: string) {
    const use = TOY_USE[id];
    const item = itemById(id);
    if (!use || !item || !data.owned.includes(id)) return;
    if (sleeping) { notify('Psst, Scottchi schläft.'); return; }
    if (use.room && data.room !== use.room) { notify(`${item.name} funktioniert nur im ${use.room}.`); return; }
    if (use.energy && data.needs.energie < use.energy) { notify('Zu müde zum Toben. Erst schlafen.'); return; }
    if ((id === 'ball' || id === 'frisbee') && page === 'home') { if (!flight) setAim(id); return; }
    if (id === 'bone-toy') { setChewing(true); later('chew', () => setChewing(false), 2600); }
    else if (id !== 'teddy') { setToyFx({ id, fx: use.fx, key: Date.now() }); later('toy', () => setToyFx(null), 1300); }
    sound(use.freq, { dur: id === 'duck' ? 0.18 : 0.2, slide: use.slide, type: id === 'duck' ? 'square' : 'triangle' });
    showPetAction(use.action, use.line, id === 'bone-toy' ? 2600 : 1800);
    rewardToy(id);
  }
  function rewardToy(id: string) {
    const use = TOY_USE[id];
    const fav = showsTrait && FAVORITE_TOY[trait] === id;
    if (fav) later('favline', () => setPetSpeech(TOY_LINES[trait]), 1300);
    const ready = (toyCooldown.current[id] || 0) <= Date.now();
    if (!ready) { notify('Lustig! Für Bonuspunkte kurz verschnaufen.'); return; }
    toyCooldown.current[id] = Date.now() + use.cooldown * 1000;
    if (use.action !== 'washing') cheer(2200);
    setData((old) => {
      const need = fav ? Object.fromEntries(Object.entries(use.need).map(([k, v]) => [k, k === 'glueck' ? v + 4 : v])) : use.need;
      const next = { ...old, personality: nudge(old.personality, TOY_TRAIT[id] || 'verspielt', 0.9), needs: applyNeeds(old.needs, need), xp: old.xp + 5, stats: { ...old.stats, toys: (old.stats.toys || 0) + 1, care: old.stats.care + 1 } };
      return id === 'shampoo' ? advanceDaily(next, 'baths') : next;
    });
  }
  /** Ball/frisbee: toy flies to the aimed point, Scottchi runs there (flipping to face it), picks it up and trots back. */
  function throwToy(id: 'ball' | 'frisbee', from: Point, to: Point) {
    setAim(null);
    const img = itemById(id)?.img; if (!img) return;
    setFlight({ id, kind: id, img, from, to, key: Date.now() });
    sound(TOY_USE[id].freq, { dur: 0.25, slide: TOY_USE[id].slide });
    setPetSpeech(id === 'ball' ? 'Ball! Ball! BALL!' : to.x < from.x ? 'Links! Es fliegt nach links!' : 'Da rüber! Ich hab es!');
  }
  function toyLanded() {
    const f = flight; const card = roomRef.current;
    if (!f || !card) { setFlight(null); return; }
    const dx = ((f.to.x - 50) / 100) * card.clientWidth;
    const max = card.clientWidth * 0.3;
    setRun({ dx: Math.max(-max, Math.min(max, dx)), flip: f.to.x > 52 });
    showPetAction('run', TOY_USE[f.id].line, 2400);
    later('fetch', () => {
      setFlight(null); setRun((r) => ({ dx: 0, flip: r.flip }));
      setPetSpeech(f.kind === 'ball' ? 'Hab ihn! Nochmal?' : 'Gefangen! Noch mal werfen?');
      later('unflip', () => setRun({ dx: 0, flip: false }), 750);
      cheer(2200); rewardToy(f.id);
    }, 900);
  }
  function buy(item: Item) {
    if (item.unlockLevel && level < item.unlockLevel) { notify(`Ab Level ${item.unlockLevel} freigeschaltet.`); return; }
    if (item.type !== 'food' && data.owned.includes(item.id)) { notify('Das gehört schon dir.'); return; }
    if (data.coins < item.price) { notify('Noch nicht genug Münzen.'); return; }
    setData((old) => {
      if (old.coins < item.price || (item.type !== 'food' && old.owned.includes(item.id))) return old;
      const stats = { ...old.stats, purchases: old.stats.purchases + 1 };
      if (item.type === 'food') return { ...old, coins: old.coins - item.price, inventory: { ...old.inventory, [item.id]: (old.inventory[item.id] || 0) + 1 }, stats };
      return { ...old, coins: old.coins - item.price, owned: [...old.owned, item.id], stats, personality: nudge(old.personality, 'neugierig', 0.6) };
    });
    notify(`${item.name} gekauft.`); sound(760);
  }
  function equip(id: string) {
    setData((old) => {
      const item = itemById(id);
      if (!item) return old;
      if (item.type === 'room') return { ...old, roomItems: old.roomItems.includes(id) ? old.roomItems.filter((v) => v !== id) : [...old.roomItems, id] };
      if (item.type === 'background') return { ...old, activeBackground: old.activeBackground === id ? 'classic' : id };
      if (old.equipped.includes(id)) return { ...old, equipped: old.equipped.filter((v) => v !== id) };
      const slot = SLOT_OF[id];
      // one item per slot: equipping a hat swaps the old hat, etc.
      return withStyles({ ...old, equipped: [...old.equipped.filter((v) => !slot || SLOT_OF[v] !== slot), id] });
    });
  }
  function withStyles(d: PetData): PetData {
    const worn = STYLE_SETS.filter((s) => ownsAll(d.equipped, s.items) && !d.stylesWorn.includes(s.id)).map((s) => s.id);
    return worn.length ? { ...d, stylesWorn: [...d.stylesWorn, ...worn] } : d;
  }
  function wearStyle(items: string[]) {
    setData((old) => {
      if (!ownsAll(old.owned, items)) return old;
      const slots = new Set(items.map((i) => SLOT_OF[i]));
      return withStyles({ ...old, equipped: [...old.equipped.filter((v) => !slots.has(SLOT_OF[v])), ...items] });
    });
    notify('Kompletter Stil angezogen.'); sound(820);
  }
  function changeRoom(room: Room) {
    setAim(null);
    setData((old) => ({ ...old, room, sleepUntil: room === 'Schlafzimmer' ? old.sleepUntil : null, xp: old.xp + (old.missions.room ? 0 : 8), stats: { ...old.stats, rooms: old.stats.rooms + 1 }, missions: { ...old.missions, room: true },
      visitedRooms: old.visitedRooms.includes(room) ? old.visitedRooms : [...old.visitedRooms, room], personality: old.room === room ? old.personality : nudge(old.personality, 'neugierig', 0.4) }));
    sound(520);
  }
  function sleep() {
    if (data.room !== 'Schlafzimmer') { notify('Scottchi kann nur im Schlafzimmer schlafen.'); return; }
    if (sleeping) {
      setData((old) => ({ ...old, sleepUntil: null, settings: { ...old.settings, lampOn: true } }));
      showPetAction('idle', 'Morgen! Was gibt es?'); notify('Scottchi ist wieder wach.'); sound(500); return;
    }
    setData((old) => ({ ...old, sleepUntil: Date.now() + 60000, settings: { ...old.settings, lampOn: false }, xp: old.xp + 2, personality: nudge(old.personality, 'verschlafen', 1) }));
    setNow(Date.now() + 1);
    showPetAction('sleeping', 'Zzz…');
    notify(`${data.name} schläft jetzt eine Runde${data.owned.includes('teddy') ? ' mit dem Teddy' : ''}.`); sound(420);
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify({ ...data, lastUpdated: Date.now() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'tamascottchi-save.json'; link.click(); URL.revokeObjectURL(link.href); notify('Spielstand exportiert.');
  }
  function importSave() {
    try {
      const value: unknown = JSON.parse(fileText);
      assertSave(value);
      if (!Number.isFinite(value.coins) || !Number.isFinite(value.xp)) throw new Error('invalid');
      setData(normalize(value)); setModal(null); setFileText(''); notify('Spielstand geladen.');
    } catch { notify('Datei ist kein gültiger tamascottchi-Spielstand.'); }
  }
  function resetGame() { localStorage.removeItem(STORE_KEY); setData(initialData()); setPage('home'); setActiveGame(null); setModal(null); notify('Neuer Spielstand gestartet.'); }

  const nav = [
    { id: 'home', label: 'Zuhause', icon: Home }, { id: 'world', label: 'World', icon: Compass },
    { id: 'games', label: 'Spiele', icon: Gamepad2 }, { id: 'shop', label: 'Laden', icon: ShoppingBag },
    { id: 'collections', label: 'Sammeln', icon: Library }, { id: 'online', label: 'Online', icon: Users },
    { id: 'closet', label: 'Schrank', icon: Shirt }, { id: 'leaderboard', label: 'Besten', icon: Trophy },
    { id: 'achievements', label: 'Erfolge', icon: Award },
  ];
  const uniqueOwned = new Set(data.owned).size;
  const stylesOwned = STYLE_SETS.filter((s) => ownsAll(data.owned, s.items)).length;
  const missions = DAILY_GOALS.map((goal) => ({ ...goal, progress: Math.min(data.daily[goal.id], goal.target), done: data.missions[goal.id] || false, reward: `+${goal.rewardCoins} Münzen · +${goal.rewardXp} XP` }));
  const achievements = [
    { id: 'first-game', title: 'Pfoten in Bewegung', detail: 'Schließe dein erstes Spiel ab', progress: data.stats.games, goal: 1, icon: '✦', rewardCoins: 12, rewardXp: 10 },
    { id: 'ten-games', title: 'Spielplatz-Stammgast', detail: 'Spiele insgesamt 10 Runden', progress: data.stats.games, goal: 10, icon: '▦', rewardCoins: 30, rewardXp: 20 },
    { id: 'careful', title: 'Gute Pfote', detail: 'Kümmere dich 5-mal um Scottchi', progress: data.stats.care, goal: 5, icon: '♥', rewardCoins: 16, rewardXp: 12 },
    { id: 'collector', title: 'Kleiner Sammler', detail: 'Kaufe 3 Dinge im Laden', progress: data.stats.purchases, goal: 3, icon: '◇', rewardCoins: 18, rewardXp: 12 },
    { id: 'room-hop', title: 'Zimmerreise', detail: 'Wechsle 5-mal den Raum', progress: data.stats.rooms, goal: 5, icon: '⌂', rewardCoins: 14, rewardXp: 12 },
    { id: 'snack', title: 'Snack-Spezialist', detail: 'Fang 25 Snacks', progress: data.stats.catches, goal: 25, icon: '●', rewardCoins: 22, rewardXp: 16 },
    { id: 'toybox', title: 'Spielkamerad', detail: 'Spiele 15-mal mit Spielzeug', progress: data.stats.toys || 0, goal: 15, icon: '◎', rewardCoins: 20, rewardXp: 15 },
    { id: 'level-10', title: 'Großer Scottchi', detail: 'Bring Scottchi auf Level 10', progress: level, goal: 10, icon: '★', rewardCoins: 80, rewardXp: 0 },
    { id: 'own-25', title: 'Schatzkammer', detail: 'Besitze 25 verschiedene Gegenstände', progress: uniqueOwned, goal: 25, icon: '◆', rewardCoins: 70, rewardXp: 40 },
    { id: 'games-100', title: 'Arcade-Legende', detail: 'Schließe 100 Minispiele ab', progress: data.stats.games, goal: 100, icon: '▲', rewardCoins: 90, rewardXp: 60 },
    { id: 'full-style', title: 'Stilsicher', detail: 'Sammle alle Teile eines Outfit-Stils', progress: stylesOwned > 0 ? 1 : 0, goal: 1, icon: '✧', rewardCoins: 35, rewardXp: 25 },
    { id: 'all-rooms', title: 'Hausrundgang', detail: `Besuche alle ${ROOM_LIST.length} Räume`, progress: data.visitedRooms.length, goal: ROOM_LIST.length, icon: '⌂', rewardCoins: 20, rewardXp: 15 },
  ];
  const collections = COLLECTIONS.map((c) => ({ ...c, have: c.items.filter((i) => data.owned.includes(i)).length }));
  function claimCollection(id: string) {
    const c = collections.find((x) => x.id === id);
    if (!c || c.have < c.items.length || data.claimedAchievements.includes(id)) return;
    setData((old) => old.claimedAchievements.includes(id) ? old : advanceDaily({ ...old, coins: old.coins + c.rewardCoins, xp: old.xp + c.rewardXp, claimedAchievements: [...old.claimedAchievements, id] }, 'coins', c.rewardCoins));
    notify(`Sammlung ${c.name} komplett: +${c.rewardCoins} Münzen.`); sound(880);
  }
  function awardWorld(coins:number,xp:number) {
    setData(old=>advanceDaily({...old,coins:old.coins+coins,xp:old.xp+xp},'coins',coins));
    notify(`Weltaufgabe abgeschlossen: +${coins} Münzen und +${xp} XP.`);sound(940,{dur:.2,slide:1240});
  }
  function claimWorldReward(id:string,_name:string,coins:number,xp:number) {
    setData(old=>old.world.claimedRewards.includes(id)?old:advanceDaily({...old,coins:old.coins+coins,xp:old.xp+xp,world:{...old.world,claimedRewards:[...old.world.claimedRewards,id]}},'coins',coins));
    notify('Einmalige Sammlungsbelohnung abgeholt.');sound(880);
  }
  function claimAchievement(id: string) {
    const a = achievements.find((item) => item.id === id);
    if (!a || a.progress < a.goal || data.claimedAchievements.includes(id)) return;
    setData((old) => old.claimedAchievements.includes(id) ? old : advanceDaily({ ...old, coins: old.coins + a.rewardCoins, xp: old.xp + a.rewardXp, claimedAchievements: [...old.claimedAchievements, id] }, 'coins', a.rewardCoins));
    notify(`Erfolg abgeholt: +${a.rewardCoins} Münzen.`);
  }
  const roomDecor = data.roomItems.map(itemById).filter(Boolean) as Item[];
  const ownedToys = data.owned.filter((id) => TOY_USE[id]);
  const bgKey = data.activeBackground === 'classic' ? ROOM_BG[data.room] : undefined;
  const bg = bgKey ? BACKGROUNDS[bgKey] : null;
  const currentGame = GAMES.find((g) => g.id === activeGame);
  const teddyBeside = data.owned.includes('teddy') && data.room === 'Schlafzimmer';
  const speech = sleeping ? (teddyBeside ? 'Zzz… *kuschelt den Teddy*' : 'Zzz…') : mood === 'hungry' ? 'Bro, ich hab Hunger.' : mood === 'tired' ? 'Ich bin so müde.' : mood === 'dirty' ? 'Ich rieche… interessant.' : mood === 'sad' ? 'Spielst du mit mir?' : petSpeech;
  const ownedOf = (type: Item['type']) => data.owned.filter((id) => itemById(id)?.type === type);

  const scene = <section
    ref={roomRef}
    className={`room-card phase-${phase} ${bg ? 'has-photo' : `room-${data.room.toLowerCase()} background-${data.activeBackground}`} ${data.room === 'Schlafzimmer' && !data.settings.lampOn ? 'room-dark' : ''} ${data.room === 'Schlafzimmer' && (phase === 'abend' || phase === 'nacht') ? 'room-cozy' : ''}`}
    style={bg ? { ['--bg-pos' as string]: bg.pos, ['--bg-pos-m' as string]: bg.mobilePos } : undefined} data-testid="room-scene">
    {bg ? <picture key={bgKey} className="room-photo"><source srcSet={bg.src} type="image/webp"/><img src={bg.fallback} alt=""/></picture>
      : <div key={data.room + data.activeBackground} className="room-css"><div className="room-sky"/><div className="room-floor"/><div className="room-window"/><div className="room-art">W</div><div className="rug"/></div>}
    {roomDecor.map((item, i) => <div className="room-item" key={item.id} style={{ left: `${8 + i * 15}%` }}>{item.icon}</div>)}
    {data.owned.includes('bowl') && <img src={itemById('bowl')!.img} alt="Futternapf" className="scene-bowl"/>}
    <div className="room-badge">{data.room}</div>
    <div className="pet-speech" key={speech} data-testid="text-pet-speech">{speech}</div>
    {data.room === 'Schlafzimmer' && <button className="button small room-light" onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, lampOn: !old.settings.lampOn } }))} data-testid="button-bedroom-light">{data.settings.lampOn ? 'Licht aus' : 'Licht an'}</button>}
    <div className="room-phase" data-testid="status-day-phase">{phase === 'morgen' || phase === 'tag' ? <Sun size={13}/> : phase === 'abend' ? <Sunset size={13}/> : <Moon size={13}/>}{PHASE_INFO[phase].name}</div>
    {teddyBeside && <img src={itemById('teddy')!.img} alt="Teddy am Schlafplatz" className={`scene-teddy ${sleeping ? 'is-snuggled' : ''}`} data-testid="img-teddy-bed"/>}
    <div className="pet-anchor">
      <div className={`pet-runner ${run.flip ? 'flip' : ''}`} style={{ transform: `translateX(${run.dx}px)` }}>
        <div className="pet-facing">
          <Scottchi mood={mood} equipped={data.equipped} action={petAction} sleeping={sleeping} onTap={pet} idle={idleStyle}/>
          {chewing && <img src={itemById('bone-toy')!.img} alt="" className="chew-bone" data-testid="img-chew-bone"/>}
        </div>
        {petAction === 'washing' && <div className="bubbles" aria-hidden><i/><i/><i/><i/><i/></div>}
        {petAction === 'eating' && <div className="crumbs" aria-hidden><i/><i/><i/><i/></div>}
        {sleeping && <div className="zzz" aria-hidden><i>z</i><i>z</i><i>Z</i></div>}
      </div>
    </div>
    {toyFx && <img key={toyFx.key} src={itemById(toyFx.id)?.img} alt="" className={`toy-fx fx-${toyFx.fx}`}/>}
    {flight && <FlyingToy key={flight.key} t={flight} duration={flight.kind === 'ball' ? 850 : 1000} onLand={toyLanded}/>}
    {aim && <AimLayer kind={aim} onThrow={(f, t) => throwToy(aim, f, t)} onCancel={() => setAim(null)}/>}
    {ownedToys.length > 0 && <div className="toy-tray" aria-label="Spielzeug benutzen">{ownedToys.map((id) => { const it = itemById(id)!; const locked = !!TOY_USE[id].room && TOY_USE[id].room !== data.room; return <button key={id} className={`toy-btn ${locked ? 'locked' : ''} ${aim === id ? 'aiming' : ''}`} onClick={() => playToy(id)} title={it.name} data-testid={`button-toy-${id}`}><img src={it.img} alt={it.name}/></button>; })}</div>}
    <div className="room-controls">{ROOM_LIST.map((room) => <button key={room} className={`room-chip ${data.room === room ? 'selected' : ''}`} onClick={() => changeRoom(room)} data-testid={`room-${room.toLowerCase()}`}>{room}</button>)}</div>
  </section>;

  return <div className={`app-shell ${activeGame ? 'in-game' : ''}`}>
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
        <div className="nav-card"><div className="nav-label">DEIN KLEINES UNIVERSUM</div><div className="nav-list">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setActiveGame(null); }} className={`nav-button ${page === id ? 'active' : ''}`} data-testid={`nav-${id}`}><Icon/>{label}</button>)}</div></div>
        <div className="side-note"><strong>Level {level} · Scottchi-Fan</strong><div className="progress-track"><span style={{ width: `${xpProgress}%` }}/></div><div style={{ marginTop: 7 }}>{xpProgress} / 100 XP bis zum nächsten Level</div></div>
      </aside>
      <main className="main">
        {!activeGame && <div className="main-head"><div><div className="eyebrow">{page === 'home' ? 'DEIN ZUHAUSE' : 'TAMASCOTTCHI'}</div><h1>{page === 'home' ? `Hallo, ${data.name}.` : page === 'shop' ? 'Der kleine Laden' : page === 'world' ? 'Scottchi World' : page === 'collections' ? 'Scottchi Collections' : page === 'online' ? 'Scottchi Online' : page === 'games' ? 'Spielzeit!' : page === 'closet' ? 'Kleiderschrank' : page === 'leaderboard' ? 'Bestenliste' : 'Erfolge'}</h1><div className="subline">{page === 'home' ? 'Tippe Scottchi an, wirf Spielzeug, wechsle das Zimmer.' : page === 'leaderboard' ? 'Nur deine Ergebnisse auf diesem Gerät.' : 'Ein gemütlicher Ort für Scottchi und dich.'}</div></div>
          {page === 'home' && <button className="button small" onClick={() => { setNameDraft(data.name); setModal('name'); }} data-testid="button-rename">Name ändern</button>}
        </div>}

        {page === 'home' && <>
          <div className="hero-grid">
            {scene}
            <section className="panel need-panel">
              <div className="panel-head"><h2 className="panel-title">{data.name}s Wohlgefühl</h2><span className={`mood-tag mood-${mood}`} data-testid="status-mood">{({ default: 'Entspannt', happy: 'Glücklich', hungry: 'Hungrig', tired: 'Müde', dirty: 'Schmutzig', sad: 'Traurig', excited: 'Aufgedreht' } as const)[mood]}</span></div>
              <div className="routine-strip" data-testid="routine-strip"><strong>{PHASE_INFO[phase].name}</strong><span>{PHASE_INFO[phase].tip}</span></div>
              {NEEDS.map(({ id, name, icon: Icon }) => <div className="need-row" key={id} data-testid={`need-${id}`}>
                <div className="need-icon"><Icon/></div><div><div className="need-label">{name}</div><div className="meter"><div className={`meter-fill ${data.needs[id] < 30 ? 'low' : data.needs[id] < 55 ? 'mid' : ''}`} style={{ transform: `scaleX(${data.needs[id] / 100})` }}/></div></div><div className="need-value">{data.needs[id]}%</div>
              </div>)}
              {data.room === 'Küche' && <div className="room-controls" style={{ position: 'static', flexWrap: 'wrap', margin: '0 0 3px' }} aria-label="Futter auswählen">
                {ITEMS.filter((item) => item.type === 'food' && item.effect === 'hunger').map((item) => <button key={item.id} className={`room-chip ${selectedFood === item.id ? 'selected' : ''}`} disabled={!data.inventory[item.id]} onClick={() => setSelectedFood(item.id)} data-testid={`food-choice-${item.id}`}>{item.name} · {data.inventory[item.id] || 0}</button>)}
              </div>}
              <div className="pet-actions">
                <button className="action-button" onClick={() => performNeed('hunger')} disabled={!ITEMS.some((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0)} data-testid="button-feed"><Utensils/>Füttern · {data.inventory[selectedFood] || 0}</button>
                <button className="action-button" onClick={() => performNeed('glueck')} data-testid="button-play-care"><Dumbbell/>Toben</button>
                <button className="action-button" onClick={() => performNeed('sauberkeit')} data-testid="button-bath"><Bath/>Baden {data.inventory.soap ? `· ${data.inventory.soap}` : ''}</button>
                <button className="action-button" onClick={pet} data-testid="button-cuddle"><Heart/>Kraulen</button>
                {data.room === 'Schlafzimmer' && <button className="action-button" onClick={sleep} data-testid="button-sleep"><Moon size={15}/>{sleeping ? 'Aufwachen' : 'Schlafen'}</button>}
              </div>
              {!ownedToys.length && <p className="subline">Spielzeug aus dem Laden erscheint direkt im Zimmer und lässt sich antippen.</p>}
              <div className="traits" data-testid="panel-personality">
                <div className="traits-head"><strong>Charakter</strong><span>{showsTrait ? `meist ${TRAITS.find((t) => t.id === trait)!.name.toLowerCase()}` : 'formt sich noch'}</span></div>
                {TRAITS.map((t) => <div key={t.id} className={`trait-row ${showsTrait && t.id === trait ? 'lead' : ''}`} title={t.hint} data-testid={`trait-${t.id}`}><span>{t.name}</span><div className="trait-bar"><i style={{ transform: `scaleX(${data.personality[t.id] / 100})` }}/></div></div>)}
              </div>
            </section>
          </div>
          <div className="section-grid">
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Heute für euch</h2><Gift size={18}/></div><div className="mission-list">{missions.map((m) => <div className="mission" key={m.id} data-testid={`mission-${m.id}`}><div className={`mission-check ${m.done ? 'done' : ''}`}>{m.done && <Check/>}</div><div><div className="mission-title">{m.title}</div><div className="mission-progress">{m.done ? 'Für heute erledigt' : `${m.progress} / ${m.target} · ${m.detail}`}</div></div><span className="reward">{m.done ? 'Erledigt' : m.reward}</span></div>)}</div></section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Eine Runde?</h2><button className="text-link" onClick={() => setPage('games')} data-testid="link-all-games">Alle Spiele</button></div><div className="game-list">{GAMES.slice(0, 4).map((g) => <button key={g.id} className="game-tile" onClick={() => openGame(g.id)} data-testid={`start-${g.id}`}><span className="game-name">{g.name}</span><span className="game-desc">{g.desc}</span><span className="game-best">Best {data.highscores[g.id] || 0}</span></button>)}</div></section>
          </div>
        </>}

        {page === 'world' && <World data={data} level={level} onChange={setData} award={awardWorld}/>}
        {page === 'collections' && <CollectionsPage data={data} onClaim={claimWorldReward}/>}
        {page === 'online' && <section className="panel online-preview" data-testid="online-preview"><div className="eyebrow">NICHT AKTIVIERT</div><h2 className="panel-title">Scottchi Online</h2><p>Die Freundesprofile, Codes und Besuche brauchen Anmeldung und sichere Serverberechtigungen. Hier gibt es noch keine Konten oder erfundenen Online-Spieler.</p><img src="/assets/online/friend-visit.webp" alt="Illustration zweier befreundeter Scottchis bei einem Besuch"/><div className="side-note"><strong>Für Phase 3 erst abstimmen</strong>Ein sicherer Start wäre Freundescodes und asynchrone Besuche über den vorhandenen Express- und PostgreSQL-Server. Vor Anmeldung oder größeren Backendänderungen klären wir Anbieter, Datenschutz und Kosten. Multiplayer ist nicht eingerichtet.</div></section>}
        {page === 'games' && (activeGame && currentGame
          ? <GameStage key={`${activeGame}-${memoryPairs}-${cupLevel}`} id={activeGame} name={currentGame.name} rules={currentGame.rules} best={data.highscores[activeGame] || 0}
              difficulty={activeGame === 'memory' ? memoryPairs : activeGame === 'bone' ? cupLevel : undefined} extras={data.owned}
              sound={sound} onRequestStart={requestStart} onComplete={completeGame} onExit={() => setActiveGame(null)}/>
          : <section className="page-grid">{GAMES.map((g) => <article className="panel game-card2" key={g.id} data-testid={`game-card-${g.id}`}>
            <div className="panel-head"><h2 className="panel-title">{g.name}</h2><span className="best-badge"><Trophy size={13}/> {data.highscores[g.id] || 0}</span></div>
            <p className="subline" style={{ minHeight: 32 }}>{g.desc}</p>
            {g.id === 'memory' && <div className="memory-difficulty">{[6, 8, 12].map((p) => <button key={p} className={`room-chip ${memoryPairs === p ? 'selected' : ''}`} onClick={() => setMemoryPairs(p)} data-testid={`memory-difficulty-${p}`}>{p === 6 ? 'Leicht' : p === 8 ? 'Mittel' : 'Schwer'} · {p}</button>)}</div>}
            {g.id === 'bone' && <div className="memory-difficulty">{['Leicht', 'Mittel', 'Schwer'].map((l, i) => <button key={l} className={`room-chip ${cupLevel === i ? 'selected' : ''}`} onClick={() => setCupLevel(i)} data-testid={`cups-difficulty-${i}`}>{l}</button>)}</div>}
            <div className="challenge-mini">{CHALLENGES.filter((c) => c.game === g.id).map((c) => <span key={c.id} className={data.challenges[c.id] ? 'done' : ''}><Target size={12}/> {c.title}</span>)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button className="button orange" onClick={() => setActiveGame(g.id)} data-testid={`button-start-${g.id}`}><Play size={14}/> Spielen</button></div>
          </article>)}</section>)}

        {page === 'shop' && <section className="panel"><div className="panel-head"><h2 className="panel-title">Ein paar gute Dinge</h2><span className="stat-pill"><Coins size={14}/>{data.coins}</span></div><div className="room-controls" style={{ position: 'static', margin: '0 0 14px', flexWrap: 'wrap' }}>{(['food', 'toy', 'accessory', 'room', 'background'] as const).map((tab) => <button className={`room-chip ${shopTab === tab ? 'selected' : ''}`} key={tab} onClick={() => setShopTab(tab)} data-testid={`shop-tab-${tab}`}>{tab === 'food' ? 'Futter & Pflege' : tab === 'toy' ? 'Spielzeug' : tab === 'accessory' ? 'Kleidung & Hüte' : tab === 'room' ? 'Zimmer' : 'Hintergründe'}</button>)}</div>
          <div className="page-grid">{ITEMS.filter((item) => item.type === shopTab).map((item) => <div className="shop-item" key={item.id} data-testid={`shop-item-${item.id}`}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.unlockLevel && level < item.unlockLevel ? `Ab Level ${item.unlockLevel} freigeschaltet` : item.type === 'food' ? `${item.amount}% ${NEEDS.find((n) => n.id === item.effect)?.name.toLowerCase()} · Vorrat: ${data.inventory[item.id] || 0}` : item.type === 'room' ? 'Dekoration für dein Zuhause' : item.type === 'background' ? 'Ersetzt das Zimmerbild durch ein Motiv' : item.type === 'toy' ? item.desc : SLOT_OF[item.id] === 'hat' ? 'Kopfbedeckung' : SLOT_OF[item.id] === 'outfit' ? 'Kleidung' : 'Accessoire'}</div></div><button className="button small" onClick={() => buy(item)} disabled={(item.type !== 'food' && data.owned.includes(item.id)) || (!!item.unlockLevel && level < item.unlockLevel)} data-testid={`button-buy-${item.id}`}><Coins size={13}/>{item.type !== 'food' && data.owned.includes(item.id) ? 'Gekauft' : item.unlockLevel && level < item.unlockLevel ? `Level ${item.unlockLevel}` : item.price}</button></div>)}</div>
        </section>}

        {page === 'closet' && <div className="closet-grid">
          <section className="panel closet-preview"><div className="panel-head"><h2 className="panel-title">Anprobe</h2></div>
            <div className="preview-stage"><Scottchi mood={mood} equipped={data.equipped} idle={idleStyle}/></div>
            <div className="style-sets"><div className="nav-label" style={{ padding: '12px 0 6px' }}>Outfit-Stile</div>
              {STYLE_SETS.map((s) => { const have = s.items.filter((i) => data.owned.includes(i)).length; const full = have === s.items.length; return <div key={s.id} className={`style-row ${full ? 'full' : ''}`} data-testid={`style-${s.id}`}>
                <ShirtIcon size={14}/><div className="item-info"><div className="mission-title">{s.name}{data.stylesWorn.includes(s.id) ? ' · getragen' : ''}</div><div className="mission-progress">{s.items.map((i) => itemById(i)?.name).join(' + ')} · {have}/{s.items.length}</div></div>
                <button className="button small" disabled={!full} onClick={() => wearStyle(s.items)} data-testid={`button-wear-style-${s.id}`}>Anziehen</button></div>; })}
            </div>
          </section>
          <div className="closet-lists">
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Kleidung & Hüte</h2><Sparkles size={18}/></div>{ownedOf('accessory').length ? ownedOf('accessory').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{SLOT_OF[id] === 'hat' ? 'Kopf' : SLOT_OF[id] === 'outfit' ? 'Körper' : SLOT_OF[id] === 'face' ? 'Gesicht' : 'Hals'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-equip-${id}`}>{data.equipped.includes(id) ? 'Ablegen' : 'Anziehen'}</button></div>; }) : <div className="empty-state">Noch nichts im Schrank. Im Laden warten Hüte, Hoodies und mehr.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Spielzeug</h2><Gamepad2 size={18}/></div>{ownedOf('toy').length ? ownedOf('toy').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.desc}</div></div>{TOY_USE[id] ? <button className="button small" onClick={() => { setPage('home'); playToy(id); }} data-testid={`button-use-${id}`}>Benutzen</button> : <span className="reward">Aktiv</span>}</div>; }) : <div className="empty-state">Ball, Ente, Seil und Co. findest du im Laden.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Zimmerstücke</h2><House size={18}/></div>{ownedOf('room').length ? ownedOf('room').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.roomItems.includes(id) ? 'Steht schon im Zimmer' : 'Passt gut ins Zimmer'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-place-${id}`}>{data.roomItems.includes(id) ? 'Wegräumen' : 'Aufstellen'}</button></div>; }) : <div className="empty-state">Mit einer Pflanze oder Lampe wird es gleich viel wohnlicher.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Hintergründe</h2><House size={18}/></div>{ownedOf('background').length ? ownedOf('background').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.activeBackground === id ? 'Aktiv · ersetzt die Zimmerbilder' : 'Zimmermotiv'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-background-${id}`}>{data.activeBackground === id ? 'Zimmerbild zeigen' : 'Anwenden'}</button></div>; }) : <div className="empty-state">Freischaltbare Zimmermotive findest du im Laden.</div>}</section>
          </div>
        </div>}

        {page === 'leaderboard' && <div className="page-grid">
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Persönliche Bestwerte</h2><Medal size={18}/></div>{GAMES.map((g) => <div className="leaderboard-row" key={g.id} data-testid={`highscore-${g.id}`}><span className="rank"><Trophy size={14}/></span><strong>{g.name}</strong><strong>{data.highscores[g.id] || 0} Pkt.</strong><button className="button small" onClick={() => openGame(g.id)} data-testid={`button-beat-${g.id}`}>Schlagen</button></div>)}</section>
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Deine stärksten Runden</h2><Trophy size={18}/></div><div className="side-note" style={{ margin: '0 0 12px' }}><strong>Geräte-lokale Bestenliste</strong>Hier stehen nur echte Spielrunden aus diesem Browser. Es gibt keine Online-Spieler und keinen Serverabgleich.</div>{topScore.length ? topScore.map((r, i) => <div className="leaderboard-row" key={r.id} data-testid={`score-row-${i}`}><span className="rank">#{i + 1}</span><div><strong>{GAMES.find((g) => g.id === r.game)?.name}</strong><div className="score-game">{new Date(r.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div><strong>{r.score} Pkt.</strong><Medal size={16}/></div>) : <div className="empty-state"><Trophy size={28}/><p>Noch keine Ergebnisse. Spiel eine Runde, deine echten Punkte erscheinen hier.</p><button className="button orange" onClick={() => setPage('games')} data-testid="button-play-first">Zu den Spielen</button></div>}</section>
        </div>}

        {page === 'achievements' && <>
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Herausforderungen</h2><Target size={18}/></div><p className="subline" style={{ marginTop: 0 }}>Werden automatisch beim Erreichen belohnt, jede genau einmal.</p><div className="page-grid">{CHALLENGES.map((c) => <div className={`achievement ${data.challenges[c.id] ? '' : 'locked'}`} key={c.id} data-testid={`challenge-${c.id}`}><div className="item-icon">{data.challenges[c.id] ? <Check size={18}/> : <Target size={18}/>}</div><div className="item-info"><div className="item-title">{c.title}</div><div className="item-meta">{GAMES.find((g) => g.id === c.game)?.name} · {c.coins} Münzen · {c.xp} XP</div></div>{data.challenges[c.id] ? <span className="reward">Geschafft</span> : <button className="button small" onClick={() => openGame(c.game)} data-testid={`button-try-${c.id}`}>Versuchen</button>}</div>)}</div></section>
          <section className="panel" style={{ marginTop: 16 }} data-testid="panel-collections"><div className="panel-head"><h2 className="panel-title">Sammlungen</h2><Library size={18}/></div><p className="subline" style={{ marginTop: 0 }}>{uniqueOwned} verschiedene Gegenstände im Besitz. Komplette Sammlungen bringen eine einmalige Belohnung.</p><div className="page-grid">{collections.map((c) => <div className={`achievement ${c.have < c.items.length ? 'locked' : ''}`} key={c.id} data-testid={`collection-${c.id}`}>
            <div className="collection-thumbs">{c.items.slice(0, 4).map((i) => { const it = itemById(i)!; return <span key={i} className={data.owned.includes(i) ? 'have' : ''}>{it.img ? <img src={it.img} alt=""/> : it.icon}</span>; })}</div>
            <div className="item-info"><div className="item-title">{c.name}</div><div className="progress-track"><span style={{ width: `${c.have / c.items.length * 100}%` }}/></div><div className="item-meta">{c.have} / {c.items.length} · {c.rewardCoins} Münzen · {c.rewardXp} XP</div><div className="item-meta">{c.items.filter((i) => !data.owned.includes(i)).map((i) => itemById(i)?.name).join(', ') || 'Alles gesammelt'}</div></div>
            {c.have >= c.items.length ? data.claimedAchievements.includes(c.id) ? <span className="reward">Abgeholt</span> : <button className="button small" onClick={() => claimCollection(c.id)} data-testid={`button-claim-${c.id}`}>Abholen</button> : null}</div>)}</div></section>
          <section className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h2 className="panel-title">Kleine große Momente</h2><Award size={18}/></div><div className="page-grid">{achievements.map((item) => <div className={`achievement ${item.progress < item.goal ? 'locked' : ''}`} key={item.id} data-testid={`achievement-${item.id}`}><div className="item-icon">{item.progress >= item.goal ? item.icon : '·'}</div><div className="item-info"><div className="item-title">{item.title}</div><div className="item-meta">{item.detail}</div><div className="progress-track"><span style={{ width: `${Math.min(100, item.progress / item.goal * 100)}%` }}/></div><div className="item-meta">{Math.min(item.progress, item.goal)} / {item.goal} · Belohnung {item.rewardCoins} Münzen</div></div>{item.progress >= item.goal ? data.claimedAchievements.includes(item.id) ? <span className="reward">Abgeholt</span> : <button className="button small" onClick={() => claimAchievement(item.id)} data-testid={`button-claim-${item.id}`}>Abholen</button> : null}</div>)}</div></section>
        </>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Hauptnavigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setActiveGame(null); }} data-testid={`mobile-nav-${id}`}><Icon/><span>{label}</span></button>)}</nav>

    {modal === 'settings' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><div className="panel-head"><h2>Einstellungen & Spielstand</h2><button className="button small ghost" onClick={() => setModal(null)} data-testid="button-close-settings"><X/></button></div><div className="settings-stack">
      <div className="setting-row"><div><strong>Spielklänge</strong><small>Werden direkt im Browser erzeugt</small></div><button className={`switch ${data.settings.sound ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, sound: !old.settings.sound } }))} aria-label="Spielklänge umschalten" data-testid="switch-sound">{data.settings.sound ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <div className="setting-row"><div><strong>Hintergrundmusik</strong><small>Eine leise, selbst erzeugte Melodie</small></div><button className={`switch ${data.settings.music ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, music: !old.settings.music } }))} aria-label="Hintergrundmusik umschalten" data-testid="switch-music">{data.settings.music ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <label className="setting-row volume-row"><span><strong>Lautstärke</strong><small>{data.settings.volume}%</small></span><input type="range" min="0" max="100" value={data.settings.volume} aria-label="Lautstärke" data-testid="input-volume" onChange={(e) => setData((old) => ({ ...old, settings: { ...old.settings, volume: Number(e.target.value) } }))}/></label>
      <div className="setting-row"><div><strong>Spielstand exportieren</strong><small>Versionierter JSON-Spielstand</small></div><button className="button small" onClick={exportSave} data-testid="button-export"><Download size={14}/> Export</button></div>
      <div className="setting-row"><div><strong>Spielstand importieren</strong><small>Vorhandene tamascottchi-JSON laden</small></div><button className="button small" onClick={() => setModal('import')} data-testid="button-import"><Plus size={14}/> Import</button></div>
      <div className="setting-row"><div><strong>Neu anfangen</strong><small>Löscht diesen lokalen Spielstand</small></div><button className="button small orange" onClick={() => setModal('reset')} data-testid="button-reset">Zurücksetzen</button></div>
      <p className="subline">Autospeicherung ist aktiv. Dein Spielstand bleibt auf diesem Gerät. Vor dem 2.0-Update wurde eine Sicherung angelegt.</p>
    </div></section></div>}
    {modal === 'name' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wie soll Scottchi heißen?</h2><input className="input" value={nameDraft} maxLength={18} onChange={(e) => setNameDraft(e.target.value)} data-testid="input-pet-name"/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-rename">Abbrechen</button><button className="button orange" onClick={() => { setData((old) => ({ ...old, name: nameDraft.trim() || 'Wuschel' })); setModal(null); }} data-testid="button-save-name">Speichern</button></div></section></div>}
    {modal === 'import' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Spielstand importieren</h2><p>Wähle die JSON-Datei, die du zuvor exportiert hast.</p><input ref={fileRef} type="file" accept="application/json,.json" className="input" data-testid="input-import-file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void file.text().then(setFileText); }}/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-import">Abbrechen</button><button className="button orange" onClick={importSave} disabled={!fileText} data-testid="button-confirm-import">Spielstand laden</button></div></section></div>}
    {modal === 'reset' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wirklich von vorn?</h2><p>Scottchi, Münzen, Ergebnisse und alle Gegenstände auf diesem Gerät werden gelöscht. Diese Aktion lässt sich nicht rückgängig machen.</p><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-reset">Abbrechen</button><button className="button orange" onClick={resetGame} data-testid="button-confirm-reset">Spielstand löschen</button></div></section></div>}
    {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
  </div>;
}

export default App;
