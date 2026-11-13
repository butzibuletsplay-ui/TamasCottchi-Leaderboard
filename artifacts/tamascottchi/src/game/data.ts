import type { Mood } from './assets';
import { hatUrl, neckUrl, outfitUrl, toyUrl } from './assets';
import type { GameId } from './engine';
import { absenceDecay, initialPersonality, type Personality } from './personality';

export type Room = 'Wohnzimmer' | 'Küche' | 'Bad' | 'Schlafzimmer' | 'Spielzimmer';
export type NeedKey = 'hunger' | 'glueck' | 'energie' | 'sauberkeit';
export type GameRecord = { id: string; game: GameId; score: number; date: number };
export type Item = { id: string; name: string; icon: string; price: number; type: 'food' | 'toy' | 'accessory' | 'room' | 'background'; effect?: NeedKey; amount?: number; unlockLevel?: number; img?: string; desc?: string };
export type DailyProgress = { feeds: number; games: number; baths: number; pets: number; coins: number };
export type PetData = {
  version: number; saveSchema?: number; name: string; needs: Record<NeedKey, number>; lastUpdated: number;
  coins: number; xp: number; inventory: Record<string, number>; owned: string[];
  equipped: string[]; room: Room; roomItems: string[]; activeBackground: string; records: GameRecord[];
  sleepUntil: number | null;
  stats: { games: number; catches: number; taps: number; care: number; rooms: number; purchases: number; toys: number };
  daily: DailyProgress; missions: Record<string, boolean>; claimedAchievements: string[]; missionsDate: string;
  settings: { sound: boolean; music: boolean; volume: number; lampOn: boolean };
  highscores: Partial<Record<GameId, number>>;
  challenges: Record<string, number>;
  // ---- additive save fields ----
  personality?: Personality;
  visitedRooms?: Room[];
  routine?: { greetedDate: string; surpriseDate: string; surprises: number; lastSeen: number };
  stylesWorn?: string[];
  world?: {
    discoveredLocations: string[];
    completedQuests: string[];
    discoveries: string[];
    questProgress: Record<string, number>;
    claimedRewards: string[];
  };
  collectionIds?: string[];
};
export type FullPetData = PetData & Required<Pick<PetData, 'personality' | 'visitedRooms' | 'routine' | 'stylesWorn' | 'world' | 'collectionIds'>>;

export const STORE_KEY = 'tamascottchi-save-v1';
export const BACKUP_KEY = 'tamascottchi-save-v1-backup-before-2.0';
export const BACKUP_KEY_21 = 'tamascottchi-save-v1-backup-before-2.1';
export const BACKUP_KEY_30 = 'tamascottchi-save-v1-backup-before-3.0';
export const SAVE_SCHEMA = 4;
export const LOCATIONS = [
  { id: 'park', name: 'Scottchi Park', level: 1, point: { x: 25, y: 29 }, desc: 'Der erste Spaziergang: Wege, Wiesen und verlorene Knochen.' },
  { id: 'city', name: 'Scottchi City', level: 3, point: { x: 45, y: 53 }, desc: 'Ein lebendiger Platz für kleine Besorgungen.' },
  { id: 'forest', name: 'Scottchi Forest', level: 5, point: { x: 78, y: 20 }, desc: 'Lichter zwischen den Bäumen und versteckte Schätze.' },
  { id: 'beach', name: 'Scottchi Beach', level: 8, point: { x: 79, y: 78 }, desc: 'Muscheln, warme Sonne und frische Seeluft.' },
  { id: 'cave', name: 'Crystal Cave', level: 12, point: { x: 14, y: 81 }, desc: 'Eine geheimnisvolle Höhle mit seltenen Kristallen.' },
  { id: 'mountain', name: 'Mystery Mountain', level: 20, point: { x: 50, y: 8 }, desc: 'Der höchste Weg wartet auf erfahrene Entdecker.' },
] as const;
export const WORLD_QUESTS = [
  { id: 'park-bones', place: 'park', name: 'Die verlorenen Knochen', desc: 'Finde fünf Knochen im Park.', target: 5, coins: 50, xp: 30, discoveries: ['bone-cream'] },
  { id: 'park-picnic', place: 'park', name: 'Picknick im Grünen', desc: 'Sammle vier Dinge für ein Picknick.', target: 4, coins: 35, xp: 24, discoveries: ['frisbee-red', 'duck'] },
  { id: 'city-delivery', place: 'city', name: 'Paket für den Laden', desc: 'Finde die drei Pakete auf dem Platz.', target: 3, coins: 45, xp: 30, discoveries: ['key-gold','royal-cape','royal-armor','bell-trophy','scottchi-statue'] },
  { id: 'city-lanterns', place: 'city', name: 'Lichterfest', desc: 'Entdecke fünf Laternen in der Stadt.', target: 5, coins: 40, xp: 28, discoveries: ['crystal-rainbow','egg-crystal','egg-lava','treasure-chest'] },
] as const;
export const ROOM_LIST: Room[] = ['Wohnzimmer', 'Küche', 'Bad', 'Schlafzimmer', 'Spielzimmer'];
export const ROOM_BG: Partial<Record<Room, 'livingroom' | 'bathroom' | 'bedroom' | 'playroom'>> = { Wohnzimmer: 'livingroom', Bad: 'bathroom', Schlafzimmer: 'bedroom', Spielzimmer: 'playroom' };

