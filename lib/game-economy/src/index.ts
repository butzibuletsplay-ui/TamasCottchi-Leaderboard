export * from './characterProgression';
export * from './petNeeds';
export const CHEST_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type RewardChestTier = (typeof CHEST_TIERS)[number];
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export type CollectionRarity = (typeof RARITIES)[number];
export type DropChances = Record<CollectionRarity, number>;

export const COLLECTION_RARITY_POOLS: Record<CollectionRarity, string[]> = {
  Common: [
    'cap-red', 'beanie-dark', 'cowboy-star', 'chef-hat', 'party-cone', 'sleep-cap-blue', 'ranger-cap',
    'hoodie-dark', 'raincoat-gold', 'varsity-jacket', 'tuxedo', 'hero-cape-blue', 'sweater-cream', 'shirt-floral', 'explorer-jacket',
    'scarf-red', 'scarf-blue', 'scarf-green', 'scarf-purple', 'collar-bone', 'collar-spikes', 'collar-gem', 'bandana', 'harness-blue', 'wings-gold',
    'glasses-dark', 'monocle', 'glasses-square', 'snorkel-goggles', 'heart-glasses', 'spiral-glasses', 'headphones', 'halo', 'wings-white', 'devil-horns',
    'bone-cream', 'tennisball-green', 'frisbee-red', 'rope-red', 'duck', 'teddy', 'shark-plush', 'burger', 'gamepad', 'bone-magic',
  ],
  Uncommon: ['bowl', 'bottle-pink', 'cheese', 'brush', 'mud-pile', 'paper-roll', 'leek', 'clover', 'key-gold'],
  Rare: ['crown-ruby', 'wizard-purple', 'crown-gold', 'egg-common', 'egg-galaxy', 'egg-wings', 'treasure-chest', 'bell-trophy'],
  Epic: ['royal-cape', 'royal-armor', 'crystal-rainbow', 'egg-crystal', 'egg-lava', 'gem-flower', 'portal-orb'],
  Legendary: ['scottchi-statue'],
};
export const COLLECTION_ITEM_LINKS: Record<string, string> = {
  'cap-red': 'baseballcap', 'beanie-dark': 'beanie', 'cowboy-star': 'cowboy-hat', 'crown-ruby': 'crown',
  'wizard-purple': 'wizard-hat', 'sleep-cap-blue': 'sleep-cap', 'hoodie-dark': 'hoodie', 'raincoat-gold': 'raincoat',
  tuxedo: 'tuxedo', 'hero-cape-blue': 'cape', 'royal-cape': 'cape', 'royal-armor': 'tuxedo',
  'scarf-red': 'scarf', 'collar-bone': 'collar', 'glasses-dark': 'sunglasses',
  'bone-cream': 'bone-toy', 'tennisball-green': 'ball', duck: 'duck', 'frisbee-red': 'frisbee',
  'rope-red': 'rope', teddy: 'teddy', bowl: 'bowl', 'bottle-pink': 'shampoo', 'flower-pot': 'plant',
};
const collectionCategories: Record<string, string[]> = {
  Hüte: ['cap-red', 'beanie-dark', 'cowboy-star', 'chef-hat', 'party-cone', 'sleep-cap-blue', 'ranger-cap', 'crown-ruby', 'wizard-purple', 'crown-gold'],
  Outfits: ['hoodie-dark', 'raincoat-gold', 'varsity-jacket', 'tuxedo', 'hero-cape-blue', 'sweater-cream', 'shirt-floral', 'explorer-jacket', 'royal-cape', 'royal-armor'],
  Accessoires: ['scarf-red', 'scarf-blue', 'scarf-green', 'scarf-purple', 'collar-bone', 'collar-spikes', 'collar-gem', 'bandana', 'harness-blue', 'wings-gold', 'glasses-dark', 'monocle', 'glasses-square', 'snorkel-goggles', 'heart-glasses', 'spiral-glasses', 'headphones', 'halo', 'wings-white', 'devil-horns'],
  Spielzeug: ['bone-cream', 'tennisball-green', 'frisbee-red', 'rope-red', 'duck', 'teddy', 'shark-plush', 'burger', 'gamepad', 'bone-magic', 'bowl', 'bottle-pink', 'cheese', 'brush', 'mud-pile', 'paper-roll', 'leek'],
  Kristalle: ['crystal-rainbow', 'egg-crystal', 'egg-lava', 'gem-flower', 'portal-orb'],
  'Magische Eier': ['egg-common', 'egg-galaxy', 'egg-wings'],
  Trophäen: ['treasure-chest', 'bell-trophy', 'scottchi-statue'],
  'Besondere Dekorationen': ['clover', 'key-gold'],
};
const itemCategory = Object.fromEntries(
  Object.entries(collectionCategories).flatMap(([category, ids]) => ids.map((id) => [id, category])),
);
const categoryEffects: Record<string, Array<{ kind: 'coins' | 'xp' | 'materials' | 'fun' | 'energy'; scope: string; amountPerLevel: number }>> = {
  Hüte: [{ kind: 'coins', scope: 'world', amountPerLevel: 0.6 }, { kind: 'xp', scope: 'games', amountPerLevel: 0.7 }],
  Outfits: [{ kind: 'xp', scope: 'quests', amountPerLevel: 0.8 }, { kind: 'energy', scope: 'world', amountPerLevel: 0.35 }],
  Accessoires: [{ kind: 'coins', scope: 'games', amountPerLevel: 0.55 }, { kind: 'materials', scope: 'world', amountPerLevel: 0.45 }],
  Spielzeug: [{ kind: 'fun', scope: 'play', amountPerLevel: 1.2 }, { kind: 'xp', scope: 'games', amountPerLevel: 0.55 }],
  Kristalle: [{ kind: 'materials', scope: 'cave', amountPerLevel: 0.8 }, { kind: 'xp', scope: 'world', amountPerLevel: 0.65 }],
  'Magische Eier': [{ kind: 'xp', scope: 'quests', amountPerLevel: 0.9 }, { kind: 'materials', scope: 'world', amountPerLevel: 0.4 }],
  Trophäen: [{ kind: 'xp', scope: 'quests', amountPerLevel: 1 }, { kind: 'coins', scope: 'world', amountPerLevel: 0.7 }],
  'Besondere Dekorationen': [{ kind: 'coins', scope: 'world', amountPerLevel: 0.8 }, { kind: 'materials', scope: 'forest', amountPerLevel: 0.6 }],
};
const artifactEffectOverrides: Record<string, { kind: 'coins' | 'xp' | 'materials' | 'fun' | 'energy'; scope: string; amountPerLevel: number }> = {
  'bone-cream': { kind: 'fun', scope: 'play', amountPerLevel: 1.5 },
  'key-gold': { kind: 'coins', scope: 'world', amountPerLevel: 1.2 },
  'crystal-rainbow': { kind: 'materials', scope: 'cave', amountPerLevel: 1.1 },
  'egg-crystal': { kind: 'materials', scope: 'cave', amountPerLevel: 0.9 },
  'egg-lava': { kind: 'xp', scope: 'world', amountPerLevel: 1 },
  clover: { kind: 'materials', scope: 'forest', amountPerLevel: 0.9 },
  'crown-ruby': { kind: 'xp', scope: 'quests', amountPerLevel: 1.2 },
  'crown-gold': { kind: 'xp', scope: 'quests', amountPerLevel: 1.4 },
  'scottchi-statue': { kind: 'coins', scope: 'all', amountPerLevel: 1 },
  'treasure-chest': { kind: 'materials', scope: 'world', amountPerLevel: 0.9 },
  'bell-trophy': { kind: 'xp', scope: 'world', amountPerLevel: 0.9 },
  'pearl-shell': { kind: 'materials', scope: 'beach', amountPerLevel: 1 },
  'wings-gold': { kind: 'energy', scope: 'world', amountPerLevel: 0.5 },
  'wings-white': { kind: 'energy', scope: 'world', amountPerLevel: 0.4 },
};
const rarityBonusScale: Record<CollectionRarity, number> = { Common: 1, Uncommon: 1.1, Rare: 1.25, Epic: 1.4, Legendary: 1.6 };
const artifactIdHash = (id: string) => [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
const artifactBonusLimits = { coins: 25, xp: 25, materials: 20, fun: 25, energy: 20 };

export function artifactBonusForEquipped(
  equippedIds: string[],
  levels: Record<string, unknown>,
  kind: 'coins' | 'xp' | 'materials' | 'fun' | 'energy',
  activity: string,
): number {
  let total = 0;
  for (const id of equippedIds) {
    const rarity = RARITIES.find((entry) => COLLECTION_RARITY_POOLS[entry].includes(id));
    const category = itemCategory[id];
    const level = Math.floor(Number(levels[id]) || 0);
    if (!rarity || !category || level < 1) continue;
    const effect = artifactEffectOverrides[id] || categoryEffects[category][artifactIdHash(id) % categoryEffects[category].length];
    if (effect.kind !== kind) continue;
    if (effect.scope !== 'all' && effect.scope !== activity && !(activity === 'world' && ['cave', 'beach', 'forest'].includes(effect.scope))) continue;
    total += Math.round(effect.amountPerLevel * level * rarityBonusScale[rarity] * 10) / 10;
  }
  return Math.min(artifactBonusLimits[kind], total);
}

export const CHEST_KEY_PRICES: Record<RewardChestTier, number> = {
  common: 100,
  uncommon: 300,
  rare: 900,
  epic: 3000,
  legendary: 10000,
};

export const MAX_PLAYER_LEVEL = 1000;
const playerLevelThresholds = Array.from({ length: MAX_PLAYER_LEVEL + 2 }, () => 0);
for (let level = 1; level <= MAX_PLAYER_LEVEL; level += 1) {
  const required = level <= 20 ? 100 : Math.ceil(100 + (level - 20) * 0.06);
  playerLevelThresholds[level + 1] = playerLevelThresholds[level] + required;
}
export const MAX_PLAYER_XP = playerLevelThresholds[MAX_PLAYER_LEVEL + 1] - 1;

/** XP needed to advance from this player level; levels 1–20 retain the old 100-XP pace. */
export function playerLevelXpNeeded(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number.isFinite(level) ? level : 1)));
  return playerLevelThresholds[safeLevel + 1] - playerLevelThresholds[safeLevel];
}

