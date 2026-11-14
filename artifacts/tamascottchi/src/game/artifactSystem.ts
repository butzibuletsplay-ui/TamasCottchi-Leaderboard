import { levelFor, type FullPetData, type RewardChestTier } from './data';
import { COLLECTION_ITEM_LINKS, COLLECTION_ITEMS, type CollectionItem, type Rarity } from './collectionWorld';
import { CHEST_TIERS, chestDropChances, chooseChance, highestUnlockedChestTier, worldMasteryChestTier, type CollectionRarity } from '@workspace/game-economy';

export const ARTIFACT_MAX_LEVEL = 20;
export const ARTIFACT_SLOTS = [
  { playerLevel: 1, slots: 2 },
  { playerLevel: 10, slots: 3 },
  { playerLevel: 20, slots: 4 },
] as const;

export const ARTIFACT_BONUS_LIMITS = {
  coins: 25,
  xp: 25,
  materials: 20,
  fun: 25,
  energy: 20,
} as const;

export const MINIGAME_SCORE_CHEST_MILESTONES = [
  { id: 'score-1000', score: 1000, tier: 'common' as const, title: 'Erster Tausender', dust: 20 },
  { id: 'score-5000', score: 5000, tier: 'uncommon' as const, title: 'Punkte-Meister', dust: 40 },
];

export const DUPLICATE_REWARDS: Record<Rarity, { dust: number; epicEssence?: number; legendaryEssence?: number }> = {
  Common: { dust: 5 },
  Uncommon: { dust: 12 },
  Rare: { dust: 30 },
  Epic: { dust: 75, epicEssence: 1 },
  Legendary: { dust: 200, legendaryEssence: 1 },
};

export const UPGRADE_BASE_COINS = [
  100, 175, 275, 400, 600, 850, 1150, 1500, 1900, 2400,
  3000, 3700, 4500, 5400, 6500, 7800, 9300, 11000, 13000,
] as const;

export const RARITY_UPGRADE_MULTIPLIER: Record<Rarity, number> = {
  Common: 1,
  Uncommon: 1.3,
  Rare: 1.8,
  Epic: 2.5,
  Legendary: 4,
};

export type ArtifactBonusKind = 'coins' | 'xp' | 'materials' | 'fun' | 'energy';
export type ArtifactBonus = { kind: ArtifactBonusKind; scope: string; amountPerLevel: number; label: string };
export type ArtifactConfig = CollectionItem & { description: string; effect: ArtifactBonus; activation: 'passive' | 'active' };
export type ArtifactCost = { coins: number; materials: Record<string, number> };
export type ArtifactUpgradeResult =
  | { ok: true; data: FullPetData; cost: ArtifactCost; newLevel: number }
  | { ok: false; reason: 'not-owned' | 'max-level' | 'not-enough-coins' | 'not-enough-materials' };

const categoryProfiles: Record<CollectionItem['category'], ArtifactBonus[]> = {
  Hüte: [
    { kind: 'coins', scope: 'world', amountPerLevel: 0.6, label: 'mehr Münzen bei Weltfunden' },
    { kind: 'xp', scope: 'games', amountPerLevel: 0.7, label: 'mehr Erfahrung aus Minispielen' },
  ],
  Outfits: [
    { kind: 'xp', scope: 'quests', amountPerLevel: 0.8, label: 'mehr Erfahrung aus Quests' },
    { kind: 'energy', scope: 'world', amountPerLevel: 0.35, label: 'weniger Energieverbrauch bei Weltaktionen' },
  ],
  Accessoires: [
    { kind: 'coins', scope: 'games', amountPerLevel: 0.55, label: 'mehr Münzen aus Minispielen' },
    { kind: 'materials', scope: 'world', amountPerLevel: 0.45, label: 'mehr Materialien bei Weltfunden' },
  ],
  Spielzeug: [
    { kind: 'fun', scope: 'play', amountPerLevel: 1.2, label: 'mehr Spaß bei Spielzeugaktionen' },
    { kind: 'xp', scope: 'games', amountPerLevel: 0.55, label: 'mehr Erfahrung aus Minispielen' },
  ],
  Kristalle: [
    { kind: 'materials', scope: 'cave', amountPerLevel: 0.8, label: 'mehr Material aus Höhlenaktivitäten' },
    { kind: 'xp', scope: 'world', amountPerLevel: 0.65, label: 'mehr Erkundungs-Erfahrung' },
  ],
  'Magische Eier': [
    { kind: 'xp', scope: 'quests', amountPerLevel: 0.9, label: 'mehr Erfahrung aus Quests' },
    { kind: 'materials', scope: 'world', amountPerLevel: 0.4, label: 'mehr Materialien bei Weltfunden' },
  ],
  Trophäen: [
    { kind: 'xp', scope: 'quests', amountPerLevel: 1, label: 'mehr Erfahrung aus Quests' },
    { kind: 'coins', scope: 'world', amountPerLevel: 0.7, label: 'mehr Münzen bei Weltfunden' },
  ],
  'Besondere Dekorationen': [
    { kind: 'coins', scope: 'world', amountPerLevel: 0.8, label: 'mehr Münzen bei Weltfunden' },
    { kind: 'materials', scope: 'forest', amountPerLevel: 0.6, label: 'mehr Materialien im Wald' },
  ],
};