export const GAMES: { id: GameId; name: string; desc: string; rules: string }[] = [
  { id: 'catch', name: 'Snack Catch', desc: 'Zieh Scottchi unter die fallenden Snacks. Drei Leben, Combos, steigendes Tempo.', rules: 'Ziehe Scottchi mit dem Finger. Gute Gegenstände geben Punkte, alle 5 Treffer in Folge steigt der Multiplikator. Matsch kostet ein Leben, Teddys heilen.' },
  { id: 'memory', name: 'Memory', desc: 'Finde alle Paare aus Scottchis Spielzeugkiste.', rules: 'Decke zwei Karten auf. Gleiche Paare bleiben offen. Serien und wenige Versuche bringen Bonus.' },
  { id: 'turbo', name: 'Turbo Tap', desc: '30 Sekunden Reaktionsaufgaben. Lesen, zielen, tippen.', rules: 'Scottchi stellt kurze Aufgaben. Richtige Ziele schnell treffen, falsche meiden. Fehler kosten Zeit, Uhren schenken Zeit.' },
  { id: 'bone', name: 'Glücksknochen', desc: 'Echtes Hütchenspiel: Folge dem Becher mit dem Knochen.', rules: 'Der Knochen wird unter einem Becher versteckt, dann werden die Becher sichtbar vertauscht. Acht Runden, drei Fehler erlaubt. Kein Einsatz, nur Augenmaß.' },
  { id: 'run', name: 'Scottchi Run', desc: 'Endlos laufen, springen, ducken, sammeln.', rules: 'Tippen zum Springen, nach unten wischen zum Ducken. Sammle Münzen, Knochen und Sterne. Drei Treffer und die Runde ist vorbei.' },
];