/** Lifetime XP threshold for reaching a player level (level 1 starts at zero). */
export function playerLevelXpThreshold(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL + 1, Math.floor(Number.isFinite(level) ? level : 1)));
  return playerLevelThresholds[safeLevel];
}

export function playerLevelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.min(MAX_PLAYER_XP, Math.floor(Number.isFinite(xp) ? xp : 0)));
  let low = 1;
  let high = MAX_PLAYER_LEVEL;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (playerLevelThresholds[middle] <= safeXp) low = middle;
    else high = middle - 1;
  }
  return low;
}

export function playerLevelProgress(xp: number) {
  const safeXp = Math.max(0, Math.min(MAX_PLAYER_XP, Math.floor(Number.isFinite(xp) ? xp : 0)));
  const level = playerLevelForXp(safeXp);
  const currentLevelXp = playerLevelXpThreshold(level);
  const isMaxLevel = level === MAX_PLAYER_LEVEL;
  const nextLevelXp = isMaxLevel ? currentLevelXp : playerLevelXpThreshold(level + 1);
  const required = isMaxLevel ? 0 : Math.max(0, nextLevelXp - currentLevelXp);
  const earned = isMaxLevel ? 0 : Math.max(0, safeXp - currentLevelXp);
  return {
    level,
    earned,
    required,
    percent: isMaxLevel ? 100 : Math.min(100, Math.floor((earned / required) * 100)),
    isMaxLevel,
  };
}

