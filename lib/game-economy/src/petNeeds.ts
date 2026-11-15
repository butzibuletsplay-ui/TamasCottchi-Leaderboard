export type PetNeedValues = {
  hunger: number;
  glueck: number;
  energie: number;
  sauberkeit: number;
};

export const NEED_RATES_PER_HOUR = {
  hunger: 55 / 8,
  glueck: 10 / 8,
  sauberkeit: 15 / 8,
  awakeEnergy: 4,
  sleepEnergy: 12.5,
} as const;

const HOUR_MS = 60 * 60 * 1000;

function clampNeed(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * Applies the elapsed real time exactly once. Needs continue changing while the
 * app is closed; sleep only restores energy between its saved start and end.
 */
export function simulatePetNeeds(
  needs: PetNeedValues,
  from: number,
  to: number,
  sleepStartedAt: number | null = null,
  sleepUntil: number | null = null,
): PetNeedValues {
  const elapsedMs = Math.max(0, to - from);
  if (elapsedMs === 0) {
    return {
      hunger: clampNeed(needs.hunger),
      glueck: clampNeed(needs.glueck),
      energie: clampNeed(needs.energie),
      sauberkeit: clampNeed(needs.sauberkeit),
    };
  }

  const sleepStart = Number.isFinite(sleepStartedAt) ? Math.max(from, sleepStartedAt!) : from;
  const sleepEnd = Number.isFinite(sleepUntil) ? Math.min(to, sleepUntil!) : from;
  const sleepingMs = sleepStartedAt !== null && sleepUntil !== null
    ? Math.max(0, sleepEnd - sleepStart)
    : 0;
  const awakeHours = (elapsedMs - sleepingMs) / HOUR_MS;
  const sleepingHours = sleepingMs / HOUR_MS;
  const round = (value: number) => Math.round(clampNeed(value) * 100) / 100;

  return {
    hunger: round(needs.hunger - NEED_RATES_PER_HOUR.hunger * elapsedMs / HOUR_MS),
    glueck: round(needs.glueck - NEED_RATES_PER_HOUR.glueck * elapsedMs / HOUR_MS),
    energie: round(
      needs.energie
      - NEED_RATES_PER_HOUR.awakeEnergy * awakeHours
      + NEED_RATES_PER_HOUR.sleepEnergy * sleepingHours,
    ),
    sauberkeit: round(needs.sauberkeit - NEED_RATES_PER_HOUR.sauberkeit * elapsedMs / HOUR_MS),
  };
}
