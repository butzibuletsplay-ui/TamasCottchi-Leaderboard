import type { Mood } from './assets';
import { hatUrl, itemAsset, neckUrl, outfitUrl, toyUrl } from './assets';
import type { GameId } from './engine';
import { absenceDecay, initialPersonality, type Personality } from './personality';
import { worldDayKey, worldWeekKey } from './worldClock';
import { COLLECTION_ITEMS, COLLECTION_ITEM_LINKS } from './collectionWorld';
import { CHEST_TIERS, MAX_PLAYER_XP, migrateLegacyPlayerXp, playerLevelForXp, type RewardChestTier } from '@workspace/game-economy';

export type Room = 'Wohnzimmer' | 'Küche' | 'Bad' | 'Schlafzimmer' | 'Spielzimmer';
export type NeedKey = 'hunger' | 'glueck' | 'energie' | 'sauberkeit';
export type GameRecord = { id: string; game: GameId; score: number; date: number };
export type ItemType = 'food' | 'toy' | 'accessory' | 'room' | 'background' | 'material';
export type { RewardChestTier } from '@workspace/game-economy';
export type RewardChestInstance = { id: string; tier: RewardChestTier; source: string; earnedAt: number };
export type Item = {
  id: string; name: string; icon: string; price: number; type: ItemType; effect?: NeedKey; amount?: number;
  effects?: Partial<Record<NeedKey, number>>; unlockLevel?: number; img?: string; desc?: string;
  rarity?: 'Gewöhnlich' | 'Ungewöhnlich' | 'Selten' | 'Episch' | 'Legendär';
  origin?: string; purpose?: string; stackable?: boolean; craftOnly?: boolean;
  milestoneOnly?: boolean;
};
export type DailyProgress = { feeds: number; games: number; baths: number; pets: number; coins: number };
export type JournalEntry = { id: string; date: number; icon: string; title: string; detail: string };
export type WorldEventState = { id: string; day: string; locationId: string; resourceId: string; quantity: number };
export type PetData = {
  version: number; saveSchema?: number; economyVersion?: number; name: string; needs: Record<NeedKey, number>; lastUpdated: number;
  coins: number; xp: number; inventory: Record<string, number>; owned: string[];
  equipped: string[]; room: Room; roomItems: string[]; activeBackground: string; records: GameRecord[];
  sleepUntil: number | null;
  stats: { games: number; catches: number; taps: number; care: number; rooms: number; purchases: number; toys: number };
  daily: DailyProgress; missions: Record<string, boolean>; claimedAchievements: string[]; missionsDate: string;
  settings: { sound: boolean; music: boolean; volume: number; lampOn: boolean };
  highscores: Partial<Record<GameId, number>>;
  challenges: Record<string, number>;
  journal?: JournalEntry[];
  roomPlacements?: Record<string, { x: number; y: number }>;
  tutorialSeen?: boolean;
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
    activeQuests?: string[];
    questFinds?: Record<string, number[]>;
    questStages?: Record<string, string>;
    resourceCollectedAt?: Record<string, number>;
    worldDay?: string;
    dailyGoals?: string[];
    dailyMetrics?: Record<string, number>;
    dailyClaimed?: string[];
    dailyVisitedLocations?: string[];
    dailyMasteryGained?: number;
    weeklyKey?: string;
    weeklyMetrics?: Record<string, number>;
    weeklyClaimed?: string[];
    areaMastery?: Record<string, number>;
    worldEvent?: WorldEventState | null;
    worldEventClaimedDay?: string;
    fishingRewardsToday?: number;
    lastKnownWorldTime?: number;
    rewardChests?: Partial<Record<RewardChestTier, number>>;
    keys?: Partial<Record<RewardChestTier, number>>;
    chestInstances?: RewardChestInstance[];
    openedChestIds?: string[];
    dailyChestCount?: number;
    dailyChestLocations?: string[];
    regionDailyProgress?: Record<string, { materials: number; activities: number; rare: number }>;
    weeklyChestClaimed?: boolean;
    milestoneChestsClaimed?: string[];
    pendingDiscoveries?: Array<{ artifactId: string; locationId: string; questId: string }>;
    petPosition: { x: number; y: number };
  };
  collectionIds?: string[];
  artifactLevels?: Record<string, number>;
  equippedArtifacts?: string[];
  artifactUpgradeCount?: number;
};
export type FullPetData = PetData
  & Required<Pick<PetData, 'personality' | 'visitedRooms' | 'routine' | 'stylesWorn' | 'world' | 'collectionIds' | 'journal' | 'roomPlacements' | 'tutorialSeen'>>
  & Required<Pick<PetData, 'artifactLevels' | 'equippedArtifacts' | 'artifactUpgradeCount'>>
  & { world: Required<NonNullable<PetData['world']>> & Required<Pick<NonNullable<PetData['world']>,
    'resourceCollectedAt' | 'worldDay' | 'dailyGoals' | 'dailyMetrics' | 'dailyClaimed' | 'dailyVisitedLocations' |
    'dailyMasteryGained' | 'weeklyKey' | 'weeklyMetrics' | 'weeklyClaimed' | 'areaMastery' | 'worldEvent' | 'worldEventClaimedDay' |
    'fishingRewardsToday' | 'lastKnownWorldTime' | 'rewardChests' | 'keys' | 'chestInstances' | 'openedChestIds' | 'dailyChestCount' | 'dailyChestLocations' |
    'regionDailyProgress' | 'weeklyChestClaimed' | 'milestoneChestsClaimed' | 'pendingDiscoveries'>> };