const effectOverrides: Record<string, ArtifactBonus> = {
  'bone-cream': { kind: 'fun', scope: 'play', amountPerLevel: 1.5, label: 'mehr Spaß bei Spielzeugaktionen' },
  'key-gold': { kind: 'coins', scope: 'world', amountPerLevel: 1.2, label: 'mehr Münzen bei Weltaktivitäten' },
  'crystal-rainbow': { kind: 'materials', scope: 'cave', amountPerLevel: 1.1, label: 'mehr Material aus Höhlenaktivitäten' },
  'egg-crystal': { kind: 'materials', scope: 'cave', amountPerLevel: 0.9, label: 'mehr Material aus Höhlenaktivitäten' },
  'egg-lava': { kind: 'xp', scope: 'world', amountPerLevel: 1, label: 'mehr Erkundungs-Erfahrung' },
  'clover': { kind: 'materials', scope: 'forest', amountPerLevel: 0.9, label: 'mehr besondere Funde im Wald' },
  'crown-ruby': { kind: 'xp', scope: 'quests', amountPerLevel: 1.2, label: 'mehr Erfahrung aus Quests' },
  'crown-gold': { kind: 'xp', scope: 'quests', amountPerLevel: 1.4, label: 'mehr Erfahrung aus Quests' },
  'scottchi-statue': { kind: 'coins', scope: 'all', amountPerLevel: 1, label: 'mehr Münzen aus Belohnungen' },
  'treasure-chest': { kind: 'materials', scope: 'world', amountPerLevel: 0.9, label: 'mehr Materialien bei Weltfunden' },
  'bell-trophy': { kind: 'xp', scope: 'world', amountPerLevel: 0.9, label: 'mehr Erkundungs-Erfahrung' },
  'pearl-shell': { kind: 'materials', scope: 'beach', amountPerLevel: 1, label: 'mehr Strandfunde' },
  'wings-gold': { kind: 'energy', scope: 'world', amountPerLevel: 0.5, label: 'weniger Energieverbrauch bei Aktivitäten' },
  'wings-white': { kind: 'energy', scope: 'world', amountPerLevel: 0.4, label: 'weniger Energieverbrauch bei Aktivitäten' },
};

const rarityScale: Record<Rarity, number> = { Common: 1, Uncommon: 1.1, Rare: 1.25, Epic: 1.4, Legendary: 1.6 };
const idHash = (id: string) => [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);

export const ARTIFACTS: ArtifactConfig[] = COLLECTION_ITEMS.map((item) => {
  const profile = categoryProfiles[item.category];
  const effect = effectOverrides[item.id] || profile[idHash(item.id) % profile.length];
  return {
    ...item,
    effect,
    activation: 'passive',
    description: `${item.name} ist ein ${item.category.toLowerCase()}-Artefakt aus ${item.where}. Es stärkt dauerhaft ${effect.label}.`,
  };
});

export function artifactById(id: string) {
  return ARTIFACTS.find((artifact) => artifact.id === id);
}

export function playerArtifactSlots(playerLevel: number): number {
  return playerLevel >= 20 ? 4 : playerLevel >= 10 ? 3 : 2;
}

export function artifactBonusPercent(artifact: ArtifactConfig, level: number): number {
  return Math.round(artifact.effect.amountPerLevel * level * rarityScale[artifact.rarity] * 10) / 10;
}

