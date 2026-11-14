import { worldLevelDropChances, worldStageLevel } from '@workspace/game-economy';
import { LOCATIONS, levelFor, type FullPetData } from './data';
import { COLLECTION_ITEMS } from './collectionWorld';
import { recordJournal } from './journal';
import { unlockArtifact } from './artifactSystem';

export function canUnlockWorldDiscovery(data: FullPetData, artifactId: string, locationId: string): boolean {
  const item = COLLECTION_ITEMS.find((entry) => entry.id === artifactId);
  const location = LOCATIONS.find((entry) => entry.id === locationId);
  if (!item || !location) return false;
  const stage = worldStageLevel(location.level, data.world.areaMastery[locationId] || 0);
  return worldLevelDropChances(stage, levelFor(data.xp))[item.rarity] > 0;
}

export function queueWorldDiscovery(data: FullPetData, artifactId: string, locationId: string, questId: string): FullPetData {
  if (data.artifactLevels[artifactId] || !COLLECTION_ITEMS.some((entry) => entry.id === artifactId)) return data;
  if (canUnlockWorldDiscovery(data, artifactId, locationId)) return unlockArtifact(data, artifactId);
  if (data.world.pendingDiscoveries.some((entry) => entry.artifactId === artifactId)) return data;
  const item = COLLECTION_ITEMS.find((entry) => entry.id === artifactId)!;
  const location = LOCATIONS.find((entry) => entry.id === locationId);
  const next: FullPetData = {
    ...data,
    world: {
      ...data.world,
      pendingDiscoveries: [...data.world.pendingDiscoveries, { artifactId, locationId, questId }],
    },
  };
  return recordJournal(
    next,
    `discovery-pending:${questId}:${artifactId}`,
    '⏳',
    'Fund vorgemerkt',
    `${item.name} wird verfügbar, sobald dein Spielerlevel und dein Fortschritt in ${location?.name || 'diesem Gebiet'} ausreichen.`,
  );
}

export function releasePendingWorldDiscoveries(data: FullPetData): FullPetData {
  if (!data.world.pendingDiscoveries.length) return data;
  let next = data;
  const remaining: FullPetData['world']['pendingDiscoveries'] = [];
  const unlockedNames: string[] = [];
  for (const pending of data.world.pendingDiscoveries) {
    if (next.artifactLevels[pending.artifactId]) continue;
    if (!canUnlockWorldDiscovery(next, pending.artifactId, pending.locationId)) {
      remaining.push(pending);
      continue;
    }
    const item = COLLECTION_ITEMS.find((entry) => entry.id === pending.artifactId);
    const unlocked = unlockArtifact(next, pending.artifactId);
    if (unlocked !== next) {
      next = unlocked;
      if (item) unlockedNames.push(item.name);
    }
  }
  if (remaining.length === data.world.pendingDiscoveries.length && !unlockedNames.length) return data;
  next = { ...next, world: { ...next.world, pendingDiscoveries: remaining } };
  if (unlockedNames.length) {
    next = recordJournal(
      next,
      `pending-discoveries-released:${unlockedNames.join('|')}`,
      '🔓',
      'Vorgemerkte Funde freigeschaltet',
      `${unlockedNames.join(', ')} ${unlockedNames.length === 1 ? 'ist' : 'sind'} jetzt verfügbar.`,
    );
  }
  return next;
}
