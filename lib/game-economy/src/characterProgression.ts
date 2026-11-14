export const CHARACTER_TRAIT_IDS = [
  'verspielt',
  'neugierig',
  'verschlafen',
  'frech',
  'anhaenglich',
] as const;

export type CharacterTraitId = typeof CHARACTER_TRAIT_IDS[number];
export type CharacterPoints = Record<CharacterTraitId, number>;
export type CharacterDailyProgress = { day: string; earned: number; nextAwardAt: number };

export const CHARACTER_DAILY_POINT_CAP = 100;
export const CHARACTER_POINTS_PER_ACTIVITY = 2;
export const CHARACTER_ACTIVITY_COOLDOWN_MS = 20_000;
export const CHARACTER_ACTIVITY_IDS = [
  'cuddle',
  'feeding',
  'bathing',
  'playful-interaction',
  'toy-use',
  'minigame',
  'room-explore',
  'world-discovery',
  'rest-complete',
] as const;
export type CharacterActivityId = typeof CHARACTER_ACTIVITY_IDS[number];
export type CharacterToyId = keyof typeof CHARACTER_TOY_TRAITS;

export type CharacterEvolutionRequirement = {
  stage: number;
  playerLevel: number;
  traitPointsRequired: number;
  coinCost: number;
  unlockItem?: string;
};

export const CHARACTER_EVOLUTION_REQUIREMENTS: readonly CharacterEvolutionRequirement[] = [
  { stage: 1, playerLevel: 1, traitPointsRequired: 0, coinCost: 0 },
  { stage: 2, playerLevel: 10, traitPointsRequired: 100, coinCost: 500 },
  { stage: 3, playerLevel: 25, traitPointsRequired: 250, coinCost: 2_000 },
  { stage: 4, playerLevel: 50, traitPointsRequired: 500, coinCost: 6_000, unlockItem: 'cape' },
  { stage: 5, playerLevel: 100, traitPointsRequired: 900, coinCost: 15_000 },
  { stage: 6, playerLevel: 175, traitPointsRequired: 1_500, coinCost: 35_000 },
  { stage: 7, playerLevel: 275, traitPointsRequired: 2_300, coinCost: 75_000, unlockItem: 'crafted-flower-planter' },
  { stage: 8, playerLevel: 400, traitPointsRequired: 3_300, coinCost: 150_000 },
  { stage: 9, playerLevel: 600, traitPointsRequired: 4_500, coinCost: 300_000 },
  { stage: 10, playerLevel: 850, traitPointsRequired: 6_000, coinCost: 600_000 },
];

export const CHARACTER_TOY_TRAITS = {
  ball: 'verspielt',
  'bone-toy': 'verspielt',
  duck: 'verspielt',
  rope: 'verspielt',
  frisbee: 'verspielt',
  teddy: 'verspielt',
  bowl: 'anhaenglich',
  shampoo: 'anhaenglich',
  'crafted-toy': 'verspielt',
  'crafted-shell-rattle': 'verspielt',
  'crafted-gem-ball': 'verspielt',
  'crafted-bone-puzzle': 'verspielt',
  'crafted-leaf-frisbee': 'verspielt',
  'crafted-fossil-chew': 'verspielt',
  'crafted-ore-toy': 'verspielt',
} as const satisfies Readonly<Record<string, CharacterTraitId>>;

const INITIAL_CHARACTER_POINTS: CharacterPoints = {
  verspielt: 0,
  neugierig: 0,
  verschlafen: 0,
  frech: 0,
  anhaenglich: 0,
};

function safeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1_000_000, Math.floor(value)))
    : fallback;
}

/** Character points never decay. Old 0–100 personality values migrate one-for-one, without inflating progress. */
export function normalizeCharacterPoints(
  value: unknown,
  legacyPersonality?: unknown,
): CharacterPoints {
  const saved = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const legacy = legacyPersonality && typeof legacyPersonality === 'object' && !Array.isArray(legacyPersonality)
    ? legacyPersonality as Record<string, unknown>
    : {};
  return Object.fromEntries(CHARACTER_TRAIT_IDS.map((trait) => [
    trait,
    saved[trait] !== undefined
      ? safeInteger(saved[trait])
      : Math.max(0, Math.min(100, safeInteger(legacy[trait]))),
  ])) as CharacterPoints;
}

/** This separate character-point day changes at midnight in Europe/Berlin. */
export function characterProgressDayKey(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeCharacterDailyProgress(value: unknown, timestamp: number): CharacterDailyProgress {
  const today = characterProgressDayKey(timestamp);
  const saved = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  if (saved.day !== today) return { day: today, earned: 0, nextAwardAt: 0 };
  return {
    day: today,
    earned: Math.min(CHARACTER_DAILY_POINT_CAP, safeInteger(saved.earned)),
    nextAwardAt: typeof saved.nextAwardAt === 'number' && Number.isFinite(saved.nextAwardAt)
      ? Math.max(0, Math.min(timestamp + CHARACTER_ACTIVITY_COOLDOWN_MS, saved.nextAwardAt))
      : 0,
  };
}

export type CharacterActivityResult =
  | { ok: true; trait: CharacterTraitId; points: number; characterPoints: CharacterPoints; daily: CharacterDailyProgress }
  | { ok: false; reason: 'daily-cap' | 'cooldown' | 'invalid-activity'; daily: CharacterDailyProgress };

/** The server supplies activity IDs, never a client-selected trait or point amount. */
export function awardCharacterActivity(
  pointsInput: unknown,
  dailyInput: unknown,
  activity: CharacterActivityId,
  toyId: CharacterToyId | undefined,
  timestamp: number,
): CharacterActivityResult {
  const daily = normalizeCharacterDailyProgress(dailyInput, timestamp);
  if (daily.earned >= CHARACTER_DAILY_POINT_CAP) return { ok: false, reason: 'daily-cap', daily };
  if (daily.nextAwardAt > timestamp) return { ok: false, reason: 'cooldown', daily };

  const trait = activity === 'cuddle' || activity === 'feeding' || activity === 'bathing'
    ? 'anhaenglich' as const
    : activity === 'playful-interaction' ? 'frech' as const
      : activity === 'minigame' ? 'verspielt' as const
        : activity === 'room-explore' || activity === 'world-discovery' ? 'neugierig' as const
          : activity === 'rest-complete' ? 'verschlafen' as const
            : activity === 'toy-use' && toyId ? CHARACTER_TOY_TRAITS[toyId]
              : undefined;
  if (!trait) return { ok: false, reason: 'invalid-activity', daily };

  const characterPoints = normalizeCharacterPoints(pointsInput);
  const points = Math.min(CHARACTER_POINTS_PER_ACTIVITY, CHARACTER_DAILY_POINT_CAP - daily.earned);
  return {
    ok: true,
    trait,
    points,
    characterPoints: { ...characterPoints, [trait]: characterPoints[trait] + points },
    daily: {
      day: daily.day,
      earned: daily.earned + points,
      nextAwardAt: timestamp + CHARACTER_ACTIVITY_COOLDOWN_MS,
    },
  };
}