/** Keep old saves at the same derived level and relative progress when XP thresholds change. */
export function migrateLegacyPlayerXp(xp: number): number {
  const legacyXp = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  const legacyLevel = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(legacyXp / 100) + 1));
  if (legacyLevel === MAX_PLAYER_LEVEL) return MAX_PLAYER_XP;
  const legacyProgress = legacyXp % 100;
  const newThreshold = playerLevelXpThreshold(legacyLevel);
  const newRequired = playerLevelXpNeeded(legacyLevel);
  return Math.min(MAX_PLAYER_XP, newThreshold + Math.floor((legacyProgress / 100) * newRequired));
}

export const CHEST_UNLOCK_LEVEL: Record<RewardChestTier, number> = {
  common: 1,
  uncommon: 15,
  rare: 25,
  epic: 50,
  legendary: 100,
};

export function chestKeyPrice(tier: RewardChestTier, playerLevel: number): number {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1)));
  return Math.round(CHEST_KEY_PRICES[tier] * (1 + level / 200));
}

export const MINIGAME_IDS = ['catch', 'memory', 'turbo', 'bone', 'run'] as const;
export type MinigameId = (typeof MINIGAME_IDS)[number];
export const MINIGAME_DAILY_XP_CAP = 900;
export const MINIGAME_DAILY_COIN_CAP_BASE = 10000;
export const MINIGAME_DAILY_TASK_TARGET = 10;
export const MINIGAME_REWARD_DIVISORS: Record<MinigameId, number> = {
  catch: 12,
  memory: 5,
  turbo: 14,
  bone: 9,
  run: 12,
};
export const MINIGAME_DAILY_CHEST_TABLE: ReadonlyArray<{
  minLevel: number;
  maxLevel: number;
  chances: Record<RewardChestTier, number>;
}> = [
  { minLevel: 1, maxLevel: 24, chances: { common: 90, uncommon: 10, rare: 0, epic: 0, legendary: 0 } },
  { minLevel: 25, maxLevel: 49, chances: { common: 75, uncommon: 23, rare: 2, epic: 0, legendary: 0 } },
  { minLevel: 50, maxLevel: 99, chances: { common: 55, uncommon: 33, rare: 10, epic: 2, legendary: 0 } },
  { minLevel: 100, maxLevel: 199, chances: { common: 40, uncommon: 35, rare: 18, epic: 6, legendary: 1 } },
  { minLevel: 200, maxLevel: 349, chances: { common: 30, uncommon: 35, rare: 24, epic: 9, legendary: 2 } },
  { minLevel: 350, maxLevel: 499, chances: { common: 22, uncommon: 32, rare: 30, epic: 13, legendary: 3 } },
  { minLevel: 500, maxLevel: 749, chances: { common: 15, uncommon: 27, rare: 32, epic: 21, legendary: 5 } },
  { minLevel: 750, maxLevel: 999, chances: { common: 10, uncommon: 22, rare: 33, epic: 28, legendary: 7 } },
  { minLevel: 1000, maxLevel: 1000, chances: { common: 5, uncommon: 15, rare: 35, epic: 35, legendary: 10 } },
];