export function equippedArtifactBonuses(data: Pick<FullPetData, 'artifactLevels' | 'equippedArtifacts'>) {
  const totals: Record<ArtifactBonusKind, number> = { coins: 0, xp: 0, materials: 0, fun: 0, energy: 0 };
  for (const id of data.equippedArtifacts) {
    const artifact = artifactById(id);
    const level = data.artifactLevels[id] || 0;
    if (!artifact || level < 1) continue;
    const effect = artifact.effect;
    totals[effect.kind] += artifactBonusPercent(artifact, level);
  }
  for (const kind of Object.keys(totals) as ArtifactBonusKind[]) {
    totals[kind] = Math.min(ARTIFACT_BONUS_LIMITS[kind], Math.round(totals[kind] * 10) / 10);
  }
  return totals;
}

export function applicableArtifactBonus(
  data: Pick<FullPetData, 'artifactLevels' | 'equippedArtifacts'>,
  kind: ArtifactBonusKind,
  activity: string,
): number {
  return Math.min(
    ARTIFACT_BONUS_LIMITS[kind],
    data.equippedArtifacts.reduce((total, id) => {
      const artifact = artifactById(id);
      const level = data.artifactLevels[id] || 0;
      if (!artifact || level < 1 || artifact.effect.kind !== kind) return total;
      if (artifact.effect.scope !== 'all' && artifact.effect.scope !== activity && !(activity === 'world' && ['cave', 'beach', 'forest'].includes(artifact.effect.scope))) return total;
      return total + artifactBonusPercent(artifact, level);
    }, 0),
  );
}

export function applyArtifactBonus(amount: number, percent: number): number {
  return amount > 0 ? Math.floor(amount * (1 + Math.max(0, percent) / 100)) : amount;
}

export function applyArtifactQuantityBonus(amount: number, percent: number, random: () => number = Math.random): number {
  if (amount <= 0 || percent <= 0) return amount;
  const exact = amount * (1 + Math.min(ARTIFACT_BONUS_LIMITS.materials, percent) / 100);
  const base = Math.floor(exact);
  return base + (random() < exact - base ? 1 : 0);
}

function sourceMaterial(artifact: ArtifactConfig) {
  if (artifact.effect.scope === 'cave' || artifact.category === 'Kristalle') return 'crystal-shard';
  if (artifact.effect.scope === 'beach') return 'pearl';
  if (artifact.effect.scope === 'forest') return 'leaf';
  if (artifact.rarity === 'Legendary') return 'fossil';
  return 'wood';
}

export function artifactUpgradeCost(artifact: ArtifactConfig, currentLevel: number): ArtifactCost | null {
  if (!Number.isInteger(currentLevel) || currentLevel < 1 || currentLevel >= ARTIFACT_MAX_LEVEL) return null;
  const base = UPGRADE_BASE_COINS[currentLevel - 1];
  const coins = Math.round((base * RARITY_UPGRADE_MULTIPLIER[artifact.rarity]) / 5) * 5;
  const materials: Record<string, number> = {};
  const baseAmount = 1 + Math.floor(currentLevel / 3);
  const add = (id: string, quantity: number) => { materials[id] = quantity; };
  if (artifact.rarity === 'Common') add('wood', 1 + Math.floor(currentLevel / 2));
  else if (artifact.rarity === 'Uncommon') {
    add('wildflower', baseAmount);
    add('artifact-dust', 1 + Math.floor(currentLevel / 4));
  } else if (artifact.rarity === 'Rare') {
    add(sourceMaterial(artifact), 2 + Math.floor(currentLevel / 3));
    add('artifact-dust', 3 + Math.floor(currentLevel / 2));
  } else if (artifact.rarity === 'Epic') {
    add(sourceMaterial(artifact), 3 + Math.floor(currentLevel / 2));
    add('epic-essence', 1 + Math.floor((currentLevel - 1) / 5));
  } else {
    add('fossil', 4 + Math.floor(currentLevel / 2));
    add('legendary-essence', 1 + Math.floor((currentLevel - 1) / 4));
  }
  return { coins, materials };
}

export function upgradeArtifact(data: FullPetData, id: string): ArtifactUpgradeResult {
  const artifact = artifactById(id);
  const currentLevel = data.artifactLevels[id] || 0;
  if (!artifact || currentLevel < 1) return { ok: false, reason: 'not-owned' };
  const cost = artifactUpgradeCost(artifact, currentLevel);
  if (!cost) return { ok: false, reason: 'max-level' };
  if (data.coins < cost.coins) return { ok: false, reason: 'not-enough-coins' };
  if (Object.entries(cost.materials).some(([itemId, quantity]) => (data.inventory[itemId] || 0) < quantity)) {
    return { ok: false, reason: 'not-enough-materials' };
  }
  const inventory = { ...data.inventory };
  for (const [itemId, quantity] of Object.entries(cost.materials)) inventory[itemId] = Math.max(0, (inventory[itemId] || 0) - quantity);
  const newLevel = currentLevel + 1;
  let nextData: FullPetData = {
    ...data,
    coins: Math.max(0, data.coins - cost.coins),
    inventory,
    artifactLevels: { ...data.artifactLevels, [id]: newLevel },
    artifactUpgradeCount: data.artifactUpgradeCount + 1,
  };
  if (nextData.artifactUpgradeCount >= 100) {
    nextData = grantMilestoneChest(nextData, '100-artifact-upgrades', 'legendary', Date.now());
  }
  return {
    ok: true,
    cost,
    newLevel,
    data: nextData,
  };
}

