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

export const CHEST_UNLOCK_LEVEL: Record<RewardChestTier, number> = {
  common: 1,
  uncommon: 3,
  rare: 5,
  epic: 9,
  legendary: 16,
};

export const RARITY_UNLOCK_LEVEL: Record<CollectionRarity, number> = {
  Common: 1,
  Uncommon: 1,
  Rare: 3,
  Epic: 5,
  Legendary: 9,
};

export const WORLD_LEVEL_DROP_TABLE: ReadonlyArray<{ minLevel: number; maxLevel: number | null; chances: DropChances }> = [
  { minLevel: 1, maxLevel: 2, chances: { Common: 90, Uncommon: 10, Rare: 0, Epic: 0, Legendary: 0 } },
  { minLevel: 3, maxLevel: 4, chances: { Common: 75, Uncommon: 22, Rare: 3, Epic: 0, Legendary: 0 } },
  { minLevel: 5, maxLevel: 6, chances: { Common: 60, Uncommon: 30, Rare: 9, Epic: 1, Legendary: 0 } },
  { minLevel: 7, maxLevel: 8, chances: { Common: 45, Uncommon: 35, Rare: 16, Epic: 4, Legendary: 0 } },
  { minLevel: 9, maxLevel: 10, chances: { Common: 35, Uncommon: 35, Rare: 22, Epic: 7, Legendary: 1 } },
  { minLevel: 11, maxLevel: 15, chances: { Common: 25, Uncommon: 35, Rare: 27, Epic: 11, Legendary: 2 } },
  { minLevel: 16, maxLevel: 20, chances: { Common: 18, Uncommon: 30, Rare: 32, Epic: 16, Legendary: 4 } },
  { minLevel: 21, maxLevel: null, chances: { Common: 12, Uncommon: 25, Rare: 35, Epic: 21, Legendary: 7 } },
];

export function chestTierUnlocked(tier: RewardChestTier, playerLevel: number): boolean {
  return Number.isFinite(playerLevel) && playerLevel >= CHEST_UNLOCK_LEVEL[tier];
}

export function rarityUnlocked(rarity: CollectionRarity, playerLevel: number): boolean {
  return Number.isFinite(playerLevel) && playerLevel >= RARITY_UNLOCK_LEVEL[rarity];
}

export function worldLevelDropChances(playerLevel: number): DropChances {
  const level = Math.max(1, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1));
  const row = WORLD_LEVEL_DROP_TABLE.find((entry) => level >= entry.minLevel && (entry.maxLevel === null || level <= entry.maxLevel));
  return { ...(row?.chances || WORLD_LEVEL_DROP_TABLE[0].chances) };
}

/** Special chests shift a small share of low-rarity odds upward, after their level gate. */
export function chestDropChances(tier: RewardChestTier, playerLevel: number): DropChances {
  const chances = worldLevelDropChances(playerLevel);
  if (!chestTierUnlocked(tier, playerLevel)) return chances;
  const shift = (from: CollectionRarity[], to: CollectionRarity, amount: number) => {
    let remaining = amount;
    for (const rarity of from) {
      const moved = Math.min(chances[rarity], remaining);
      chances[rarity] -= moved;
      chances[to] += moved;
      remaining -= moved;
      if (!remaining) break;
    }
  };
  if (tier === 'uncommon') shift(['Common'], 'Uncommon', 2);
  if (tier === 'rare') shift(['Common', 'Uncommon'], 'Rare', 5);
  if (tier === 'epic') shift(['Common', 'Uncommon'], 'Epic', 5);
  if (tier === 'legendary') shift(['Common', 'Uncommon'], 'Legendary', 5);
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

/** Daily world quests never award epic or legendary chests; later levels improve quality. */
export function dailyWorldChestTier(playerLevel: number, random: () => number): RewardChestTier {
  const level = Math.max(1, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1));
  const weights: Record<RewardChestTier, number> = level < 3
    ? { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
    : level < 5
      ? { common: 85, uncommon: 15, rare: 0, epic: 0, legendary: 0 }
      : level < 9
        ? { common: 62, uncommon: 32, rare: 6, epic: 0, legendary: 0 }
        : { common: 50, uncommon: 35, rare: 15, epic: 0, legendary: 0 };
  return chooseChance(weights, random);
}