export type MinigameDailyState = {
  day: string;
  xp: number;
  coins: number;
  rounds: number;
  taskPoints: Partial<Record<MinigameId, number>>;
  claimed: MinigameId[];
};

export function minigameDailyDayKey(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function minigameCoinMultiplier(playerLevel: number): number {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1)));
  return 1 + Math.max(0, level - 20) / 10;
}

export function minigameDailyCoinCap(playerLevel: number): number {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1)));
  return Math.round(MINIGAME_DAILY_COIN_CAP_BASE * (1 + level / 100));
}

export function minigameDailyChestChances(playerLevel: number): Record<RewardChestTier, number> {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1)));
  const row = MINIGAME_DAILY_CHEST_TABLE.find((entry) => level >= entry.minLevel && level <= entry.maxLevel)!;
  return { ...row.chances };
}

export function minigameDailyChestTier(playerLevel: number, random: () => number): RewardChestTier {
  return chooseChance(minigameDailyChestChances(playerLevel), random);
}

export function createMinigameDailyState(timestamp: number): MinigameDailyState {
  return { day: minigameDailyDayKey(timestamp), xp: 0, coins: 0, rounds: 0, taskPoints: {}, claimed: [] };
}

export function normalizeMinigameDailyState(input: unknown, timestamp: number, playerLevel: number): MinigameDailyState {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const fresh = createMinigameDailyState(timestamp);
  if (value.day !== fresh.day) return fresh;
  const rawPoints = value.taskPoints && typeof value.taskPoints === 'object' && !Array.isArray(value.taskPoints)
    ? value.taskPoints as Record<string, unknown>
    : {};
  return {
    day: fresh.day,
    xp: Math.min(MINIGAME_DAILY_XP_CAP, Math.max(0, Math.floor(Number(value.xp) || 0))),
    coins: Math.min(minigameDailyCoinCap(playerLevel), Math.max(0, Math.floor(Number(value.coins) || 0))),
    rounds: Math.max(0, Math.min(10000, Math.floor(Number(value.rounds) || 0))),
    taskPoints: Object.fromEntries(MINIGAME_IDS.map((game) => [
      game,
      Math.min(MINIGAME_DAILY_TASK_TARGET, Math.max(0, Math.floor(Number(rawPoints[game]) || 0))),
    ])),
    claimed: [...new Set(Array.isArray(value.claimed) ? value.claimed.filter((entry): entry is MinigameId => MINIGAME_IDS.includes(entry as MinigameId)) : [])],
  };
}