export function equipArtifact(data: FullPetData, id: string, playerLevel: number): { data: FullPetData; ok: boolean; reason?: 'not-owned' | 'slots-full' } {
  if (!artifactById(id) || !data.artifactLevels[id]) return { data, ok: false, reason: 'not-owned' };
  if (data.equippedArtifacts.includes(id)) {
    return { data: { ...data, equippedArtifacts: data.equippedArtifacts.filter((current) => current !== id) }, ok: true };
  }
  if (data.equippedArtifacts.length >= playerArtifactSlots(playerLevel)) return { data, ok: false, reason: 'slots-full' };
  return { data: { ...data, equippedArtifacts: [...data.equippedArtifacts, id] }, ok: true };
}

export function unlockArtifact(data: FullPetData, id: string): FullPetData {
  if (!artifactById(id) || data.artifactLevels[id]) return data;
  const linked = COLLECTION_ITEM_LINKS[id];
  let next: FullPetData = {
    ...data,
    artifactLevels: { ...data.artifactLevels, [id]: 1 },
    collectionIds: [...new Set([...data.collectionIds, id])],
    world: { ...data.world, discoveries: [...new Set([...data.world.discoveries, id])] },
    owned: linked ? [...new Set([...data.owned, linked])] : data.owned,
  };
  if (ARTIFACTS.every((artifact) => next.artifactLevels[artifact.id])) {
    next = grantMilestoneChest(next, 'complete-artifact-collection', 'legendary', Date.now());
  }
  return next;
}

export function grantChest(
  data: FullPetData,
  tier: RewardChestTier,
  source: string,
  earnedAt: number,
): FullPetData {
  if (data.world.chestInstances.some((chest) => chest.source === source)) return data;
  const maxTierIndex = CHEST_TIERS.indexOf(highestUnlockedChestTier(levelFor(data.xp)));
  const safeTier = CHEST_TIERS[Math.min(CHEST_TIERS.indexOf(tier), maxTierIndex)];
  const instance = { id: `chest-${source}`, tier: safeTier, source, earnedAt };
  return {
    ...data,
    world: {
      ...data.world,
      chestInstances: [...data.world.chestInstances, instance],
      rewardChests: { ...data.world.rewardChests, [safeTier]: (data.world.rewardChests[safeTier] || 0) + 1 },
    },
  };
}

export function grantRegularChest(
  data: FullPetData,
  tier: RewardChestTier,
  source: string,
  earnedAt: number,
  dailyLocation = source,
): FullPetData {
  if (data.world.dailyChestLocations.includes(dailyLocation)) return data;
  const next = grantChest(data, tier, source, earnedAt);
  if (next === data) return data;
  return {
    ...next,
    world: {
      ...next.world,
      dailyChestCount: next.world.dailyChestCount + 1,
      dailyChestLocations: [...new Set([...next.world.dailyChestLocations, dailyLocation])],
    },
  };
}

export function grantMilestoneChest(data: FullPetData, milestoneId: string, tier: RewardChestTier, earnedAt: number): FullPetData {
  if (data.world.milestoneChestsClaimed.includes(milestoneId)) return data;
  const next = grantChest(data, tier, `milestone:${milestoneId}`, earnedAt);
  if (next === data) return data;
  return {
    ...next,
    world: { ...next.world, milestoneChestsClaimed: [...next.world.milestoneChestsClaimed, milestoneId] },
  };
}

export function tierForMastery(level: number, random: () => number = Math.random, playerLevel = 1): RewardChestTier {
  return worldMasteryChestTier(level, playerLevel, random);
}

export function addArtifactMaterial(data: FullPetData, id: string, quantity: number): FullPetData {
  if (!Number.isFinite(quantity) || quantity <= 0) return data;
  return { ...data, inventory: { ...data.inventory, [id]: Math.max(0, data.inventory[id] || 0) + Math.floor(quantity) } };
}