export const STORE_KEY = 'tamascottchi-save-v1';
export const BACKUP_KEY = 'tamascottchi-save-v1-backup-before-2.0';
export const BACKUP_KEY_21 = 'tamascottchi-save-v1-backup-before-2.1';
export const BACKUP_KEY_30 = 'tamascottchi-save-v1-backup-before-3.0';
export const BACKUP_KEY_40 = 'tamascottchi-save-v1-backup-before-4.0';
export const BACKUP_KEY_60 = 'tamascottchi-save-v1-backup-before-6.0';
export const BACKUP_KEY_61 = 'tamascottchi-save-v1-backup-before-6.1';
export const BACKUP_KEY_62 = 'tamascottchi-save-v1-backup-before-6.2';
export const BACKUP_KEY_63 = 'tamascottchi-save-v1-backup-before-6.3';
export const BACKUP_KEY_64 = 'tamascottchi-save-v1-backup-before-6.4';
export const SAVE_SCHEMA = 10;
export const LOCATIONS = [
  { id: 'park', name: 'Scottchi Park', level: 1, point: { x: 25, y: 29 }, desc: 'Der erste Spaziergang: Wege, Wiesen und verlorene Knochen.' },
  { id: 'city', name: 'Scottchi City', level: 3, point: { x: 45, y: 53 }, desc: 'Ein lebendiger Platz für kleine Besorgungen.' },
  { id: 'forest', name: 'Scottchi Forest', level: 5, point: { x: 78, y: 20 }, desc: 'Lichter zwischen den Bäumen und versteckte Schätze.' },
  { id: 'beach', name: 'Scottchi Beach', level: 8, point: { x: 79, y: 78 }, desc: 'Muscheln, warme Sonne und frische Seeluft.' },
  { id: 'cave', name: 'Crystal Cave', level: 12, point: { x: 14, y: 81 }, desc: 'Eine geheimnisvolle Höhle mit seltenen Kristallen.' },
  { id: 'mountain', name: 'Mystery Mountain', level: 20, point: { x: 50, y: 8 }, desc: 'Der höchste Weg wartet auf erfahrene Entdecker.' },
] as const;
export type WorldQuestDefinition = {
  id: string; place: string; name: string; desc: string; target: number; coins: number; xp: number;
  discoveries: string[]; loot: string; sequence?: number[]; requiresAction?: string; itemReward?: string;
  actionLoot?: { id: string; quantity: number };
};
export const WORLD_QUESTS: WorldQuestDefinition[] = [
  { id: 'park-bones', place: 'park', name: 'Die verlorenen Knochen', desc: 'Finde fünf versteckte Knochen im Park.', target: 5, coins: 50, xp: 30, discoveries: ['bone-cream'], loot: 'bone-scrap' },
  { id: 'park-picnic', place: 'park', name: 'Picknick im Grünen', desc: 'Sammle vier Dinge für ein Picknick.', target: 4, coins: 35, xp: 24, discoveries: ['frisbee-red', 'duck'], loot: 'wood' },
  { id: 'park-lost-toy', place: 'park', name: 'Das verschwundene Spielzeug', desc: 'Untersuche drei Hinweise und spiele danach im Zimmer mit dem gefundenen Ball.', target: 3, coins: 100, xp: 50, discoveries: ['tennisball-green'], loot: 'cloth', requiresAction: 'use:ball', itemReward: 'ball' },
  { id: 'city-delivery', place: 'city', name: 'Paket für den Laden', desc: 'Finde drei Pakete auf dem Platz.', target: 3, coins: 45, xp: 30, discoveries: ['key-gold', 'royal-cape', 'royal-armor'], loot: 'cloth' },
  { id: 'city-lanterns', place: 'city', name: 'Lichterfest', desc: 'Entdecke fünf Laternen in der Stadt.', target: 5, coins: 40, xp: 28, discoveries: ['crystal-rainbow', 'egg-crystal', 'egg-lava'], loot: 'crystal-shard' },
  { id: 'forest-wood', place: 'forest', name: 'Holz für die Werkstatt', desc: 'Sammle fünf heruntergefallene Äste. Die Bäume bleiben unberührt.', target: 5, coins: 55, xp: 35, discoveries: ['clover', 'key-gold'], loot: 'wood' },
  { id: 'forest-riddle', place: 'forest', name: 'Das Lichtzeichen', desc: 'Tippe die vier Lichtpunkte in der angezeigten Reihenfolge 3 → 1 → 4 → 2.', target: 4, coins: 65, xp: 40, discoveries: ['rope-red'], loot: 'gold-fragment', sequence: [2, 0, 3, 1] },
  { id: 'beach-shells', place: 'beach', name: 'Muscheln am Ufer', desc: 'Sammle fünf Muscheln am Strand.', target: 5, coins: 55, xp: 35, discoveries: ['frisbee-red', 'duck'], loot: 'shell' },
  { id: 'beach-treasure', place: 'beach', name: 'Die vergrabene Truhe', desc: 'Finde drei Hinweise, lege die Truhe frei und öffne sie für ihren Schatz.', target: 3, coins: 75, xp: 45, discoveries: ['treasure-chest'], loot: 'rope-fiber', requiresAction: 'open:treasure', actionLoot: { id: 'gold-fragment', quantity: 1 } },
  { id: 'beach-frisbee', place: 'beach', name: 'Frisbee im Abendlicht', desc: 'Finde das Frisbee am Strand und wirf es danach im Spielzimmer.', target: 1, coins: 60, xp: 35, discoveries: ['frisbee-red'], loot: 'shell', requiresAction: 'use:frisbee', itemReward: 'frisbee' },
];
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
  { id: 'kibble', name: 'Hundekeks', icon: '▤', img: itemAsset('kibble'), price: 5, type: 'food', effect: 'hunger', amount: 12 },
  { id: 'apple', name: 'Apfel', icon: '◉', img: itemAsset('apple'), price: 8, type: 'food', effect: 'hunger', amount: 16 },
  { id: 'chicken', name: 'Hähnchenkeule', icon: '⌁', img: itemAsset('chicken'), price: 15, type: 'food', effect: 'hunger', amount: 28 },
  { id: 'burger', name: 'Burger', icon: '▰', img: itemAsset('burger'), price: 25, type: 'food', effect: 'hunger', amount: 40 },
  { id: 'special', name: 'Spezialmenü', icon: '✦', img: itemAsset('special'), price: 50, type: 'food', effect: 'hunger', amount: 60 },
  { id: 'soap', name: 'Schaumbad', icon: '◌', img: itemAsset('soap'), price: 9, type: 'food', effect: 'sauberkeit', amount: 35 },
  // toys (existing ids kept)
  { id: 'ball', name: 'Tennisball', icon: '●', price: 22, type: 'toy', img: toyUrl('tennisball'), desc: 'Werfen und Scottchi rennt hinterher' },
  { id: 'bone-toy', name: 'Kauknochen', icon: '⌁', price: 35, type: 'toy', img: toyUrl('bone'), desc: 'Knabbern macht richtig Laune' },
  { id: 'duck', name: 'Quietscheente', icon: '◉', price: 18, type: 'toy', img: toyUrl('duck'), desc: 'Quietscht beim Antippen' },
  { id: 'rope', name: 'Zerrseil', icon: '≈', price: 26, type: 'toy', img: toyUrl('rope'), desc: 'Tauziehen: viel Spaß, kostet Energie' },
  { id: 'frisbee', name: 'Frisbee', icon: '◎', price: 40, type: 'toy', img: toyUrl('frisbee'), desc: 'Werfen. Taucht auch in Snack Catch als x2-Bonus auf' },
  { id: 'teddy', name: 'Teddybär', icon: '●', price: 38, type: 'toy', img: toyUrl('teddy'), desc: 'Kuscheln. Im Schlafzimmer erholt sich Energie schneller' },
  { id: 'bowl', name: 'Futternapf', icon: '◡', price: 20, type: 'toy', img: toyUrl('bowl'), desc: 'Jede Mahlzeit sättigt 25 % mehr' },
  { id: 'shampoo', name: 'Shampoo', icon: '◌', price: 30, type: 'toy', img: toyUrl('shampoo'), desc: 'Einmal im Bad benutzen. Die Flasche wird dabei verbraucht.' },
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
  { id: 'plant', name: 'Fensterpflanze', icon: '♧', img: itemAsset('plant'), price: 30, type: 'room' },
  { id: 'lamp', name: 'Sonnenlampe', icon: '☼', img: itemAsset('lamp'), price: 42, type: 'room', unlockLevel: 2 },
  { id: 'cushion', name: 'Knautschkissen', icon: '▰', img: itemAsset('cushion'), price: 38, type: 'room', unlockLevel: 2 },
  { id: 'rug', name: 'Wolken-Teppich', icon: '▰', img: itemAsset('rug'), price: 35, type: 'room' },
  { id: 'plush', name: 'Kuschel-Freund', icon: '●', img: itemAsset('plush'), price: 32, type: 'room' },
  { id: 'poster', name: 'Wuschel-Poster', icon: '▤', img: itemAsset('poster'), price: 26, type: 'room' },
  { id: 'forest', name: 'Waldlichtung', icon: '♧', img: itemAsset('forest'), price: 44, type: 'background' },
  { id: 'beach', name: 'Sonniger Strand', icon: '≈', img: itemAsset('beach'), price: 54, type: 'background' },
  { id: 'night', name: 'Dunkles Zimmer', icon: '☾', img: itemAsset('night'), price: 48, type: 'background', unlockLevel: 2 },
  { id: 'fantasy', name: 'Fantasiewelt', icon: '✦', img: itemAsset('fantasy'), price: 68, type: 'background', unlockLevel: 3 },
  { id: 'bone-scrap', name: 'Knochenfund', icon: '●', img: itemAsset('bone-scrap'), price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Scottchi Park', purpose: 'Werkstoff für Spielzeug und Leckerlis', stackable: true },
  { id: 'wood', name: 'Astholz', icon: '▰', img: itemAsset('wood'), price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Park und Wald', purpose: 'Werkstoff für Spielzeug und Möbel', stackable: true },
  { id: 'cloth', name: 'Stoffstück', icon: '▧', img: itemAsset('cloth'), price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Park und Stadt', purpose: 'Werkstoff für Spielzeug und Schlafplätze', stackable: true },
  { id: 'crystal-shard', name: 'Kristallsplitter', icon: '◆', img: itemAsset('crystal-shard'), price: 0, type: 'material', rarity: 'Selten', origin: 'Crystal Cave', purpose: 'Seltenes Crafting-Material für Spielzeug und Dekoration', stackable: true },
  { id: 'gold-fragment', name: 'Goldstück', icon: '●', img: itemAsset('gold-fragment'), price: 0, type: 'material', rarity: 'Selten', origin: 'Stadt und Waldrätsel', purpose: 'Wertvolles Crafting-Material', stackable: true },
  { id: 'shell', name: 'Muschel', icon: '◉', price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Beach', purpose: 'Werkstoff für Stranddeko und Klangspielzeug', stackable: true },
  { id: 'rope-fiber', name: 'Seilfaser', icon: '≋', price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Scottchi Beach und Scottchi Forest', purpose: 'Werkstoff für Spielzeug und Dekoration', stackable: true },
  { id: 'mushroom', name: 'Waldpilz', icon: '●', price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Forest', purpose: 'Zutat für Wald-Leckerlis und Höhlenlampen', stackable: true },
  { id: 'leaf', name: 'Herbstblatt', icon: '◆', img: itemAsset('leaf'), price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Forest', purpose: 'Werkstoff für Bettchen und Spielzeug', stackable: true },
  { id: 'wildflower', name: 'Wiesenblume', icon: '✿', img: itemAsset('wildflower'), price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Scottchi Park und Scottchi Forest', purpose: 'Zutat für besondere Leckerlis und Deko', stackable: true },
  { id: 'pearl', name: 'Perle', icon: '●', price: 0, type: 'material', rarity: 'Selten', origin: 'Scottchi Beach', purpose: 'Wertvolle Zutat für Strandfunde und Deko', stackable: true },
  { id: 'driftwood', name: 'Treibholz', icon: '▰', price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Scottchi Beach', purpose: 'Werkstoff für langlebige Zimmerdeko', stackable: true },
  { id: 'ore', name: 'Berg-Erz', icon: '◆', price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Mystery Mountain', purpose: 'Werkstoff für robuste Spielzeuge und Lampen', stackable: true },
  { id: 'fossil', name: 'Fossilfund', icon: '●', price: 0, type: 'material', rarity: 'Selten', origin: 'Scottchi Beach und Mystery Mountain', purpose: 'Sammlerstück und Zutat für seltenes Spielzeug', stackable: true },
  { id: 'old-coin', name: 'Alte Münze', icon: '●', img: itemAsset('old-coin'), price: 0, type: 'material', rarity: 'Ungewöhnlich', origin: 'Scottchi City und Scottchi Park', purpose: 'Tauschgut für Werkstattrezepte', stackable: true },
  { id: 'berry', name: 'Waldbeere', icon: '●', img: itemAsset('berry'), price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Forest', purpose: 'Zutat für Scottchi-Leckerlis', stackable: true },
  { id: 'fish-common', name: 'Silberfisch', icon: '◆', price: 0, type: 'material', rarity: 'Gewöhnlich', origin: 'Scottchi Beach · Angeln', purpose: 'Zutat für nahrhafte Leckerlis', stackable: true },
  { id: 'fish-rare', name: 'Mondfisch', icon: '◆', price: 0, type: 'material', rarity: 'Selten', origin: 'Scottchi Beach · Angeln', purpose: 'Seltene Zutat für besondere Leckerlis', stackable: true },
  { id: 'artifact-dust', name: 'Artefaktstaub', icon: '✧', img: itemAsset('artifact-dust'), price: 0, type: 'material', rarity: 'Selten', origin: 'Doppelte Artefakte und Wochenaufträge', purpose: 'Wird für Artefakt-Upgrades eingesetzt.', stackable: true },
  { id: 'epic-essence', name: 'Epische Essenz', icon: '✦', price: 0, type: 'material', rarity: 'Episch', origin: 'Epische Artefakt-Duplikate und Meilensteine', purpose: 'Wertvolle Zutat für epische Artefakt-Upgrades.', stackable: true },
  { id: 'legendary-essence', name: 'Legendäre Essenz', icon: '✧', price: 0, type: 'material', rarity: 'Legendär', origin: 'Legendäre Artefakt-Duplikate und langfristige Erfolge', purpose: 'Seltene Zutat für legendäre Artefakt-Upgrades.', stackable: true },
  { id: 'crafted-toy', name: 'Wald-Wurfseil', icon: '🪢', price: 0, type: 'toy', img: toyUrl('rope'), desc: 'Ein handgemachtes Zerrspielzeug aus Holz und Stoff.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'shell-decor', name: 'Muschel-Mobile', icon: '🐚', price: 0, type: 'room', desc: 'Ein selbstgemachtes Mobile aus Strandfunden.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'magic-treat', name: 'Kristall-Leckerli', icon: '✨', price: 0, type: 'food', amount: 1, effects: { glueck: 18, energie: 8 }, desc: 'Ein glitzernder Snack, der Scottchi aufmuntert.', rarity: 'Episch', origin: 'Werkstatt · Crafting', purpose: 'Einmalig Laune und Energie auffüllen', stackable: true, craftOnly: true },
  { id: 'crafted-shell-rattle', name: 'Muschel-Rassel', icon: '◉', price: 0, type: 'toy', img: toyUrl('rope'), desc: 'Ein sanft klingendes Zerrspielzeug aus Muscheln.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-gem-ball', name: 'Kristall-Ball', icon: '●', price: 0, type: 'toy', img: toyUrl('tennisball'), desc: 'Ein federnder Ball mit schimmerndem Kern.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-bone-puzzle', name: 'Knochen-Puzzle', icon: '●', price: 0, type: 'toy', img: toyUrl('bone'), desc: 'Ein robustes Suchspiel aus Knochenfunden.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-leaf-frisbee', name: 'Blatt-Frisbee', icon: '◎', price: 0, type: 'toy', img: toyUrl('frisbee'), desc: 'Ein leichtes Wurfspielzeug aus gepressten Blättern.', rarity: 'Gewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-fossil-chew', name: 'Fossil-Kauknochen', icon: '●', price: 0, type: 'toy', img: toyUrl('bone'), desc: 'Ein seltenes Kauspielzeug mit Fossil-Muster.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-berry-bone', name: 'Beeren-Knochen-Keks', icon: '●', price: 0, type: 'food', amount: 18, effect: 'hunger', desc: 'Ein knuspriger Snack mit Waldbeeren.', rarity: 'Gewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit.', stackable: true, craftOnly: true },
  { id: 'crafted-mushroom-biscuit', name: 'Pilz-Keks', icon: '●', price: 0, type: 'food', amount: 22, effect: 'hunger', desc: 'Ein herzhafter Keks aus Waldpilzen.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit.', stackable: true, craftOnly: true },
  { id: 'crafted-fish-snack', name: 'Fisch-Snack', icon: '●', price: 0, type: 'food', amount: 28, effect: 'hunger', desc: 'Ein kräftigender Snack aus frischem Fang.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit.', stackable: true, craftOnly: true },
  { id: 'crafted-pearl-treat', name: 'Perlen-Leckerli', icon: '●', price: 0, type: 'food', amount: 32, effect: 'hunger', effects: { glueck: 6 }, desc: 'Ein seltener Snack für einen glücklichen Scottchi.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit und Laune.', stackable: true, craftOnly: true },
  { id: 'crafted-flower-cookie', name: 'Blüten-Keks', icon: '●', price: 0, type: 'food', amount: 20, effect: 'hunger', effects: { glueck: 8 }, desc: 'Ein leichter Keks mit duftenden Blüten.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit und Laune.', stackable: true, craftOnly: true },
  { id: 'crafted-forest-bed', name: 'Waldnest', icon: '▰', price: 0, type: 'room', desc: 'Ein weiches Nest aus Stoff und Blättern.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-crystal-lamp', name: 'Kristall-Laterne', icon: '✦', price: 0, type: 'room', desc: 'Eine warme kleine Laterne mit Kristallkern.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-flower-planter', name: 'Blumentopf', icon: '✿', price: 0, type: 'room', desc: 'Ein bepflanzter Topf voller Wiesenblumen.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-driftwood-shelf', name: 'Treibholz-Regal', icon: '▰', price: 0, type: 'room', desc: 'Ein kleines Regal aus glatt geschliffenem Treibholz.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-pearl-mirror', name: 'Perlen-Spiegel', icon: '◉', price: 0, type: 'room', desc: 'Ein glänzender Spiegel mit Muschelrand.', rarity: 'Episch', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-mushroom-lamp', name: 'Pilz-Licht', icon: '✦', price: 0, type: 'room', desc: 'Ein freundliches Licht aus einer leuchtenden Höhlenkappe.', rarity: 'Ungewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'crafted-ore-toy', name: 'Erz-Klapper', icon: '●', price: 0, type: 'toy', img: toyUrl('duck'), desc: 'Ein robustes Klapperspielzeug aus leichtem Berg-Erz.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Spielen und Laune steigern', stackable: false, craftOnly: true },
  { id: 'crafted-fossil-treat', name: 'Fossil-Keks', icon: '●', price: 0, type: 'food', amount: 26, effect: 'hunger', desc: 'Ein knuspriger Keks in Knochenform.', rarity: 'Selten', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit.', stackable: true, craftOnly: true },
  { id: 'crafted-berry-juice', name: 'Beeren-Smoothie', icon: '●', price: 0, type: 'food', amount: 16, effect: 'hunger', effects: { energie: 8 }, desc: 'Ein fruchtiger Energieschub für unterwegs.', rarity: 'Gewöhnlich', origin: 'Werkstatt · Crafting', purpose: 'Wird verbraucht und füllt Sattheit und Energie.', stackable: true, craftOnly: true },
  { id: 'crafted-ocean-decor', name: 'Strand-Mobile', icon: '◉', price: 0, type: 'room', desc: 'Ein Mobile aus Perlen, Muscheln und Treibholz.', rarity: 'Episch', origin: 'Werkstatt · Crafting', purpose: 'Dekoration für dein Zimmer', stackable: false, craftOnly: true },
  { id: 'level-150-lamp', name: 'Kristallwächter-Lampe', icon: '💎', price: 0, type: 'room', desc: 'Eine besondere Lampe für erfahrene Entdecker.', rarity: 'Episch', origin: 'Spielerlevel 150', purpose: 'Einmalige Meilenstein-Dekoration', stackable: false, milestoneOnly: true },
  { id: 'level-250-medal', name: 'Goldene Sammlermedaille', icon: '🏅', price: 0, type: 'room', desc: 'Ein exklusives Abzeichen für eine außergewöhnliche Sammlung.', rarity: 'Legendär', origin: 'Spielerlevel 250', purpose: 'Einmalige Meilenstein-Dekoration', stackable: false, milestoneOnly: true },
  { id: 'level-500-plant', name: 'Sternenstaub-Pflanze', icon: '🌟', price: 0, type: 'room', desc: 'Eine seltene Pflanze für langjährige Scottchi-Fans.', rarity: 'Legendär', origin: 'Spielerlevel 500', purpose: 'Einmalige Meilenstein-Dekoration', stackable: false, milestoneOnly: true },
  { id: 'level-750-banner', name: 'Sternenpfoten-Banner', icon: '🌌', price: 0, type: 'room', desc: 'Ein kosmisches Banner als Zeichen großer Ausdauer.', rarity: 'Legendär', origin: 'Spielerlevel 750', purpose: 'Einmalige Meilenstein-Dekoration', stackable: false, craftOnly: true, milestoneOnly: true },
  { id: 'level-1000-statue', name: 'Endgame-Pfotenstatue', icon: '🐾', price: 0, type: 'room', desc: 'Eine einzigartige Statue für das Erreichen des maximalen Spielerlevels.', rarity: 'Legendär', origin: 'Spielerlevel 1000', purpose: 'Einmalige Endgame-Dekoration', stackable: false, craftOnly: true, milestoneOnly: true },
];
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const CHALLENGES: { id: string; game: GameId; title: string; test: (score: number, m: Record<string, number>) => boolean; coins: number; xp: number; dust: number; chestTier?: RewardChestTier }[] = [
  { id: 'catch-30', game: 'catch', title: 'Fange 30 Snacks ohne Fehler', test: (_s, m) => (m.maxClean || 0) >= 30, coins: 30, xp: 25, dust: 8 },
  { id: 'catch-600', game: 'catch', title: 'Knacke 600 Punkte in Snack Catch', test: (s) => s >= 600, coins: 25, xp: 20, dust: 5 },
  { id: 'turbo-15', game: 'turbo', title: 'Erreiche 15 Treffer hintereinander', test: (_s, m) => (m.maxCombo || 0) >= 15, coins: 30, xp: 25, dust: 8 },
  { id: 'memory-12', game: 'memory', title: 'Gewinne Memory mit weniger als 12 Versuchen', test: (_s, m) => m.won === 1 && m.attempts < 12, coins: 30, xp: 25, dust: 8 },
  { id: 'run-60', game: 'run', title: 'Überlebe 60 Sekunden in Scottchi Run', test: (_s, m) => (m.seconds || 0) >= 60, coins: 35, xp: 30, dust: 10 },
  { id: 'bone-5', game: 'bone', title: 'Finde den Knochen 5-mal in Folge', test: (_s, m) => (m.maxStreak || 0) >= 5, coins: 30, xp: 25, dust: 6 },
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
export const levelFor = (xp: number) => playerLevelForXp(xp);
export type PlayerLevelMilestone = {
  id: string;
  level: number;
  title: string;
  description: string;
  rewardCoins?: number;
  rewardMaterials?: Array<{ id: string; quantity: number }>;
  rewardChest?: RewardChestTier;
  rewardRoomItem?: string;
  playerTitle?: string;
};
export const PLAYER_LEVEL_MILESTONES: PlayerLevelMilestone[] = [
  { id: 'player-level-25', level: 25, title: 'Erste große Pfote', description: 'Erreiche Spielerlevel 25.', rewardCoins: 200, rewardMaterials: [{ id: 'wood', quantity: 5 }, { id: 'cloth', quantity: 5 }] },
  { id: 'player-level-50', level: 50, title: 'Seltene Pfote', description: 'Erreiche Spielerlevel 50.', rewardCoins: 80, rewardChest: 'rare' },
  { id: 'player-level-100', level: 100, title: 'Legendenstart', description: 'Erreiche Spielerlevel 100.', rewardCoins: 180, rewardChest: 'legendary' },
  { id: 'player-level-150', level: 150, title: 'Kristallwächter', description: 'Erreiche Spielerlevel 150.', rewardRoomItem: 'level-150-lamp' },
  { id: 'player-level-250', level: 250, title: 'Sammlungs-Ikone', description: 'Erreiche Spielerlevel 250.', rewardRoomItem: 'level-250-medal', playerTitle: 'Sammlungs-Ikone' },
  { id: 'player-level-500', level: 500, title: 'Scottchi-Legende', description: 'Erreiche Spielerlevel 500.', rewardRoomItem: 'level-500-plant', playerTitle: 'Scottchi-Legende' },
  { id: 'player-level-750', level: 750, title: 'Sternenpfote', description: 'Erreiche Spielerlevel 750.', rewardRoomItem: 'level-750-banner', playerTitle: 'Sternenpfote' },
  { id: 'player-level-1000', level: 1000, title: 'Tamascottchi-Mythos', description: 'Erreiche das Endgame auf Spielerlevel 1000.', rewardRoomItem: 'level-1000-statue', playerTitle: 'Tamascottchi-Mythos' },
];
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
   world: {
    discoveredLocations: [], completedQuests: [], discoveries: [], questProgress: {}, claimedRewards: [],
    activeQuests: [], questFinds: {}, questStages: {}, resourceCollectedAt: {},
    worldDay: worldDayKey(Date.now()), dailyGoals: [], dailyMetrics: {}, dailyClaimed: [], dailyVisitedLocations: [],
     dailyMasteryGained: 0, weeklyKey: worldWeekKey(Date.now()), weeklyMetrics: {}, weeklyClaimed: [],
     areaMastery: {}, worldEvent: null, worldEventClaimedDay: '',
       fishingRewardsToday: 0, lastKnownWorldTime: Date.now(), rewardChests: {}, keys: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }, chestInstances: [], openedChestIds: [],
      dailyChestCount: 0, dailyChestLocations: [], regionDailyProgress: {}, weeklyChestClaimed: false,
       milestoneChestsClaimed: [], pendingDiscoveries: [], petPosition: { x: 32, y: 38 },
   },
  journal: [], roomPlacements: {}, tutorialSeen: false, collectionIds: [],
  artifactLevels: {}, equippedArtifacts: [], artifactUpgradeCount: 0,
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
  const inventory = Object.fromEntries(Object.entries(parsed.inventory || d.inventory).map(([id, count]) => [id, Math.max(0, Math.floor(num(count, 0)))]));
  const collectionIds = [...new Set([
    ...(Array.isArray(parsed.collectionIds) ? parsed.collectionIds : []),
    ...(Array.isArray(parsed.world?.discoveries) ? parsed.world.discoveries : []),
    ...Object.entries(COLLECTION_ITEM_LINKS)
      .filter(([, linkedId]) => parsed.owned?.includes(linkedId) || Number(inventory[linkedId] || 0) > 0)
      .map(([collectionId]) => collectionId),
  ])].filter((id) => COLLECTION_ITEMS.some((item) => item.id === id));
  const artifactLevels = Object.fromEntries(
    Object.entries({ ...Object.fromEntries(collectionIds.map((id) => [id, 1])), ...(parsed.artifactLevels || {}) })
      .filter(([id, level]) => COLLECTION_ITEMS.some((item) => item.id === id) && Number.isFinite(level) && Number(level) >= 1)
      .map(([id, level]) => [id, Math.min(20, Math.floor(Number(level)))]),
  );
  const savedWeeklyMetrics = { ...(parsed.world?.weeklyMetrics || {}) };
  if (savedWeeklyMetrics.materials === undefined) savedWeeklyMetrics.materials = Math.max(0, num(savedWeeklyMetrics.gather, 0));
  if (savedWeeklyMetrics.activities === undefined) savedWeeklyMetrics.activities = Math.max(0, num(savedWeeklyMetrics.gather, 0));
  const validTiers: RewardChestTier[] = [...CHEST_TIERS];
  const chestInstances = Array.isArray(parsed.world?.chestInstances) && parsed.world.chestInstances.length > 0
    ? parsed.world.chestInstances
      .filter((chest) => chest && typeof chest.id === 'string' && typeof chest.source === 'string' && validTiers.includes(chest.tier) && Number.isFinite(chest.earnedAt))
      .map((chest) => ({ id: chest.id.slice(0, 160), source: chest.source.slice(0, 160), tier: chest.tier, earnedAt: Math.max(0, chest.earnedAt) }))
      .filter((chest, index, all) => all.findIndex((candidate) => candidate.id === chest.id) === index)
    : validTiers.flatMap((tier) => Array.from(
      { length: Math.max(0, Math.min(1000, Math.floor(num(parsed.world?.rewardChests?.[tier], 0)))) },
      (_, index) => ({ id: `legacy-${tier}-${index + 1}`, source: `legacy-${tier}-${index + 1}`, tier, earnedAt: now }),
    ));
  const chestCounts = Object.fromEntries(validTiers.map((tier) => [tier, chestInstances.filter((chest) => chest.tier === tier).length])) as Record<RewardChestTier, number>;
  const milestoneChestsClaimed = new Set(
    Array.isArray(parsed.world?.milestoneChestsClaimed) ? parsed.world.milestoneChestsClaimed.filter((id) => typeof id === 'string') : [],
  );
  if ((parsed.saveSchema || 0) < 8) {
    if (Object.values(highscores).some((score) => (score || 0) >= 1000)) milestoneChestsClaimed.add('score-1000');
    if (Object.values(highscores).some((score) => (score || 0) >= 5000)) milestoneChestsClaimed.add('score-5000');
  }
  // Older saves stored reusable shampoo as an owned toy. Give it one usable dose
  // rather than deleting the purchase when migrating to the 4.0 consumable model.
  if (parsed.owned?.includes('shampoo') && !inventory.shampoo) inventory.shampoo = 1;
  const roomPlacements = { ...(parsed.roomPlacements || {}) };
  for (const [index, id] of (parsed.roomItems || []).entries()) {
    if (!roomPlacements[id]) roomPlacements[id] = { x: 16 + (index % 5) * 16, y: 67 + (Math.floor(index / 5) % 2) * 8 };
  }
  const parsedXp = Math.max(0, num(parsed.xp, d.xp));
  const normalizedXp = (parsed.saveSchema || 0) < SAVE_SCHEMA
    ? migrateLegacyPlayerXp(parsedXp)
    : Math.min(MAX_PLAYER_XP, parsedXp);
  return {
    ...d, ...parsed,
    version: 1, saveSchema: SAVE_SCHEMA,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.slice(0, 18) : d.name,
    coins: Math.max(0, num(parsed.coins, d.coins)), xp: normalizedXp,
    needs: {
      hunger: clamp(decay(num(needs.hunger, d.needs.hunger))), glueck: clamp(decay(num(needs.glueck, d.needs.glueck))),
      energie: clamp(decay(num(needs.energie, d.needs.energie))), sauberkeit: clamp(decay(num(needs.sauberkeit, d.needs.sauberkeit))),
    },
    inventory,
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
      activeQuests: [...new Set(parsed.world?.activeQuests || [])],
      questFinds: Object.fromEntries(Object.entries(parsed.world?.questFinds || {}).map(([id, indexes]) => [id, Array.isArray(indexes) ? [...new Set(indexes.filter((n) => Number.isInteger(n) && n >= 0 && n < 10))] : []])),
      questStages: { ...(parsed.world?.questStages || {}) },
      resourceCollectedAt: Object.fromEntries(Object.entries(parsed.world?.resourceCollectedAt || {}).filter(([, value]) => Number.isFinite(value) && Number(value) >= 0).map(([id, value]) => [id, Number(value)])),
      worldDay: typeof parsed.world?.worldDay === 'string' ? parsed.world.worldDay : worldDayKey(Math.max(now, num(parsed.world?.lastKnownWorldTime, now))),
      dailyGoals: Array.isArray(parsed.world?.dailyGoals) ? [...new Set(parsed.world.dailyGoals.filter((id) => typeof id === 'string'))] : [],
      dailyMetrics: Object.fromEntries(Object.entries(parsed.world?.dailyMetrics || {}).filter(([, value]) => Number.isFinite(value) && Number(value) >= 0).map(([id, value]) => [id, Math.floor(Number(value))])),
      dailyClaimed: [...new Set(parsed.world?.dailyClaimed || [])],
      dailyVisitedLocations: [...new Set(parsed.world?.dailyVisitedLocations || [])],
      dailyMasteryGained: Math.max(0, Math.floor(num(parsed.world?.dailyMasteryGained, 0))),
      weeklyKey: typeof parsed.world?.weeklyKey === 'string' ? parsed.world.weeklyKey : worldWeekKey(Math.max(now, num(parsed.world?.lastKnownWorldTime, now))),
      weeklyMetrics: Object.fromEntries(Object.entries(savedWeeklyMetrics).filter(([, value]) => Number.isFinite(value) && Number(value) >= 0).map(([id, value]) => [id, Math.floor(Number(value))])),
      weeklyClaimed: [...new Set(parsed.world?.weeklyClaimed || [])],
      areaMastery: Object.fromEntries(Object.entries(parsed.world?.areaMastery || {}).filter(([, value]) => Number.isFinite(value) && Number(value) >= 0).map(([id, value]) => [id, Math.floor(Number(value))])),
      worldEvent: parsed.world?.worldEvent && typeof parsed.world.worldEvent.id === 'string' && typeof parsed.world.worldEvent.day === 'string'
        && typeof parsed.world.worldEvent.locationId === 'string' && typeof parsed.world.worldEvent.resourceId === 'string'
        && Number.isFinite(parsed.world.worldEvent.quantity) && parsed.world.worldEvent.quantity > 0
        ? { ...parsed.world.worldEvent, quantity: Math.floor(parsed.world.worldEvent.quantity) } : null,
      worldEventClaimedDay: typeof parsed.world?.worldEventClaimedDay === 'string' ? parsed.world.worldEventClaimedDay : '',
      fishingRewardsToday: Math.max(0, Math.floor(num(parsed.world?.fishingRewardsToday, 0))),
      lastKnownWorldTime: Math.max(num(parsed.world?.lastKnownWorldTime, now), num(parsed.lastUpdated, now)),
      rewardChests: chestCounts,
      keys: Object.fromEntries(CHEST_TIERS.map((tier) => [tier, Math.max(0, Math.min(1_000_000, Math.floor(num(parsed.world?.keys?.[tier], 0))))])) as Record<RewardChestTier, number>,
      chestInstances,
       openedChestIds: [...new Set(Array.isArray(parsed.world?.openedChestIds) ? parsed.world.openedChestIds.filter((id) => typeof id === 'string') : [])],
      dailyChestCount: Math.max(0, Math.min(1000, Math.floor(num(parsed.world?.dailyChestCount, 0)))),
      dailyChestLocations: [...new Set(Array.isArray(parsed.world?.dailyChestLocations) ? parsed.world.dailyChestLocations.filter((id) => typeof id === 'string') : [])],
      regionDailyProgress: Object.fromEntries(Object.entries(parsed.world?.regionDailyProgress || {}).map(([id, progress]) => [id, {
        materials: Math.max(0, Math.floor(num(progress?.materials, 0))),
        activities: Math.max(0, Math.floor(num(progress?.activities, 0))),
        rare: Math.max(0, Math.floor(num(progress?.rare, 0))),
      }])),
      weeklyChestClaimed: Boolean(parsed.world?.weeklyChestClaimed),
      milestoneChestsClaimed: [...milestoneChestsClaimed],
      pendingDiscoveries: Array.isArray(parsed.world?.pendingDiscoveries)
        ? [...new Map(parsed.world.pendingDiscoveries.filter((entry) => entry && typeof entry.artifactId === 'string' && typeof entry.locationId === 'string' && typeof entry.questId === 'string')
          .filter((entry) => COLLECTION_ITEMS.some((item) => item.id === entry.artifactId))
          .map((entry) => [entry.artifactId, entry])).values()]
        : [],
      petPosition: {
        x: Math.max(3, Math.min(97, num(parsed.world?.petPosition?.x, d.world.petPosition.x))),
        y: Math.max(3, Math.min(97, num(parsed.world?.petPosition?.y, d.world.petPosition.y))),
      },
    },
    collectionIds,
    artifactLevels,
    equippedArtifacts: [...new Set((Array.isArray(parsed.equippedArtifacts) ? parsed.equippedArtifacts : []).filter((id) => artifactLevels[id]))]
      .slice(0, levelFor(normalizedXp) >= 20 ? 4 : levelFor(normalizedXp) >= 10 ? 3 : 2),
    artifactUpgradeCount: Math.max(0, Math.floor(num(parsed.artifactUpgradeCount, 0))),
    journal: Array.isArray(parsed.journal) ? parsed.journal.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.icon === 'string' && typeof entry.title === 'string' && typeof entry.detail === 'string' && Number.isFinite(entry.date)).slice(-100) : [],
    roomPlacements: Object.fromEntries(Object.entries(roomPlacements).filter(([, pos]) => pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)).map(([id, pos]) => [id, { x: Math.max(4, Math.min(96, pos.x)), y: Math.max(42, Math.min(88, pos.y)) }])),
    tutorialSeen: Boolean(parsed.tutorialSeen),
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
    if ((parsed.saveSchema || 0) < 4 && !localStorage.getItem(BACKUP_KEY_30)) localStorage.setItem(BACKUP_KEY_30, raw);
    if ((parsed.saveSchema || 0) < 5 && !localStorage.getItem(BACKUP_KEY_40)) localStorage.setItem(BACKUP_KEY_40, raw);
    if ((parsed.saveSchema || 0) < 6 && !localStorage.getItem(BACKUP_KEY_60)) localStorage.setItem(BACKUP_KEY_60, raw);
    if ((parsed.saveSchema || 0) < 7 && !localStorage.getItem(BACKUP_KEY_61)) localStorage.setItem(BACKUP_KEY_61, raw);
    if ((parsed.saveSchema || 0) < 8 && !localStorage.getItem(BACKUP_KEY_62)) localStorage.setItem(BACKUP_KEY_62, raw);
    if ((parsed.saveSchema || 0) < 9 && !localStorage.getItem(BACKUP_KEY_63)) localStorage.setItem(BACKUP_KEY_63, raw);
    if ((parsed.saveSchema || 0) < 10 && !localStorage.getItem(BACKUP_KEY_64)) localStorage.setItem(BACKUP_KEY_64, raw);
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