export function rewardForMinigame(game: MinigameId, score: number, roundsToday: number) {
  const divisor = MINIGAME_REWARD_DIVISORS[game];
  let coins = Math.max(2, Math.min(30, Math.floor(score / divisor)));
  let xp = Math.max(4, Math.min(35, Math.floor(score / (divisor * 0.8))));
  const reduced = roundsToday >= 15;
  if (reduced) {
    coins = Math.ceil(coins / 2);
    xp = Math.ceil(xp / 2);
  }
  return { coins, xp, reduced };
}

export function minigameTaskPointsForXp(xp: number): number {
  return xp >= 25 ? 3 : xp >= 12 ? 2 : 1;
}

export function applyMinigameRound(
  input: unknown,
  game: MinigameId,
  score: number,
  playerLevel: number,
  timestamp: number,
  bonuses: { coins?: number; xp?: number } = {},
) {
  const state = normalizeMinigameDailyState(input, timestamp, playerLevel);
  const base = rewardForMinigame(game, Math.max(0, Math.floor(Number(score) || 0)), state.rounds);
  const xpBonus = Math.min(25, Math.max(0, Number(bonuses.xp) || 0));
  const coinBonus = Math.min(25, Math.max(0, Number(bonuses.coins) || 0));
  const rawXp = Math.floor(base.xp * (1 + xpBonus / 100));
  const rawCoins = Math.floor(base.coins * (1 + coinBonus / 100) * minigameCoinMultiplier(playerLevel));
  const xp = Math.min(rawXp, Math.max(0, MINIGAME_DAILY_XP_CAP - state.xp));
  const coins = Math.min(rawCoins, Math.max(0, minigameDailyCoinCap(playerLevel) - state.coins));
  const points = minigameTaskPointsForXp(base.xp);
  const taskPoints = {
    ...state.taskPoints,
    [game]: Math.min(MINIGAME_DAILY_TASK_TARGET, (state.taskPoints[game] || 0) + points),
  };
  const taskProgress = taskPoints[game] || 0;
  return {
    state: { ...state, xp: state.xp + xp, coins: state.coins + coins, rounds: state.rounds + 1, taskPoints },
    xp,
    coins,
    taskPointsEarned: points,
    taskProgress,
    taskComplete: taskProgress >= MINIGAME_DAILY_TASK_TARGET,
    reduced: base.reduced,
  };
}