export const ITEMS: Item[] = [
  { id: 'kibble', name: 'Hundekeks', icon: '▤', price: 5, type: 'food', effect: 'hunger', amount: 12 },
  { id: 'apple', name: 'Apfel', icon: '◉', price: 8, type: 'food', effect: 'hunger', amount: 16 },
  { id: 'chicken', name: 'Hähnchenkeule', icon: '⌁', price: 15, type: 'food', effect: 'hunger', amount: 28 },
  { id: 'burger', name: 'Burger', icon: '▰', price: 25, type: 'food', effect: 'hunger', amount: 40 },
  { id: 'special', name: 'Spezialmenü', icon: '✦', price: 50, type: 'food', effect: 'hunger', amount: 60 },
  { id: 'soap', name: 'Schaumbad', icon: '◌', price: 9, type: 'food', effect: 'sauberkeit', amount: 35 },
  // toys (existing ids kept)
  { id: 'ball', name: 'Tennisball', icon: '●', price: 22, type: 'toy', img: toyUrl('tennisball'), desc: 'Werfen und Scottchi rennt hinterher' },
  { id: 'bone-toy', name: 'Kauknochen', icon: '⌁', price: 35, type: 'toy', img: toyUrl('bone'), desc: 'Knabbern macht richtig Laune' },
  { id: 'duck', name: 'Quietscheente', icon: '◉', price: 18, type: 'toy', img: toyUrl('duck'), desc: 'Quietscht beim Antippen' },
  { id: 'rope', name: 'Zerrseil', icon: '≈', price: 26, type: 'toy', img: toyUrl('rope'), desc: 'Tauziehen: viel Spaß, kostet Energie' },
  { id: 'frisbee', name: 'Frisbee', icon: '◎', price: 40, type: 'toy', img: toyUrl('frisbee'), desc: 'Werfen. Taucht auch in Snack Catch als x2-Bonus auf' },
  { id: 'teddy', name: 'Teddybär', icon: '●', price: 38, type: 'toy', img: toyUrl('teddy'), desc: 'Kuscheln. Im Schlafzimmer erholt sich Energie schneller' },
  { id: 'bowl', name: 'Futternapf', icon: '◡', price: 20, type: 'toy', img: toyUrl('bowl'), desc: 'Jede Mahlzeit sättigt 25 % mehr' },
  { id: 'shampoo', name: 'Shampoo', icon: '◌', price: 30, type: 'toy', img: toyUrl('shampoo'), desc: 'Im Bad: gründliche Wäsche ohne Seife (Abklingzeit)' },
  // clothing
  { id: 'baseballcap', name: 'Baseballcap', icon: '△', price: 28, type: 'accessory', img: hatUrl('baseballcap') },
  { id: 'beanie', name: 'Strickmütze', icon: '△', price: 26, type: 'accessory', img: hatUrl('beanie') },
  { id: 'party-hat', name: 'Partyhut', icon: '△', price: 30, type: 'accessory', img: hatUrl('party-hat') },
  { id: 'sleep-cap', name: 'Schlafmütze', icon: '⌂', price: 28, type: 'accessory', img: hatUrl('sleep-cap') },
  { id: 'bucket-hat', name: 'Fischerhut', icon: '△', price: 32, type: 'accessory', img: hatUrl('bucket-hat') },
  { id: 'cowboy-hat', name: 'Cowboyhut', icon: '△', price: 44, type: 'accessory', img: hatUrl('cowboy-hat'), unlockLevel: 2 },
  { id: 'wizard-hat', name: 'Zaubererhut', icon: '△', price: 58, type: 'accessory', img: hatUrl('wizard-hat'), unlockLevel: 3 },
  { id: 'crown', name: 'Königskrone', icon: '♛', price: 75, type: 'accessory', img: hatUrl('crown'), unlockLevel: 3 },
  { id: 'hoodie', name: 'Hoodie', icon: '▥', price: 46, type: 'accessory', img: outfitUrl('hoodie') },
  { id: 'striped-shirt', name: 'Ringelshirt', icon: '▥', price: 38, type: 'accessory', img: outfitUrl('striped-shirt') },
  { id: 'raincoat', name: 'Regenjacke', icon: '▥', price: 52, type: 'accessory', img: outfitUrl('raincoat') },
  { id: 'pajamas', name: 'Schlafanzug', icon: '▥', price: 40, type: 'accessory', img: outfitUrl('pajamas') },
  { id: 'cape', name: 'Heldenumhang', icon: '▥', price: 64, type: 'accessory', img: outfitUrl('cape'), unlockLevel: 2 },
  { id: 'tuxedo', name: 'Smoking', icon: '▥', price: 85, type: 'accessory', img: outfitUrl('tuxedo'), unlockLevel: 4 },
  { id: 'scarf', name: 'Sternenschal', icon: '≋', price: 48, type: 'accessory', img: neckUrl('scarf') },
  { id: 'collar', name: 'Halsband', icon: '◉', price: 34, type: 'accessory', img: neckUrl('collar') },
  { id: 'bow', name: 'Rote Schleife', icon: '≋', price: 24, type: 'accessory' },
  { id: 'sunglasses', name: 'Sonnenbrille', icon: '◉', price: 36, type: 'accessory' },
  // room + backgrounds (unchanged)
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
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const CHALLENGES: { id: string; game: GameId; title: string; test: (score: number, m: Record<string, number>) => boolean; coins: number; xp: number }[] = [
  { id: 'catch-30', game: 'catch', title: 'Fange 30 Snacks ohne Fehler', test: (_s, m) => (m.maxClean || 0) >= 30, coins: 30, xp: 25 },
  { id: 'catch-600', game: 'catch', title: 'Knacke 600 Punkte in Snack Catch', test: (s) => s >= 600, coins: 25, xp: 20 },
  { id: 'turbo-15', game: 'turbo', title: 'Erreiche 15 Treffer hintereinander', test: (_s, m) => (m.maxCombo || 0) >= 15, coins: 30, xp: 25 },
  { id: 'memory-12', game: 'memory', title: 'Gewinne Memory mit weniger als 12 Versuchen', test: (_s, m) => m.won === 1 && m.attempts < 12, coins: 30, xp: 25 },
  { id: 'run-60', game: 'run', title: 'Überlebe 60 Sekunden in Scottchi Run', test: (_s, m) => (m.seconds || 0) >= 60, coins: 35, xp: 30 },
  { id: 'bone-5', game: 'bone', title: 'Finde den Knochen 5-mal in Folge', test: (_s, m) => (m.maxStreak || 0) >= 5, coins: 30, xp: 25 },
];

/** Bounded rewards per round: coins and XP grow with score but are capped; after 15 rounds a day they are halved. */
export const REWARD_DIV: Record<GameId, number> = { catch: 12, memory: 5, turbo: 14, bone: 9, run: 12 };
export function rewardFor(game: GameId, score: number, gamesToday: number) {
  const div = REWARD_DIV[game];
  let coins = Math.max(2, Math.min(30, Math.floor(score / div)));
  let xp = Math.max(4, Math.min(35, Math.floor(score / (div * 0.8))));
  const reduced = gamesToday >= 15;
  if (reduced) { coins = Math.ceil(coins / 2); xp = Math.ceil(xp / 2); }
  return { coins, xp, reduced };
}

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export const levelFor = (xp: number) => Math.floor(xp / 100) + 1;
export const today = () => new Date().toLocaleDateString('de-DE');

export const initialData = (): FullPetData => ({
  version: 1, saveSchema: SAVE_SCHEMA, name: 'Wuschel', needs: { hunger: 78, glueck: 83, energie: 72, sauberkeit: 88 },
  lastUpdated: Date.now(), coins: 55, xp: 0, inventory: { kibble: 2, soap: 1 }, owned: [], equipped: [],
  room: 'Wohnzimmer', roomItems: [], activeBackground: 'classic', records: [], sleepUntil: null,
  stats: { games: 0, catches: 0, taps: 0, care: 0, rooms: 0, purchases: 0, toys: 0 },
  daily: { feeds: 0, games: 0, baths: 0, pets: 0, coins: 0 },
  missions: {}, claimedAchievements: [], missionsDate: today(),
  settings: { sound: true, music: false, volume: 65, lampOn: true },
  highscores: {}, challenges: {},
  personality: initialPersonality(), visitedRooms: ['Wohnzimmer'],
  routine: { greetedDate: '', surpriseDate: today(), surprises: 0, lastSeen: Date.now() }, stylesWorn: [],
  world: { discoveredLocations: [], completedQuests: [], discoveries: [], questProgress: {}, claimedRewards: [] }, collectionIds: [],
});

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Migrates any v1 save (and v1 with schema 2) into the current shape without dropping purchases. */
export function normalize(parsed: Partial<PetData>): FullPetData {
  const d = initialData();
  const now = Date.now();
  const away = Math.max(0, now - num(parsed.lastUpdated, now));
  const decay = (v: number) => absenceDecay(v, away);
  const sameDay = parsed.missionsDate === today();
  const records = Array.isArray(parsed.records) ? parsed.records.filter((r) => r && typeof r.score === 'number') : [];
  const highscores: PetData['highscores'] = { ...(parsed.highscores || {}) };
  for (const r of records) highscores[r.game] = Math.max(highscores[r.game] || 0, r.score);
  const needs = parsed.needs || d.needs;
  return {
    ...d, ...parsed,
    version: 1, saveSchema: SAVE_SCHEMA,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.slice(0, 18) : d.name,
    coins: Math.max(0, num(parsed.coins, d.coins)), xp: Math.max(0, num(parsed.xp, d.xp)),
    needs: {
      hunger: clamp(decay(num(needs.hunger, d.needs.hunger))), glueck: clamp(decay(num(needs.glueck, d.needs.glueck))),
      energie: clamp(decay(num(needs.energie, d.needs.energie))), sauberkeit: clamp(decay(num(needs.sauberkeit, d.needs.sauberkeit))),
    },
    inventory: { ...(parsed.inventory || d.inventory) },
    owned: Array.isArray(parsed.owned) ? [...new Set(parsed.owned)] : [],
    equipped: Array.isArray(parsed.equipped) ? parsed.equipped : [],
    roomItems: Array.isArray(parsed.roomItems) ? parsed.roomItems : [],
    room: ROOM_LIST.includes(parsed.room as Room) ? parsed.room as Room : d.room,
    records,
    stats: { ...d.stats, ...parsed.stats },
    daily: sameDay ? { ...d.daily, ...parsed.daily } : d.daily,
    missions: sameDay ? (parsed.missions || {}) : {},
    claimedAchievements: parsed.claimedAchievements || [],
    settings: { ...d.settings, ...parsed.settings },
    highscores, challenges: { ...(parsed.challenges || {}) },
    lastUpdated: now, missionsDate: today(),
    personality: { ...d.personality, ...(parsed.personality || {}) },
    visitedRooms: [...new Set([...(Array.isArray(parsed.visitedRooms) ? parsed.visitedRooms : []), ROOM_LIST.includes(parsed.room as Room) ? parsed.room as Room : d.room])].filter((r) => ROOM_LIST.includes(r)),
    routine: { ...d.routine, ...(parsed.routine || {}), lastSeen: num(parsed.routine?.lastSeen, num(parsed.lastUpdated, now)) },
    stylesWorn: Array.isArray(parsed.stylesWorn) ? parsed.stylesWorn : [],
    world: {
      discoveredLocations: [...new Set(parsed.world?.discoveredLocations || [])],
      completedQuests: [...new Set(parsed.world?.completedQuests || [])],
      discoveries: [...new Set(parsed.world?.discoveries || [])],
      questProgress: { ...(parsed.world?.questProgress || {}) },
      claimedRewards: [...new Set(parsed.world?.claimedRewards || [])],
    },
    collectionIds: [...new Set(parsed.collectionIds || [])],
  };
}

/** Throws a readable error for anything that is not a recognisable tamascottchi save. */
export function assertSave(v: unknown): asserts v is Partial<PetData> {
  const p = v as Partial<PetData>;
  const isObj = (o: unknown) => !!o && typeof o === 'object' && !Array.isArray(o);
  if (!isObj(p)) throw new Error('Kein Objekt');
  if (p.version !== 1) throw new Error('Unbekannte Version');
  if (!isObj(p.needs) || !isObj(p.stats)) throw new Error('Bedürfnisse oder Statistik fehlen');
  if (p.coins !== undefined && !Number.isFinite(p.coins)) throw new Error('Münzen ungültig');
  if (p.xp !== undefined && !Number.isFinite(p.xp)) throw new Error('XP ungültig');
  for (const k of ['owned', 'equipped', 'records', 'roomItems'] as const) if (p[k] !== undefined && !Array.isArray(p[k])) throw new Error(`${k} ungültig`);
  if (p.inventory !== undefined && !isObj(p.inventory)) throw new Error('Inventar ungültig');
}

export class SaveLoadError extends Error { raw: string; constructor(message: string, raw: string, cause?: unknown) { super(message, { cause }); this.raw = raw; } }

export function loadData(): FullPetData {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return initialData();
  try {
    const parsed: unknown = JSON.parse(raw);
    assertSave(parsed);
    // untouched copies before each schema change, written once, never overwritten
    if (!parsed.saveSchema && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, raw);
    if ((parsed.saveSchema || 0) < 3 && !localStorage.getItem(BACKUP_KEY_21)) localStorage.setItem(BACKUP_KEY_21, raw);
    if ((parsed.saveSchema || 0) < SAVE_SCHEMA && !localStorage.getItem(BACKUP_KEY_30)) localStorage.setItem(BACKUP_KEY_30, raw);
    return normalize(parsed);
  } catch (cause) {
    // Never replace an unreadable save with a new game through the autosave effect.
    throw new SaveLoadError(`Dein gespeicherter Spielstand konnte nicht gelesen werden (${(cause as Error)?.message || 'unbekannter Fehler'}). Er wurde nicht überschrieben.`, raw, cause);
  }
}

// ---- 2.1 collections + style sets ----
export const COLLECTIONS: { id: string; name: string; items: string[]; rewardCoins: number; rewardXp: number }[] = [
  { id: 'col-hats', name: 'Hüte', items: ['baseballcap', 'beanie', 'party-hat', 'sleep-cap', 'bucket-hat', 'cowboy-hat'], rewardCoins: 40, rewardXp: 30 },
  { id: 'col-clothes', name: 'Kleidung', items: ['hoodie', 'striped-shirt', 'raincoat', 'pajamas'], rewardCoins: 40, rewardXp: 30 },
  { id: 'col-toys', name: 'Spielzeug', items: ['ball', 'bone-toy', 'duck', 'rope', 'frisbee', 'teddy', 'bowl', 'shampoo'], rewardCoins: 45, rewardXp: 35 },
  { id: 'col-decor', name: 'Zimmerdekoration', items: ['plant', 'lamp', 'cushion', 'rug', 'plush', 'poster', 'forest', 'beach', 'night', 'fantasy'], rewardCoins: 50, rewardXp: 40 },
  { id: 'col-rare', name: 'Seltene Accessoires', items: ['crown', 'wizard-hat', 'cape', 'tuxedo', 'scarf', 'collar', 'bow', 'sunglasses'], rewardCoins: 60, rewardXp: 50 },
];
export const STYLE_SETS: { id: string; name: string; items: string[] }[] = [
  { id: 'regentag', name: 'Regentag', items: ['raincoat', 'bucket-hat', 'scarf'] },
  { id: 'gute-nacht', name: 'Gute Nacht', items: ['pajamas', 'sleep-cap'] },
  { id: 'gala', name: 'Gala', items: ['tuxedo', 'crown', 'bow'] },
  { id: 'held', name: 'Held', items: ['cape', 'wizard-hat', 'collar'] },
  { id: 'freizeit', name: 'Freizeit', items: ['hoodie', 'baseballcap', 'sunglasses'] },
  { id: 'ringel', name: 'Ringel', items: ['striped-shirt', 'beanie', 'scarf'] },
];

/** Mood priority: sleeping > (excited unless critical) > lowest need under 30 > happy > default. */
export function moodFor(needs: PetData['needs'], excited: boolean, sleeping: boolean): Mood {
  if (sleeping) return 'tired';
  const lows: [number, Mood][] = ([[needs.hunger, 'hungry'], [needs.energie, 'tired'], [needs.sauberkeit, 'dirty'], [needs.glueck, 'sad']] as [number, Mood][]).filter(([v]) => v < 30);
  if (excited && !lows.some(([v]) => v < 15)) return 'excited';
  if (lows.length) return lows.sort((a, b) => a[0] - b[0])[0][1];
  if (Object.values(needs).every((v) => v > 70)) return 'happy';
  return 'default';
}
