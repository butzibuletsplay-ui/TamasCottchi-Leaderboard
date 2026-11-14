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
  { stage: 1, name: 'Original Scotchi', playerLevel: 1, coinCost: 0, reward: 'Die ursprüngliche Scotchi-Form' },
  { stage: 2, name: 'Sprössling Scotchi', playerLevel: 10, coinCost: 500, reward: 'Neue Form mit Pflanzenspross' },
  { stage: 3, name: 'Entdecker Scotchi', playerLevel: 25, coinCost: 2_000, reward: 'Neue Entdeckerform mit Rucksack und Goggles' },
  { stage: 4, name: 'Magischer Scotchi', playerLevel: 50, coinCost: 6_000, reward: 'Magische Form und Heldenumhang für den Kleiderschrank', unlockItem: 'cape' },
  { stage: 5, name: 'Blumen Scotchi', playerLevel: 100, coinCost: 15_000, reward: 'Blumenform mit besonderer Ruheanimation' },
  { stage: 6, name: 'Naturwächter Scotchi', playerLevel: 175, coinCost: 35_000, reward: 'Naturwächterform mit grüner Aura' },
  { stage: 7, name: 'Sternenkristall Scotchi', playerLevel: 275, coinCost: 75_000, reward: 'Kristallform mit Zimmerdekoration', unlockItem: 'crafted-flower-planter' },
  { stage: 8, name: 'Himmlischer Scotchi', playerLevel: 400, coinCost: 150_000, reward: 'Himmlische Form mit stärkerem Entwicklungseffekt' },
  { stage: 9, name: 'Königlicher Scotchi', playerLevel: 600, coinCost: 300_000, reward: 'Königliche Form mit goldener Aura' },
  { stage: 10, name: 'Transzendenter Scotchi', playerLevel: 850, coinCost: 600_000, reward: 'Transzendente Form und Titel „Ultimative Pfote“' },
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
      activeEvolutionStage: nextStage.stage,
      coins: data.coins - nextStage.coinCost,
      owned: nextStage.unlockItem && !data.owned.includes(nextStage.unlockItem)
        ? [...data.owned, nextStage.unlockItem]
        : data.owned,
    },
  };
}

/** Selects an already-unlocked form for free without changing progression or currency. */
export function selectUnlockedEvolution(data: FullPetData, stage: number): FullPetData | null {
  if (!Number.isInteger(stage) || stage < 1 || stage > normalizeEvolutionStage(data.evolutionStage)) return null;
  return { ...data, activeEvolutionStage: stage };
}