export function claimMinigameDailyChest(input: unknown, game: MinigameId, playerLevel: number, timestamp: number, random: () => number) {
  const state = normalizeMinigameDailyState(input, timestamp, playerLevel);
  const taskProgress = state.taskPoints[game] || 0;
  if (taskProgress < MINIGAME_DAILY_TASK_TARGET) return { ok: false as const, error: 'task-incomplete' as const, state };
  if (state.claimed.includes(game)) return { ok: false as const, error: 'already-claimed' as const, state };
  const tier = minigameDailyChestTier(playerLevel, random);
  return { ok: true as const, state: { ...state, claimed: [...state.claimed, game] }, tier };
}

export const RARITY_UNLOCK_LEVEL: Record<CollectionRarity, number> = {
  Common: 1,
  Uncommon: 15,
  Rare: 40,
  Epic: 70,
  Legendary: 100,
};

export const CHEST_DROP_TABLE: Record<RewardChestTier, DropChances> = {
  common: { Common: 90, Uncommon: 10, Rare: 0, Epic: 0, Legendary: 0 },
  uncommon: { Common: 55, Uncommon: 40, Rare: 5, Epic: 0, Legendary: 0 },
  rare: { Common: 20, Uncommon: 50, Rare: 27, Epic: 3, Legendary: 0 },
  epic: { Common: 5, Uncommon: 20, Rare: 50, Epic: 23, Legendary: 2 },
  legendary: { Common: 0, Uncommon: 5, Rare: 20, Epic: 55, Legendary: 20 },
};

const WORLD_RARITY_UNLOCK_LEVEL: Record<CollectionRarity, number> = {
  Common: 1,
  Uncommon: 1,
  Rare: 3,
  Epic: 5,
  Legendary: 9,
};

/** Base ordinary-loot odds by local world progress; global player level applies an additional ceiling. */
export const WORLD_LEVEL_DROP_TABLE: ReadonlyArray<{ minLevel: number; maxLevel: number | null; chances: DropChances }> = [
  { minLevel: 1, maxLevel: 2, chances: { Common: 90, Uncommon: 10, Rare: 0, Epic: 0, Legendary: 0 } },
  { minLevel: 3, maxLevel: 4, chances: { Common: 75, Uncommon: 22, Rare: 3, Epic: 0, Legendary: 0 } },
  { minLevel: 5, maxLevel: 6, chances: { Common: 60, Uncommon: 30, Rare: 9, Epic: 1, Legendary: 0 } },
  { minLevel: 7, maxLevel: 8, chances: { Common: 45, Uncommon: 35, Rare: 16, Epic: 4, Legendary: 0 } },
  { minLevel: 9, maxLevel: 10, chances: { Common: 35, Uncommon: 35, Rare: 22, Epic: 7, Legendary: 1 } },
  { minLevel: 11, maxLevel: 15, chances: { Common: 25, Uncommon: 35, Rare: 27, Epic: 11, Legendary: 2 } },
  { minLevel: 16, maxLevel: 20, chances: { Common: 18, Uncommon: 30, Rare: 32, Epic: 16, Legendary: 4 } },
];

export function chestTierUnlocked(tier: RewardChestTier, playerLevel: number): boolean {
  return Number.isFinite(playerLevel) && playerLevel >= CHEST_UNLOCK_LEVEL[tier];
}

export function rarityUnlocked(rarity: CollectionRarity, playerLevel: number): boolean {
  return Number.isFinite(playerLevel) && playerLevel >= RARITY_UNLOCK_LEVEL[rarity];
}

export function highestUnlockedChestTier(playerLevel: number): RewardChestTier {
  return [...CHEST_TIERS].reverse().find((tier) => chestTierUnlocked(tier, playerLevel)) || 'common';
}

export function worldStageLevel(locationUnlockLevel: number, areaMasteryXp: number): number {
  const baseLevel = Math.max(1, Math.min(20, Math.floor(Number.isFinite(locationUnlockLevel) ? locationUnlockLevel : 1)));
  const masteryLevel = Math.min(20, Math.floor(Math.max(0, Number.isFinite(areaMasteryXp) ? areaMasteryXp : 0) / 100) + 1);
  return Math.max(baseLevel, masteryLevel);
}

