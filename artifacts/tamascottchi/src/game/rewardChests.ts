import { ITEMS, itemById, type FullPetData, type RewardChestTier } from './data';
import { COLLECTION_ITEM_LINKS, COLLECTION_ITEMS, type CollectionItem, type Rarity } from './collectionWorld';

export const CHEST_TIERS: RewardChestTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const CHEST_DEFINITIONS: Record<RewardChestTier, { label: string; rarity: Rarity; coins: number; xp: number; fallbackMaterial: string; fallbackQuantity: number }> = {
  common: { label: 'Holzkiste', rarity: 'Common', coins: 10, xp: 5, fallbackMaterial: 'wood', fallbackQuantity: 2 },
  uncommon: { label: 'Wiesenkiste', rarity: 'Uncommon', coins: 16, xp: 8, fallbackMaterial: 'wildflower', fallbackQuantity: 2 },
  rare: { label: 'Kristallkiste', rarity: 'Rare', coins: 25, xp: 13, fallbackMaterial: 'crystal-shard', fallbackQuantity: 2 },
  epic: { label: 'Sternenkiste', rarity: 'Epic', coins: 42, xp: 22, fallbackMaterial: 'gold-fragment', fallbackQuantity: 3 },
  legendary: { label: 'Königskiste', rarity: 'Legendary', coins: 70, xp: 36, fallbackMaterial: 'old-coin', fallbackQuantity: 4 },
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
};

export type ChestOpenResult = { data: FullPetData; reward: ChestOpenReward };

function nextIndex(random: () => number, length: number) {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

function alreadyOwned(data: FullPetData, item: CollectionItem) {
  const linked = COLLECTION_ITEM_LINKS[item.id];
  return data.collectionIds.includes(item.id) || data.world.discoveries.includes(item.id) ||
    Boolean(linked && (data.owned.includes(linked) || (data.inventory[linked] || 0) > 0));
}

/** Opens exactly one stored chest. The consumed count is part of the returned save. */
export function openRewardChest(data: FullPetData, tier: RewardChestTier, random: () => number = Math.random): ChestOpenResult | null {
  const count = data.world.rewardChests[tier] || 0;
  if (count < 1) return null;

  const definition = CHEST_DEFINITIONS[tier];
  const candidates = COLLECTION_ITEMS.filter((item) => item.rarity === definition.rarity && !alreadyOwned(data, item));
  const collectible = candidates.length ? candidates[nextIndex(random, candidates.length)] : undefined;
  const itemId = collectible?.id || definition.fallbackMaterial;
  const material = collectible ? undefined : itemById(itemId);
  const itemName = collectible?.name || material?.name || itemId;
  const quantity = collectible ? 1 : definition.fallbackQuantity;
  const linked = collectible ? COLLECTION_ITEM_LINKS[collectible.id] : undefined;
  const nextDiscoveries = collectible ? [...new Set([...data.world.discoveries, collectible.id])] : data.world.discoveries;
  const nextCollectionIds = collectible ? [...new Set([...data.collectionIds, collectible.id])] : data.collectionIds;
  const nextOwned = linked ? [...new Set([...data.owned, linked])] : data.owned;
  const nextInventory = collectible ? data.inventory : { ...data.inventory, [itemId]: (data.inventory[itemId] || 0) + quantity };
  const nextData: FullPetData = {
    ...data,
    coins: data.coins + definition.coins,
    xp: data.xp + definition.xp,
    inventory: nextInventory,
    owned: nextOwned,
    collectionIds: nextCollectionIds,
    world: {
      ...data.world,
      rewardChests: { ...data.world.rewardChests, [tier]: count - 1 },
      discoveries: nextDiscoveries,
    },
  };

  return {
    data: nextData,
    reward: {
      tier, chestName: definition.label, itemId, itemName, quantity,
      coins: definition.coins, xp: definition.xp, isCollectionFind: Boolean(collectible), collectionItem: collectible,
    },
  };
}
