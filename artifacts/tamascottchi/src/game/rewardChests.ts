import { LOCATIONS, itemById, type FullPetData, type RewardChestTier } from './data';
import { applicableArtifactBonus, applyArtifactBonus, ARTIFACTS, DUPLICATE_REWARDS, RARITY_CHEST_WEIGHTS, unlockArtifact } from './artifactSystem';
import { type CollectionItem, type Rarity } from './collectionWorld';
import { applyWeeklyMetric } from './worldEngine';

export const CHEST_TIERS: RewardChestTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const CHEST_DEFINITIONS: Record<RewardChestTier, { label: string; coins: number; xp: number }> = {
  common: { label: 'Holzkiste', coins: 10, xp: 5 },
  uncommon: { label: 'Wiesenkiste', coins: 16, xp: 8 },
  rare: { label: 'Kristallkiste', coins: 25, xp: 13 },
  epic: { label: 'Sternenkiste', coins: 42, xp: 22 },
  legendary: { label: 'Königskiste', coins: 70, xp: 36 },
};

export type ChestOpenReward = {
  tier: RewardChestTier;
  chestName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  coins: number;
  xp: number;
  isCollectionFind: boolean;
  collectionItem?: CollectionItem;
  rarity: Rarity;
  isDuplicate: boolean;
  duplicateDust: number;
  epicEssence: number;
  legendaryEssence: number;
  inventoryItemId: string;
  source: string;
};

export type ChestOpenResult = { data: FullPetData; reward: ChestOpenReward };

function chestSourceLabel(source: string): string {
  if (source.startsWith('region:')) {
    const location = source.split(':')[1];
    return `${LOCATIONS.find((entry) => entry.id === location)?.name || 'Welt'} · Tagesauftrag`;
  }
  if (source.startsWith('weekly:')) return 'Wöchentliche Herausforderung';
  if (source.startsWith('challenge:')) return 'Einmaliger Minispiel-Meilenstein';
  if (source.startsWith('legacy-')) return 'Übernommene Belohnung';
  if (source === 'milestone:all-world-quests') return 'Alle Weltaufgaben abgeschlossen';
  if (source === 'milestone:all-minigame-challenges') return 'Alle Minispiel-Challenges';
  if (source === 'milestone:all-regions-mastered') return 'Alle Regionen gemeistert';
  if (source === 'milestone:100-artifact-upgrades') return '100 Artefakt-Upgrades';
  if (source === 'milestone:complete-artifact-collection') return 'Sammlung vervollständigt';
  if (source.startsWith('milestone:')) {
    const [, locationId, milestone] = source.split(':');
    const region = LOCATIONS.find((entry) => entry.id === locationId)?.name || 'Welt';
    return `${region} · Gebietsmeisterschaft ${milestone?.replace('mastery-', 'Stufe ') || 'Meilenstein'}`;
  }
  return 'Weltbelohnung';
}

function nextIndex(random: () => number, length: number) {
  return Math.min(length - 1, Math.max(0, Math.floor(Math.max(0, Math.min(0.999999999, random())) * length)));
}

export function chooseRarity(tier: RewardChestTier, random: () => number = Math.random): Rarity {
  const weights = RARITY_CHEST_WEIGHTS[tier];
  const roll = Math.max(0, Math.min(99.999999999, random() * 100));
  let cursor = 0;
  for (const rarity of ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const) {
    cursor += weights[rarity];
    if (roll < cursor) return rarity;
  }
  return 'Legendary';
}

/** Opens one unique stored chest. Rarity is selected before the artifact pool, so pool sizes never skew odds. */
export function openRewardChest(data: FullPetData, tier: RewardChestTier, random: () => number = Math.random): ChestOpenResult | null {
  const chest = data.world.chestInstances.find((instance) => instance.tier === tier);
  if (!chest || data.world.openedChestIds.includes(chest.id)) return null;

  const definition = CHEST_DEFINITIONS[tier];
  const rarity = chooseRarity(tier, random);
  const candidates = ARTIFACTS.filter((item) => item.rarity === rarity);
  const collectible = candidates.length ? candidates[nextIndex(random, candidates.length)] : undefined;
  const fallback = itemById(rarity === 'Legendary' ? 'legendary-essence' : rarity === 'Epic' ? 'epic-essence' : 'artifact-dust');
  const duplicate = Boolean(collectible && data.artifactLevels[collectible.id]);
  const duplicateReward = collectible ? DUPLICATE_REWARDS[collectible.rarity] : undefined;
  const inventoryItemId = duplicate ? 'artifact-dust' : collectible ? collectible.id : fallback?.id || 'artifact-dust';
  const duplicateDust = duplicateReward?.dust || 0;
  const epicEssence = duplicateReward?.epicEssence || 0;
  const legendaryEssence = duplicateReward?.legendaryEssence || 0;
  const quantity = duplicate ? duplicateDust : collectible ? 1 : rarity === 'Legendary' ? 1 : rarity === 'Epic' ? 2 : 3;
  let nextData = collectible && !duplicate ? unlockArtifact(data, collectible.id) : data;
  const coins = applyArtifactBonus(definition.coins, applicableArtifactBonus(nextData, 'coins', 'world'));
  const xp = applyArtifactBonus(definition.xp, applicableArtifactBonus(nextData, 'xp', 'world'));
  const inventory = { ...nextData.inventory };
  if (duplicate || !collectible) inventory[inventoryItemId] = Math.max(0, inventory[inventoryItemId] || 0) + quantity;
  if (epicEssence > 0) inventory['epic-essence'] = Math.max(0, inventory['epic-essence'] || 0) + epicEssence;
  if (legendaryEssence > 0) inventory['legendary-essence'] = Math.max(0, inventory['legendary-essence'] || 0) + legendaryEssence;
  const chestInstances = nextData.world.chestInstances.filter((instance) => instance.id !== chest.id);
  const nextCount = Math.max(0, (nextData.world.rewardChests[tier] || 0) - 1);
  nextData = {
    ...nextData,
    coins: nextData.coins + coins,
    xp: nextData.xp + xp,
    inventory,
    world: {
      ...nextData.world,
      chestInstances,
      openedChestIds: [...new Set([...nextData.world.openedChestIds, chest.id])],
      rewardChests: { ...nextData.world.rewardChests, [tier]: nextCount },
    },
  };
  if (!collectible) nextData = applyWeeklyMetric(nextData, 'materials', quantity);
  const itemName = collectible?.name || fallback?.name || 'Ersatzmaterial';

  return {
    data: nextData,
    reward: {
      tier, chestName: definition.label, itemId: collectible?.id || inventoryItemId, itemName, quantity,
      coins, xp, isCollectionFind: Boolean(collectible && !duplicate), collectionItem: collectible,
      rarity, isDuplicate: duplicate, duplicateDust, epicEssence, legendaryEssence, inventoryItemId, source: chestSourceLabel(chest.source),
    },
  };
}
