import { LOCATIONS, WORLD_QUESTS, itemById, type FullPetData, type RewardChestTier, type WorldEventState } from './data';
import { recordJournal } from './journal';
import { hoursRemaining } from './worldClock';
import { worldDayKey, worldWeekKey } from './worldClock';
import { applicableArtifactBonus, applyArtifactBonus, applyArtifactQuantityBonus, grantChest, grantMilestoneChest, grantRegularChest, tierForMastery } from './artifactSystem';

export type ResourceNode = {
  id: string;
  locationId: string;
  resourceId: string;
  quantity: number;
  respawnHours: 24 | 48 | 72;
  rarity: 'Gewöhnlich' | 'Ungewöhnlich' | 'Selten';
  minMastery?: number;
  activity?: 'excavate';
};

export const RESOURCE_NODES: ResourceNode[] = [
  { id: 'park-bones', locationId: 'park', resourceId: 'bone-scrap', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'park-lost-coins', locationId: 'park', resourceId: 'old-coin', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich', minMastery: 2 },
  { id: 'park-flowers', locationId: 'park', resourceId: 'wildflower', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'city-cloth', locationId: 'city', resourceId: 'cloth', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'city-coin-pouch', locationId: 'city', resourceId: 'old-coin', quantity: 2, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'forest-wood', locationId: 'forest', resourceId: 'wood', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'forest-leaves', locationId: 'forest', resourceId: 'leaf', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'forest-mushrooms', locationId: 'forest', resourceId: 'mushroom', quantity: 1, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'forest-berries', locationId: 'forest', resourceId: 'berry', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'forest-rare-flower', locationId: 'forest', resourceId: 'wildflower', quantity: 1, respawnHours: 48, rarity: 'Selten', minMastery: 2 },
  { id: 'beach-shells', locationId: 'beach', resourceId: 'shell', quantity: 2, respawnHours: 24, rarity: 'Gewöhnlich' },
  { id: 'beach-driftwood', locationId: 'beach', resourceId: 'driftwood', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'beach-pearls', locationId: 'beach', resourceId: 'pearl', quantity: 1, respawnHours: 72, rarity: 'Selten', minMastery: 2 },
  { id: 'beach-excavation', locationId: 'beach', resourceId: 'fossil', quantity: 1, respawnHours: 72, rarity: 'Selten', activity: 'excavate' },
  { id: 'cave-crystals', locationId: 'cave', resourceId: 'crystal-shard', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'cave-rare-mineral', locationId: 'cave', resourceId: 'gold-fragment', quantity: 1, respawnHours: 72, rarity: 'Selten', minMastery: 2 },
  { id: 'mountain-ore', locationId: 'mountain', resourceId: 'ore', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'mountain-flowers', locationId: 'mountain', resourceId: 'wildflower', quantity: 1, respawnHours: 48, rarity: 'Ungewöhnlich' },
  { id: 'mountain-excavation', locationId: 'mountain', resourceId: 'fossil', quantity: 1, respawnHours: 72, rarity: 'Selten', activity: 'excavate' },
  { id: 'mountain-crystal', locationId: 'mountain', resourceId: 'crystal-shard', quantity: 1, respawnHours: 72, rarity: 'Selten', minMastery: 2 },
];

export type WorldEventDefinition = WorldEventState & { title: string; description: string; rarity: ResourceNode['rarity'] };
const EVENT_ROTATION: Omit<WorldEventDefinition, 'day'>[] = [
  { id: 'lost-chest', locationId: 'park', resourceId: 'gold-fragment', quantity: 1, title: 'Verlorene Schatztruhe', description: 'Zwischen den Parkbänken ist eine kleine Truhe aufgetaucht.', rarity: 'Ungewöhnlich' },
  { id: 'flower-bloom', locationId: 'forest', resourceId: 'wildflower', quantity: 2, title: 'Seltene Blumenblüte', description: 'Für kurze Zeit blühen seltene Blumen im Wald.', rarity: 'Selten' },
  { id: 'beach-find', locationId: 'beach', resourceId: 'pearl', quantity: 1, title: 'Fund am Strand', description: 'Die Wellen haben einen glänzenden Fund angespült.', rarity: 'Selten' },
  { id: 'crystal-rain', locationId: 'cave', resourceId: 'crystal-shard', quantity: 2, title: 'Kristallregen', description: 'Ein frischer Kristallschimmer ist in der Höhle zu finden.', rarity: 'Selten' },
  { id: 'mountain-cache', locationId: 'mountain', resourceId: 'ore', quantity: 2, title: 'Bergfund', description: 'Ein Erdrutsch hat eine kleine Erzader freigelegt.', rarity: 'Ungewöhnlich' },
];

export type DailyWorldGoal = {
  id: string;
  metric: 'gather' | 'fish' | 'excavate' | 'event' | 'visit' | 'rare';
  title: string;
  description: string;
  target: number;
  minLevel: number;
  coins: number;
  xp: number;
};

export const DAILY_WORLD_GOALS: DailyWorldGoal[] = [
  { id: 'gather-three', metric: 'gather', title: 'Pfoten auf dem Pfad', description: 'Sammle drei Fundstücke in der Welt.', target: 3, minLevel: 1, coins: 12, xp: 10 },
  { id: 'find-event', metric: 'event', title: 'Augen offen halten', description: 'Finde das besondere Ereignis des Tages.', target: 1, minLevel: 1, coins: 14, xp: 12 },
  { id: 'visit-two', metric: 'visit', title: 'Kleine Weltreise', description: 'Besuche zwei verschiedene Orte.', target: 2, minLevel: 3, coins: 14, xp: 12 },
  { id: 'one-fish', metric: 'fish', title: 'Frischer Fang', description: 'Fange einen Fisch am Strand.', target: 1, minLevel: 8, coins: 16, xp: 14 },
  { id: 'one-dig', metric: 'excavate', title: 'Spurensucher', description: 'Lege einen Fund bei einer Ausgrabung frei.', target: 1, minLevel: 8, coins: 16, xp: 14 },
  { id: 'rare-find', metric: 'rare', title: 'Seltenes Glück', description: 'Finde ein seltenes Material.', target: 1, minLevel: 5, coins: 18, xp: 16 },
];

export type WeeklyGoalMetric = 'materials' | 'activities' | 'craft' | 'daily';
export type WeeklyWorldGoal = { id: string; metric: WeeklyGoalMetric; title: string; description: string; target: number; coins: number; xp: number };
export const WEEKLY_WORLD_GOALS: WeeklyWorldGoal[] = [
  { id: 'weekly-materials', metric: 'materials', title: 'Vorrat für die Werkstatt', description: 'Sammle 100 Materialien oder Fische.', target: 100, coins: 55, xp: 45 },
  { id: 'weekly-activities', metric: 'activities', title: 'Auf vielen Pfotenwegen', description: 'Schließe 12 Weltaktivitäten ab.', target: 12, coins: 60, xp: 45 },
  { id: 'weekly-craft', metric: 'craft', title: 'Werkstatt-Woche', description: 'Stelle drei Gegenstände her.', target: 3, coins: 65, xp: 50 },
  { id: 'weekly-daily', metric: 'daily', title: 'Jeden Tag ein kleiner Schritt', description: 'Schließe fünf Tagesziele oder Weltaufträge ab.', target: 5, coins: 55, xp: 45 },
];

export const REGION_DAILY_TASKS: Record<string, { materials: number; activities: number; rare: number; rewardMaterial: string }> = {
  park: { materials: 4, activities: 2, rare: 0, rewardMaterial: 'bone-scrap' },
  city: { materials: 4, activities: 2, rare: 0, rewardMaterial: 'cloth' },
  forest: { materials: 8, activities: 2, rare: 1, rewardMaterial: 'leaf' },
  beach: { materials: 6, activities: 2, rare: 1, rewardMaterial: 'shell' },
  cave: { materials: 2, activities: 2, rare: 1, rewardMaterial: 'crystal-shard' },
  mountain: { materials: 3, activities: 2, rare: 1, rewardMaterial: 'ore' },
};

export type WorldNpcRequest = {
  id: string;
  locationId: string;
  name: string;
  role: string;
  dialogue: string;
  request: string;
  itemId: string;
  rewardCoins: number;
  rewardXp: number;
};

export const WORLD_NPCS: WorldNpcRequest[] = [
  { id: 'park-collector', locationId: 'park', name: 'Mila', role: 'Fundstück-Sammlerin', dialogue: '„Ich katalogisiere alles, was die Pfoten im Park finden.“', request: 'Bringe ihr einen Knochensplitter.', itemId: 'bone-scrap', rewardCoins: 8, rewardXp: 7 },
  { id: 'city-trader', locationId: 'city', name: 'Taro', role: 'Materialhändler', dialogue: '„Gute Stoffe kann ich immer gebrauchen.“', request: 'Tausche ein Stoffstück gegen Münzen.', itemId: 'cloth', rewardCoins: 10, rewardXp: 8 },
  { id: 'forest-researcher', locationId: 'forest', name: 'Fina', role: 'Wald-Forscherin', dialogue: '„Für meine Pflanzenstudie fehlt mir noch ein Pilz.“', request: 'Bringe ihr einen Waldpilz.', itemId: 'mushroom', rewardCoins: 12, rewardXp: 10 },
  { id: 'beach-fisher', locationId: 'beach', name: 'Niko', role: 'Strand-Abenteurer', dialogue: '„Ein frischer Fang macht jede Schatzkarte besser.“', request: 'Teile einen Silberfisch mit ihm.', itemId: 'fish-common', rewardCoins: 14, rewardXp: 12 },
  { id: 'cave-geologist', locationId: 'cave', name: 'Kora', role: 'Kristall-Forscherin', dialogue: '„Dieser Splitter passt genau in meine Gesteinsprobe.“', request: 'Bringe ihr einen Kristallsplitter.', itemId: 'crystal-shard', rewardCoins: 16, rewardXp: 14 },
  { id: 'mountain-prospector', locationId: 'mountain', name: 'Bram', role: 'Berg-Handwerker', dialogue: '„Mit etwas Erz kann ich die Werkstatt wieder instand halten.“', request: 'Bringe ihm ein Stück Berg-Erz.', itemId: 'ore', rewardCoins: 18, rewardXp: 16 },
];

const MAX_MASTERY_PER_DAY = 50;
const MAX_REWARDED_FISH_PER_DAY = 3;

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function masteryLevel(xp: number): number {
  return Math.min(20, Math.floor(Math.max(0, xp) / 100) + 1);
}

export function masteryProgress(xp: number): number {
  return masteryLevel(xp) === 20 ? 100 : Math.max(0, Math.floor(Math.max(0, xp) % 100));
}

export function selectedDailyGoals(day: string, level: number): DailyWorldGoal[] {
  const available = DAILY_WORLD_GOALS.filter((goal) => goal.minLevel <= level);
  if (available.length <= 3) return available;
  const start = hash(day) % available.length;
  return [0, 1, 2].map((offset) => available[(start + offset) % available.length]);
}

export function eventForDay(day: string, level: number): WorldEventDefinition {
  const available = EVENT_ROTATION.filter((event) => {
    const location = LOCATIONS.find((entry) => entry.id === event.locationId);
    return location && location.level <= level;
  });
  const options = available.length ? available : EVENT_ROTATION.slice(0, 1);
  const selected = options[hash(day) % options.length];
  return { ...selected, day };
}

function eventForSave(day: string, level: number): WorldEventState {
  const event = eventForDay(day, level);
  return { id: event.id, day, locationId: event.locationId, resourceId: event.resourceId, quantity: event.quantity };
}

function effectiveNow(data: FullPetData, now: number, authoritativeClock = false): number {
  if (authoritativeClock) return now;
  const lastKnown = Number.isFinite(data.world.lastKnownWorldTime) ? data.world.lastKnownWorldTime! : 0;
  return Math.max(now, lastKnown);
}

export function ensureWorldDay(data: FullPetData, now = Date.now(), level = 1, authoritativeClock = false): FullPetData {
  const time = effectiveNow(data, now, authoritativeClock);
  const day = worldDayKey(time);
  const week = worldWeekKey(time);
  const needsDaySetup = data.world.worldDay !== day;
  const needsWeekSetup = data.world.weeklyKey !== week;
  const needsMigration = !data.world.dailyGoals?.length || !data.world.worldEvent || !data.world.weeklyKey || !data.world.weeklyMetrics || !data.world.weeklyClaimed;
  if (!needsDaySetup && !needsWeekSetup && !needsMigration) return data;
  const nextEvent = needsDaySetup || !data.world.worldEvent ? eventForSave(day, level) : data.world.worldEvent;
  const nextGoals = needsDaySetup || !data.world.dailyGoals?.length
    ? selectedDailyGoals(day, level).map((goal) => goal.id)
    : data.world.dailyGoals;
  return {
    ...data,
    world: {
      ...data.world,
      worldDay: day,
      worldEvent: nextEvent,
      dailyGoals: nextGoals,
      dailyMetrics: needsDaySetup ? {} : data.world.dailyMetrics || {},
      dailyClaimed: needsDaySetup ? [] : data.world.dailyClaimed || [],
      dailyVisitedLocations: needsDaySetup ? [] : data.world.dailyVisitedLocations || [],
      dailyMasteryGained: needsDaySetup ? 0 : data.world.dailyMasteryGained || 0,
      fishingRewardsToday: needsDaySetup ? 0 : data.world.fishingRewardsToday || 0,
      worldEventClaimedDay: needsDaySetup ? '' : data.world.worldEventClaimedDay || '',
      dailyChestCount: needsDaySetup ? 0 : data.world.dailyChestCount || 0,
      dailyChestLocations: needsDaySetup ? [] : data.world.dailyChestLocations || [],
      regionDailyProgress: needsDaySetup ? {} : data.world.regionDailyProgress || {},
      openedChestIds: data.world.openedChestIds || [],
      weeklyKey: week,
      weeklyMetrics: needsWeekSetup ? {} : data.world.weeklyMetrics || {},
      weeklyClaimed: needsWeekSetup ? [] : data.world.weeklyClaimed || [],
      weeklyChestClaimed: needsWeekSetup ? false : data.world.weeklyChestClaimed || false,
      lastKnownWorldTime: time,
    },
  };
}

function addMastery(data: FullPetData, locationId: string, amount: number, now: number, authoritativeClock = false): FullPetData {
  const current = ensureWorldDay(data, now, 1, authoritativeClock);
  const remaining = Math.max(0, MAX_MASTERY_PER_DAY - (current.world.dailyMasteryGained || 0));
  const earned = Math.min(Math.max(0, Math.floor(amount)), remaining);
  if (!earned) return current;
  let next: FullPetData = {
    ...current,
    world: {
      ...current.world,
      areaMastery: { ...current.world.areaMastery, [locationId]: (current.world.areaMastery[locationId] || 0) + earned },
      dailyMasteryGained: (current.world.dailyMasteryGained || 0) + earned,
      lastKnownWorldTime: effectiveNow(current, now, authoritativeClock),
    },
  };
  const level = masteryLevel(next.world.areaMastery[locationId] || 0);
  if (level >= 10) next = grantMilestoneChest(next, `${locationId}:mastery-10`, 'rare', now);
  if (level >= 20) next = grantMilestoneChest(next, `${locationId}:mastery-20`, 'legendary', now);
  if (LOCATIONS.every((location) => masteryLevel(next.world.areaMastery[location.id] || 0) >= 20)) {
    next = grantMilestoneChest(next, 'all-regions-mastered', 'legendary', now);
  }
  return next;
}

export function applyWeeklyMetric(data: FullPetData, metric: WeeklyGoalMetric, amount = 1, now = Date.now(), level = 1, authoritativeClock = false): FullPetData {
  const current = ensureWorldDay(data, now, level, authoritativeClock);
  if (amount <= 0) return current;
  const value = Math.min(10000, Math.floor((current.world.weeklyMetrics[metric] || 0) + amount));
  let next: FullPetData = {
    ...current,
    world: { ...current.world, weeklyMetrics: { ...current.world.weeklyMetrics, [metric]: value } },
  };
  for (const goal of WEEKLY_WORLD_GOALS) {
    if (goal.metric !== metric || value < goal.target || next.world.weeklyClaimed.includes(goal.id)) continue;
    next = {
      ...next,
      coins: next.coins + applyArtifactBonus(goal.coins, applicableArtifactBonus(next, 'coins', 'world')),
      xp: next.xp + applyArtifactBonus(goal.xp, applicableArtifactBonus(next, 'xp', 'world')),
      world: { ...next.world, weeklyClaimed: [...new Set([...next.world.weeklyClaimed, goal.id])] },
    };
    next = recordJournal(next, `world-weekly-${next.world.weeklyKey}-${goal.id}`, '🏅', `Wochenziel geschafft: ${goal.title}`, `+${goal.coins} Münzen · +${goal.xp} XP`);
  }
  const allWeeklyGoalsComplete = WEEKLY_WORLD_GOALS.every((goal) => (next.world.weeklyMetrics[goal.metric] || 0) >= goal.target);
  if (allWeeklyGoalsComplete && !next.world.weeklyChestClaimed) {
    next = grantChest(next, 'rare', `weekly:${next.world.weeklyKey}`, now);
    next = { ...next, world: { ...next.world, weeklyChestClaimed: true } };
    next = recordJournal(next, `world-weekly-chest-${next.world.weeklyKey}`, '🎁', 'Wochenkiste verdient', 'Eine seltene Kiste wurde in den Tresor gelegt.');
  }
  return next;
}

function regionTaskComplete(data: FullPetData, locationId: string) {
  const goal = REGION_DAILY_TASKS[locationId];
  const progress = data.world.regionDailyProgress[locationId] || { materials: 0, activities: 0, rare: 0 };
  return !!goal && progress.materials >= goal.materials && progress.activities >= goal.activities && progress.rare >= goal.rare;
}

export function recordRegionActivity(
  data: FullPetData,
  locationId: string,
  materials: number,
  activities: number,
  rare: number,
  now = Date.now(),
  level = 1,
  authoritativeClock = false,
): FullPetData {
  if (!REGION_DAILY_TASKS[locationId]) return data;
  const current = ensureWorldDay(data, now, level, authoritativeClock);
  const old = current.world.regionDailyProgress[locationId] || { materials: 0, activities: 0, rare: 0 };
  let next: FullPetData = {
    ...current,
    world: {
      ...current.world,
      regionDailyProgress: {
        ...current.world.regionDailyProgress,
        [locationId]: {
          materials: Math.min(1000, old.materials + Math.max(0, Math.floor(materials))),
          activities: Math.min(1000, old.activities + Math.max(0, Math.floor(activities))),
          rare: Math.min(100, old.rare + Math.max(0, Math.floor(rare))),
        },
      },
    },
  };
  const claimId = `region-daily:${locationId}`;
  if (!regionTaskComplete(next, locationId) || next.world.dailyClaimed.includes(claimId)) return next;
  const reward = REGION_DAILY_TASKS[locationId];
  const coins = applyArtifactBonus(20 + LOCATIONS.findIndex((entry) => entry.id === locationId) * 5, applicableArtifactBonus(next, 'coins', 'world'));
  const xp = applyArtifactBonus(15 + LOCATIONS.findIndex((entry) => entry.id === locationId) * 4, applicableArtifactBonus(next, 'xp', 'world'));
  const materialQuantity = applyArtifactQuantityBonus(2, applicableArtifactBonus(next, 'materials', locationId));
  next = {
    ...next,
    coins: next.coins + coins,
    xp: next.xp + xp,
    inventory: { ...next.inventory, [reward.rewardMaterial]: (next.inventory[reward.rewardMaterial] || 0) + materialQuantity },
    world: { ...next.world, dailyClaimed: [...next.world.dailyClaimed, claimId] },
  };
  next = recordJournal(next, `region-daily-${next.world.worldDay}-${locationId}`, '🧭', 'Weltauftrag abgeschlossen', `+${coins} Münzen · +${xp} XP · +${materialQuantity} ${itemById(reward.rewardMaterial)?.name || 'Materialien'}`);
  return applyWeeklyMetric(next, 'daily', 1, now, level, authoritativeClock);
}

export function claimRegionDailyChest(
  data: FullPetData,
  locationId: string,
  now = Date.now(),
  level = 1,
  authoritativeClock = false,
  random: () => number = Math.random,
): { data: FullPetData; outcome: 'claimed' | 'not-ready' | 'already-claimed' | 'daily-limit' | 'invalid'; tier?: RewardChestTier } {
  const current = ensureWorldDay(data, now, level, authoritativeClock);
  if (!REGION_DAILY_TASKS[locationId]) return { data: current, outcome: 'invalid' };
  if (current.world.dailyChestLocations.includes(locationId)) return { data: current, outcome: 'already-claimed' };
  if (!regionTaskComplete(current, locationId)) return { data: current, outcome: 'not-ready' };
  if (current.world.dailyChestCount >= 3) return { data: current, outcome: 'daily-limit' };
  const tier = tierForMastery(masteryLevel(current.world.areaMastery[locationId] || 0), random);
  const next = grantRegularChest(current, tier, `world:${current.world.worldDay}:${locationId}`, now, locationId);
  return next === current ? { data: current, outcome: 'daily-limit' } : { data: next, outcome: 'claimed', tier };
}

export function applyWorldMetric(data: FullPetData, metric: DailyWorldGoal['metric'], amount = 1, now = Date.now(), level = 1, authoritativeClock = false): FullPetData {
  const current = ensureWorldDay(data, now, level, authoritativeClock);
  if (amount <= 0) return current;
  const value = Math.min(1000, Math.floor((current.world.dailyMetrics[metric] || 0) + amount));
  let next: FullPetData = {
    ...current,
    world: { ...current.world, dailyMetrics: { ...current.world.dailyMetrics, [metric]: value } },
  };
  for (const id of next.world.dailyGoals || []) {
    const goal = DAILY_WORLD_GOALS.find((entry) => entry.id === id);
    if (!goal || goal.metric !== metric || value < goal.target || next.world.dailyClaimed?.includes(id)) continue;
    next = {
      ...next,
      coins: next.coins + applyArtifactBonus(goal.coins, applicableArtifactBonus(next, 'coins', 'world')),
      xp: next.xp + applyArtifactBonus(goal.xp, applicableArtifactBonus(next, 'xp', 'world')),
      world: { ...next.world, dailyClaimed: [...new Set([...(next.world.dailyClaimed || []), id])] },
    };
    next = recordJournal(next, `world-daily-${next.world.worldDay}-${id}`, '🏅', `Tagesziel geschafft: ${goal.title}`, `+${goal.coins} Münzen · +${goal.xp} XP`);
    next = applyWeeklyMetric(next, 'daily', 1, now, level, authoritativeClock);
  }
  return next;
}

export function collectResource(data: FullPetData, nodeId: string, now = Date.now(), level = 1, authoritativeClock = false): { data: FullPetData; outcome: 'collected' | 'cooldown' | 'locked' | 'invalid'; quantity?: number } {
  let current = ensureWorldDay(data, now, level, authoritativeClock);
  const node = RESOURCE_NODES.find((entry) => entry.id === nodeId);
  if (!node || !itemById(node.resourceId)) return { data: current, outcome: 'invalid' };
  const place = LOCATIONS.find((entry) => entry.id === node.locationId);
  if (!place || level < place.level) return { data: current, outcome: 'locked' };
  if (node.minMastery && masteryLevel(current.world.areaMastery[node.locationId] || 0) < node.minMastery) return { data: current, outcome: 'locked' };
  const collectedAt = current.world.resourceCollectedAt?.[node.id];
  if (hoursRemaining(collectedAt, node.respawnHours, effectiveNow(current, now, authoritativeClock)) > 0) return { data: current, outcome: 'cooldown' };

  const quantity = applyArtifactQuantityBonus(node.quantity, applicableArtifactBonus(current, 'materials', node.locationId));
  current = {
    ...current,
    inventory: { ...current.inventory, [node.resourceId]: (current.inventory[node.resourceId] || 0) + quantity },
    world: {
      ...current.world,
      resourceCollectedAt: { ...current.world.resourceCollectedAt, [node.id]: effectiveNow(current, now, authoritativeClock) },
      lastKnownWorldTime: effectiveNow(current, now, authoritativeClock),
    },
  };
  current = addMastery(current, node.locationId, node.rarity === 'Selten' ? 16 : node.rarity === 'Ungewöhnlich' ? 10 : 6, now, authoritativeClock);
  current = recordRegionActivity(current, node.locationId, quantity, 1, node.rarity === 'Selten' ? 1 : 0, now, level, authoritativeClock);
  current = applyWorldMetric(current, node.activity === 'excavate' ? 'excavate' : 'gather', 1, now, level, authoritativeClock);
  if (node.rarity === 'Selten') current = applyWorldMetric(current, 'rare', 1, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'materials', quantity, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'activities', 1, now, level, authoritativeClock);
  const item = itemById(node.resourceId)!;
  current = recordJournal(current, `world-node-${node.id}-${effectiveNow(current, now)}`, '✦', `Fund gesammelt: ${item.name}`, `+${quantity} · erneuert sich in ${node.respawnHours} Stunden`);
  return { data: current, outcome: 'collected', quantity };
}

export function catchFish(data: FullPetData, fishId: 'fish-common' | 'fish-rare', now = Date.now(), level = 8, authoritativeClock = false): { data: FullPetData; outcome: 'caught' | 'practice' } {
  let current = ensureWorldDay(data, now, level, authoritativeClock);
  if ((current.world.fishingRewardsToday || 0) >= MAX_REWARDED_FISH_PER_DAY) return { data: current, outcome: 'practice' };
  const quantity = applyArtifactQuantityBonus(1, applicableArtifactBonus(current, 'materials', 'beach'));
  current = {
    ...current,
    inventory: { ...current.inventory, [fishId]: (current.inventory[fishId] || 0) + quantity },
    world: { ...current.world, fishingRewardsToday: (current.world.fishingRewardsToday || 0) + 1 },
  };
  current = addMastery(current, 'beach', fishId === 'fish-rare' ? 16 : 10, now, authoritativeClock);
  current = recordRegionActivity(current, 'beach', quantity, 1, fishId === 'fish-rare' ? 1 : 0, now, level, authoritativeClock);
  current = applyWorldMetric(current, 'fish', 1, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'materials', quantity, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'activities', 1, now, level, authoritativeClock);
  current = recordJournal(current, `world-fish-${current.world.worldDay}-${current.world.fishingRewardsToday}`, '✦', `Angelfund: ${itemById(fishId)?.name || 'Fisch'}`, 'Ein Fang vom Scottchi Beach');
  return { data: current, outcome: 'caught' };
}

export function claimWorldEvent(data: FullPetData, now = Date.now(), level = 1, authoritativeClock = false): { data: FullPetData; outcome: 'claimed' | 'already-claimed' | 'unavailable' } {
  let current = ensureWorldDay(data, now, level, authoritativeClock);
  const event = current.world.worldEvent;
  if (!event || event.day !== current.world.worldDay || !itemById(event.resourceId)) return { data: current, outcome: 'unavailable' };
  if (current.world.worldEventClaimedDay === event.day) return { data: current, outcome: 'already-claimed' };
  const place = LOCATIONS.find((entry) => entry.id === event.locationId);
  if (!place || level < place.level) return { data: current, outcome: 'unavailable' };
  const quantity = applyArtifactQuantityBonus(event.quantity, applicableArtifactBonus(current, 'materials', event.locationId));
  current = {
    ...current,
    inventory: { ...current.inventory, [event.resourceId]: (current.inventory[event.resourceId] || 0) + quantity },
    world: { ...current.world, worldEventClaimedDay: event.day },
  };
  current = addMastery(current, event.locationId, 14, now, authoritativeClock);
  current = recordRegionActivity(current, event.locationId, quantity, 1, 1, now, level, authoritativeClock);
  current = applyWorldMetric(current, 'event', 1, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'materials', quantity, now, level, authoritativeClock);
  current = applyWeeklyMetric(current, 'activities', 1, now, level, authoritativeClock);
  current = recordJournal(current, `world-event-${event.day}-${event.id}`, '✦', `Ereignis entdeckt: ${eventForDay(event.day, level).title}`, `+${quantity} ${itemById(event.resourceId)?.name || 'Fundstück'}`);
  return { data: current, outcome: 'claimed' };
}

export function claimNpcRequest(data: FullPetData, locationId: string, now = Date.now(), level = 1, authoritativeClock = false): { data: FullPetData; outcome: 'claimed' | 'already-claimed' | 'missing' | 'invalid' } {
  const current = ensureWorldDay(data, now, level, authoritativeClock);
  const npc = WORLD_NPCS.find((entry) => entry.locationId === locationId);
  const place = LOCATIONS.find((entry) => entry.id === locationId);
  if (!npc || !place || level < place.level || !itemById(npc.itemId)) return { data: current, outcome: 'invalid' };
  if (current.world.dailyClaimed.includes(npc.id)) return { data: current, outcome: 'already-claimed' };
  if ((current.inventory[npc.itemId] || 0) < 1) return { data: current, outcome: 'missing' };
  let next: FullPetData = {
    ...current,
    coins: current.coins + applyArtifactBonus(npc.rewardCoins, applicableArtifactBonus(current, 'coins', 'world')),
    xp: current.xp + applyArtifactBonus(npc.rewardXp, applicableArtifactBonus(current, 'xp', 'world')),
    inventory: { ...current.inventory, [npc.itemId]: current.inventory[npc.itemId] - 1 },
    world: {
      ...current.world,
      dailyClaimed: [...current.world.dailyClaimed, npc.id],
      lastKnownWorldTime: effectiveNow(current, now, authoritativeClock),
    },
  };
  next = recordRegionActivity(next, locationId, 0, 1, 0, now, level, authoritativeClock);
  next = applyWeeklyMetric(next, 'activities', 1, now, level, authoritativeClock);
  const rewarded = applyWeeklyMetric(next, 'daily', 1, now, level, authoritativeClock);
  return {
    data: recordJournal(rewarded, `world-npc-${next.world.worldDay}-${npc.id}`, '✦', `Auftrag erledigt: ${npc.name}`, `+${npc.rewardCoins} Münzen · +${npc.rewardXp} XP`),
    outcome: 'claimed',
  };
}

export function visitWorldLocation(data: FullPetData, locationId: string, now = Date.now(), level = 1, authoritativeClock = false): { data: FullPetData; outcome: 'entered' | 'locked' | 'invalid' } {
  let current = ensureWorldDay(data, now, level, authoritativeClock);
  const place = LOCATIONS.find((entry) => entry.id === locationId);
  if (!place) return { data: current, outcome: 'invalid' };
  if (level < place.level) return { data: current, outcome: 'locked' };
  const firstVisit = !current.world.discoveredLocations.includes(locationId);
  const newToday = !current.world.dailyVisitedLocations?.includes(locationId);
  current = {
    ...current,
    world: {
      ...current.world,
      petPosition: place.point,
      discoveredLocations: firstVisit ? [...current.world.discoveredLocations, locationId] : current.world.discoveredLocations,
      dailyVisitedLocations: newToday ? [...(current.world.dailyVisitedLocations || []), locationId] : current.world.dailyVisitedLocations,
    },
  };
  if (newToday) {
    current = recordRegionActivity(current, locationId, 0, 1, 0, now, level, authoritativeClock);
    current = applyWorldMetric(current, 'visit', 1, now, level, authoritativeClock);
    current = applyWeeklyMetric(current, 'activities', 1, now, level, authoritativeClock);
  }
  if (firstVisit) current = recordJournal(current, `location-${locationId}`, `🗺️`, `Ort entdeckt: ${place.name}`, place.desc);
  return { data: current, outcome: 'entered' };
}

export function resourceCooldownHours(nodeId: string): number {
  return RESOURCE_NODES.find((entry) => entry.id === nodeId)?.respawnHours || 24;
}

export function worldResourceNode(nodeId: string): ResourceNode | undefined {
  return RESOURCE_NODES.find((entry) => entry.id === nodeId);
}

export function getWorldEvent(data: FullPetData, level: number): WorldEventDefinition | undefined {
  const event = data.world.worldEvent;
  if (!event || event.day !== data.world.worldDay) return undefined;
  const place = LOCATIONS.find((entry) => entry.id === event.locationId);
  if (!place || level < place.level) return undefined;
  return { ...event, ...EVENT_ROTATION.find((entry) => entry.id === event.id)! };
}

export function placeQuestCounts(locationId: string, completed: string[]) {
  const quests = WORLD_QUESTS.filter((entry) => entry.place === locationId);
  return { completed: quests.filter((quest) => completed.includes(quest.id)).length, total: quests.length };
}