export function chestDropChances(tier: RewardChestTier, _playerLevel?: number): DropChances {
  return { ...CHEST_DROP_TABLE[tier] };
}

export function worldLevelDropChances(worldLevel: number, playerLevel = MAX_PLAYER_LEVEL): DropChances {
  const level = Math.max(1, Math.min(20, Math.floor(Number.isFinite(worldLevel) ? worldLevel : 1)));
  const row = WORLD_LEVEL_DROP_TABLE.find((entry) => level >= entry.minLevel && (entry.maxLevel === null || level <= entry.maxLevel));
  const chances = { ...(row?.chances || WORLD_LEVEL_DROP_TABLE[0].chances) };
  for (const rarity of RARITIES) {
    if (level < WORLD_RARITY_UNLOCK_LEVEL[rarity] || !rarityUnlocked(rarity, playerLevel)) {
      chances.Common += chances[rarity];
      chances[rarity] = 0;
    }
  }
  return chances;
}

export function chooseChance<T extends string>(
  weights: Record<T, number>,
  random: () => number,
): T {
  const keys = Object.keys(weights) as T[];
  const total = keys.reduce((sum, key) => sum + weights[key], 0);
  const roll = Math.max(0, Math.min(99.999999999, random() * total));
  let cursor = 0;
  for (const key of keys) {
    cursor += weights[key];
    if (roll < cursor) return key;
  }
  return keys[keys.length - 1];
}

function cappedTierWeights(weights: Record<RewardChestTier, number>, playerLevel: number): Record<RewardChestTier, number> {
  const maxTier = CHEST_TIERS.indexOf(highestUnlockedChestTier(playerLevel));
  const result = { ...weights };
  for (const [index, tier] of CHEST_TIERS.entries()) {
    if (index <= maxTier) continue;
    result[CHEST_TIERS[maxTier]] += result[tier];
    result[tier] = 0;
  }
  return result;
}

/** Mastery chests require both developed regional progress and the global player-level unlock. */
export function worldMasteryChestTier(worldLevel: number, playerLevel: number, random: () => number): RewardChestTier {
  const level = Math.max(1, Math.min(20, Math.floor(Number.isFinite(worldLevel) ? worldLevel : 1)));
  const weights: Record<RewardChestTier, number> = level >= 20
    ? { common: 0, uncommon: 0, rare: 40, epic: 45, legendary: 15 }
    : level >= 15
      ? { common: 0, uncommon: 0, rare: 65, epic: 35, legendary: 0 }
      : level >= 10
        ? { common: 0, uncommon: 75, rare: 25, epic: 0, legendary: 0 }
        : level >= 5
          ? { common: 70, uncommon: 30, rare: 0, epic: 0, legendary: 0 }
          : { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  return chooseChance(cappedTierWeights(weights, playerLevel), random);
}

/** Daily world quests can award up to rare; epic and legendary remain challenge milestones. */
export function dailyWorldChestTier(worldLevel: number, playerLevel: number, random: () => number): RewardChestTier {
  const level = Math.max(1, Math.min(20, Math.floor(Number.isFinite(worldLevel) ? worldLevel : 1)));
  const weights: Record<RewardChestTier, number> = level >= 9
    ? { common: 50, uncommon: 35, rare: 15, epic: 0, legendary: 0 }
    : level >= 7
      ? { common: 45, uncommon: 35, rare: 20, epic: 0, legendary: 0 }
      : level >= 5
        ? { common: 62, uncommon: 32, rare: 6, epic: 0, legendary: 0 }
        : level >= 3
          ? { common: 85, uncommon: 15, rare: 0, epic: 0, legendary: 0 }
          : { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  const capped = cappedTierWeights(weights, playerLevel);
  capped.epic = 0;
  capped.legendary = 0;
  return chooseChance(capped, random);
}
