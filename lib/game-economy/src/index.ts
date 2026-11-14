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
  common: 50,
  uncommon: 150,
  rare: 400,
  epic: 1000,
  legendary: 2500,
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
  rare: 40,
  epic: 70,
  legendary: 100,
};

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
