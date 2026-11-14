import type { FullPetData } from './data';

export type EvolutionStage = {
  stage: number;
  name: string;
  playerLevel: number;
  coinCost: number;
  reward: string;
  unlockItem?: string;
};

export const EVOLUTION_STAGES: readonly EvolutionStage[] = [
  { stage: 1, name: 'Ei', playerLevel: 1, coinCost: 0, reward: 'Scottchis Ursprung' },
  { stage: 2, name: 'Schlüpfling', playerLevel: 10, coinCost: 500, reward: 'Sanfte Schlüpf- und Entwicklungsanimation' },
  { stage: 3, name: 'Jungtier', playerLevel: 25, coinCost: 2_000, reward: 'Freudesprung als zusätzliche Spielreaktion' },
  { stage: 4, name: 'Entdecker', playerLevel: 50, coinCost: 6_000, reward: 'Heldenumhang für den Kleiderschrank', unlockItem: 'cape' },
  { stage: 5, name: 'Abenteurer', playerLevel: 100, coinCost: 15_000, reward: 'Besondere, ruhige Idle-Animation' },
  { stage: 6, name: 'Naturgeist', playerLevel: 175, coinCost: 35_000, reward: 'Grüne Natur-Aura' },
  { stage: 7, name: 'Zauberwesen', playerLevel: 275, coinCost: 75_000, reward: 'Blumentopf-Dekoration fürs Zimmer', unlockItem: 'crafted-flower-planter' },
  { stage: 8, name: 'Sternenwesen', playerLevel: 400, coinCost: 150_000, reward: 'Aufwendigere Sternen-Evolutionsanimation' },
  { stage: 9, name: 'Königliches Wesen', playerLevel: 600, coinCost: 300_000, reward: 'Goldene Aura und königlicher Kosmetikeffekt' },
  { stage: 10, name: 'Ultimative Form', playerLevel: 850, coinCost: 600_000, reward: 'Titel „Ultimative Pfote“ und goldene Auszeichnung' },
] as const;

export const MAX_EVOLUTION_STAGE = EVOLUTION_STAGES.length;

export type EvolutionPurchaseResult =
  | { ok: true; data: FullPetData; stage: EvolutionStage }
  | { ok: false; reason: 'level' | 'coins' | 'complete' };

export function normalizeEvolutionStage(value: unknown): number {
  const stage = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(MAX_EVOLUTION_STAGE, stage));
}

/** Pays for exactly the next stage; level changes alone never mutate this field. */
export function purchaseNextEvolution(data: FullPetData, playerLevel: number): EvolutionPurchaseResult {
  const currentStage = normalizeEvolutionStage(data.evolutionStage);
  if (currentStage >= MAX_EVOLUTION_STAGE) return { ok: false, reason: 'complete' };
  const nextStage = EVOLUTION_STAGES[currentStage];
  if (playerLevel < nextStage.playerLevel) return { ok: false, reason: 'level' };
  if (data.coins < nextStage.coinCost) return { ok: false, reason: 'coins' };
  return {
    ok: true,
    stage: nextStage,
    data: {
      ...data,
      evolutionStage: nextStage.stage,
      coins: data.coins - nextStage.coinCost,
      owned: nextStage.unlockItem && !data.owned.includes(nextStage.unlockItem)
        ? [...data.owned, nextStage.unlockItem]
        : data.owned,
    },
  };
}
