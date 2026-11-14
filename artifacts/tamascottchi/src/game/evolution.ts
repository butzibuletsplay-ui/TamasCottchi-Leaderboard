import type { FullPetData } from './data';
import { CHARACTER_EVOLUTION_REQUIREMENTS, CHARACTER_TRAIT_IDS } from '@workspace/game-economy';

export type EvolutionStage = {
  stage: number;
  name: string;
  playerLevel: number;
  traitPointsRequired: number;
  coinCost: number;
  reward: string;
  unlockItem?: string;
};

const EVOLUTION_DETAILS: readonly Omit<EvolutionStage, 'stage' | 'playerLevel' | 'traitPointsRequired' | 'coinCost'>[] = [
  { name: 'Original Scotchi', reward: 'Die ursprüngliche Scotchi-Form' },
  { name: 'Sprössling Scotchi', reward: 'Neue Form mit Pflanzenspross' },
  { name: 'Entdecker Scotchi', reward: 'Neue Entdeckerform mit Rucksack und Goggles' },
  { name: 'Magischer Scotchi', reward: 'Magische Form und Heldenumhang für den Kleiderschrank' },
  { name: 'Blumen Scotchi', reward: 'Blumenform mit besonderer Ruheanimation' },
  { name: 'Naturwächter Scotchi', reward: 'Naturwächterform mit grüner Aura' },
  { name: 'Sternenkristall Scotchi', reward: 'Kristallform mit Zimmerdekoration' },
  { name: 'Himmlischer Scotchi', reward: 'Himmlische Form mit stärkerem Entwicklungseffekt' },
  { name: 'Königlicher Scotchi', reward: 'Königliche Form mit goldener Aura' },
  { name: 'Transzendenter Scotchi', reward: 'Transzendente Form und Titel „Ultimative Pfote“' },
];

export const EVOLUTION_STAGES: readonly EvolutionStage[] = CHARACTER_EVOLUTION_REQUIREMENTS.map((requirements, index) => ({
  ...requirements,
  ...EVOLUTION_DETAILS[index],
}));

export const MAX_EVOLUTION_STAGE = EVOLUTION_STAGES.length;

export type EvolutionPurchaseResult =
  | { ok: true; data: FullPetData; stage: EvolutionStage }
  | { ok: false; reason: 'account' | 'level' | 'traits' | 'coins' | 'complete' | 'sync'; message?: string };

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
  if (CHARACTER_TRAIT_IDS.some((trait) => data.characterPoints[trait] < nextStage.traitPointsRequired)) {
    return { ok: false, reason: 'traits' };
  }
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
