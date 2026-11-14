import { WORLD_QUESTS, itemById, type FullPetData } from './data';
import { recordJournal } from './journal';
import { applicableArtifactBonus, applyArtifactBonus, grantMilestoneChest } from './artifactSystem';
import { applyWeeklyMetric, recordRegionActivity } from './worldEngine';
import { queueWorldDiscovery, releasePendingWorldDiscoveries } from './worldDiscoveries';
import { TOY_USE } from './toyRules';

export type QuestId = (typeof WORLD_QUESTS)[number]['id'];
export type QuestOutcome = 'started' | 'found' | 'already-found' | 'wrong-order' | 'awaiting-action' | 'completed' | 'already-completed' | 'invalid';

export function startQuest(data: FullPetData, id: string): FullPetData {
  const quest = WORLD_QUESTS.find((entry) => entry.id === id);
  if (!quest || data.world.completedQuests.includes(id)) return data;
  let next = {
    ...data,
    world: {
      ...data.world,
      activeQuests: [...new Set([...(data.world.activeQuests || []), id])],
    },
  };
  next = recordJournal(next, `quest-start-${id}`, '🧭', `Aufgabe begonnen: ${quest.name}`, quest.desc);
  return next;
}

function completeQuest(data: FullPetData, id: string): FullPetData {
  const quest = WORLD_QUESTS.find((entry) => entry.id === id);
  if (!quest || data.world.completedQuests.includes(id)) return data;
  let next: FullPetData = {
    ...data,
    coins: data.coins + applyArtifactBonus(quest.coins, applicableArtifactBonus(data, 'coins', 'world')),
    xp: data.xp + applyArtifactBonus(quest.xp, applicableArtifactBonus(data, 'xp', 'quests')),
    world: {
      ...data.world,
      activeQuests: (data.world.activeQuests || []).filter((active) => active !== id),
      completedQuests: [...new Set([...data.world.completedQuests, id])],
      claimedRewards: [...new Set([...data.world.claimedRewards, `quest:${id}`])],
      questStages: { ...(data.world.questStages || {}), [id]: 'completed' },
    },
  };
  for (const artifactId of quest.discoveries) next = queueWorldDiscovery(next, artifactId, quest.place, id);
  next = recordRegionActivity(next, quest.place, 0, 1, 0);
  next = releasePendingWorldDiscoveries(next);
  next = applyWeeklyMetric(next, 'activities', 1);
  if (WORLD_QUESTS.every((entry) => next.world.completedQuests.includes(entry.id))) {
    next = grantMilestoneChest(next, 'all-world-quests', 'legendary', Date.now());
  }
  next = recordJournal(next, `quest-done-${id}`, '🏆', `Aufgabe abgeschlossen: ${quest.name}`, `+${quest.coins} Münzen · +${quest.xp} XP`);
  return next;
}

export function pickQuestPoint(data: FullPetData, id: string, point: number): { data: FullPetData; outcome: QuestOutcome } {
  const quest = WORLD_QUESTS.find((entry) => entry.id === id);
  if (!quest || !Number.isInteger(point) || point < 0 || point >= 10) return { data, outcome: 'invalid' };
  if (data.world.completedQuests.includes(id)) return { data, outcome: 'already-completed' };
  const started = startQuest(data, id);
  const w = started.world;
  if (w.questStages?.[id] === 'awaiting-action') return { data: started, outcome: 'awaiting-action' };
  const finds = w.questFinds?.[id] || [];
  if (finds.includes(point)) return { data: started, outcome: 'already-found' };
  const progress = w.questProgress[id] || 0;
  const sequenceQuest = 'sequence' in quest && !!quest.sequence;
  if ('sequence' in quest && quest.sequence && quest.sequence[progress] !== point) {
    return {
      data: {
        ...started,
        world: { ...w, questProgress: { ...w.questProgress, [id]: 0 }, questFinds: { ...(w.questFinds || {}), [id]: [] } },
      },
      outcome: 'wrong-order',
    };
  }

  let next: FullPetData = {
    ...started,
    inventory: sequenceQuest ? started.inventory : { ...started.inventory, [quest.loot]: (started.inventory[quest.loot] || 0) + 1 },
    world: {
      ...w,
      questProgress: { ...w.questProgress, [id]: Math.min(quest.target, progress + 1) },
      questFinds: { ...(w.questFinds || {}), [id]: [...finds, point] },
    },
  };
  if (!sequenceQuest) {
    next = recordRegionActivity(next, quest.place, 1, 0, 0);
    next = applyWeeklyMetric(next, 'materials', 1);
  }
  next = recordJournal(next, `find-${id}-${point}`, '🔎', `Fund entdeckt: ${quest.name}`, sequenceQuest ? 'Ein Lichtpunkt in der richtigen Reihenfolge.' : `+1 ${quest.loot.replaceAll('-', ' ')}`);
  const reachedTarget = progress + 1 >= quest.target;
  if (!reachedTarget) return { data: next, outcome: 'found' };
  if ('itemReward' in quest && quest.itemReward) {
    next = {
      ...next,
      inventory: itemById(quest.itemReward)?.type === 'toy' && TOY_USE[quest.itemReward]
        ? { ...next.inventory, [quest.itemReward]: (next.inventory[quest.itemReward] || 0) + 1 }
        : next.inventory,
      owned: [...new Set([...next.owned, quest.itemReward])],
    };
  }
  if ('requiresAction' in quest && quest.requiresAction) {
    next = { ...next, world: { ...next.world, questStages: { ...(next.world.questStages || {}), [id]: 'awaiting-action' } } };
    const detail = quest.requiresAction === 'use:ball' ? 'Der Ball ist gefunden. Spiele jetzt im Zuhause mit ihm.' : 'Erledige noch die letzte Aktion.';
    next = recordJournal(next, `quest-step-${id}`, '🧸', 'Letzter Schritt freigeschaltet', detail);
    return { data: next, outcome: 'awaiting-action' };
  }
  if (sequenceQuest) {
    next = { ...next, inventory: { ...next.inventory, [quest.loot]: (next.inventory[quest.loot] || 0) + 1 } };
    next = applyWeeklyMetric(next, 'materials', 1);
  }
  return { data: completeQuest(next, id), outcome: 'completed' };
}

export function completeQuestAction(data: FullPetData, action: string): { data: FullPetData; outcome: QuestOutcome } {
  const id = (data.world.activeQuests || []).find((active) => {
    const quest = WORLD_QUESTS.find((entry) => entry.id === active);
    return quest && 'requiresAction' in quest && quest.requiresAction === action && data.world.questStages?.[active] === 'awaiting-action';
  });
  if (!id) return { data, outcome: 'invalid' };
  const quest = WORLD_QUESTS.find((entry) => entry.id === id)!;
  let prepared = data;
  if (quest.actionLoot) {
    const lootId = quest.actionLoot.id;
    prepared = {
      ...prepared,
      inventory: { ...prepared.inventory, [lootId]: (prepared.inventory[lootId] || 0) + quest.actionLoot.quantity },
    };
    prepared = applyWeeklyMetric(prepared, 'materials', quest.actionLoot.quantity);
    prepared = recordJournal(prepared, `quest-action-${id}`, '🎁', 'Schatztruhe geöffnet', `${quest.actionLoot.quantity}× ${itemById(lootId)?.name || lootId}`);
  }
  return { data: completeQuest(prepared, id), outcome: 'completed' };
}
