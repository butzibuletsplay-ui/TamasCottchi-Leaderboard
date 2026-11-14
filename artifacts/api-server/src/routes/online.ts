import { randomInt } from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import {
  ClaimOnlineDailyWorldChestBody,
  ClaimOnlineDailyWorldChestResponse,
  CreateOnlineProfileBody,
  GetOnlineProfileResponse,
  GetOnlineSaveResponse,
  ImportOnlineSaveBody,
  ImportOnlineSaveResponse,
  OnlineEconomyActionResponse,
  OpenOnlineRewardChestBody,
  OpenOnlineRewardChestResponse,
  PurchaseOnlineChestKeyBody,
  PurchaseOnlineChestKeyResponse,
  UpdateOnlineProfileBody,
  UpdateOnlineProfileResponse,
  UpdateOnlineSaveBody,
  UpdateOnlineSaveResponse,
} from "@workspace/api-zod";
import { db, onlineCloudSavesTable, onlineEconomyTransactionsTable, onlineProfilesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  CHEST_KEY_PRICES,
  CHEST_TIERS,
  CHEST_UNLOCK_LEVEL,
  COLLECTION_ITEM_LINKS,
  COLLECTION_RARITY_POOLS,
  artifactBonusForEquipped,
  chestDropChances,
  chooseChance,
  dailyWorldChestTier,
  type CollectionRarity,
  type RewardChestTier,
} from "@workspace/game-economy";

const router: IRouter = Router();
const friendCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const allowedRooms = new Set([
  "Wohnzimmer",
  "Küche",
  "Bad",
  "Schlafzimmer",
  "Spielzimmer",
]);
const nameBlockedWords = [
  "administrator",
  "moderator",
  "official",
  "support",
  "system",
  "nazi",
  "fuck",
  "shit",
  "arsch",
  "scheiß",
];
const requestBuckets = new Map<string, { resetAt: number; count: number }>();

function requireOnlineAuth(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Bitte melde dich zuerst an." });
    return;
  }
  res.locals.playerId = userId;
  next();
}

function requireSameOrigin(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
): void {
  const origin = req.get("origin");
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || req.get("host");
  if (!origin || !requestHost) {
    res.status(403).json({ error: "Diese Anfrage konnte nicht geprüft werden." });
    return;
  }
  try {
    if (new URL(origin).host !== requestHost) {
      res.status(403).json({ error: "Anfragen von anderen Seiten sind gesperrt." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Ungültige Herkunft der Anfrage." });
    return;
  }
  next();
}

function limitRequests(maximum: number, windowMs: number) {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    const playerId = String(res.locals.playerId || req.ip || "unknown");
    const now = Date.now();
    const current = requestBuckets.get(playerId);
    if (!current || current.resetAt <= now) {
      requestBuckets.set(playerId, { resetAt: now + windowMs, count: 1 });
    } else if (current.count >= maximum) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
      );
      res.status(429).json({ error: "Zu viele Anfragen. Bitte warte kurz." });
      return;
    } else {
      current.count += 1;
    }
    if (requestBuckets.size > 5000) {
      for (const [key, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(key);
      }
    }
    next();
  };
}

function playerId(res: Response): string {
  return String(res.locals.playerId);
}

type JsonRecord = Record<string, unknown>;
const tiers = new Set<string>(CHEST_TIERS);
const rarityDuplicateReward: Record<CollectionRarity, { dust: number; epicEssence?: number; legendaryEssence?: number }> = {
  Common: { dust: 5 },
  Uncommon: { dust: 12 },
  Rare: { dust: 30 },
  Epic: { dust: 75, epicEssence: 1 },
  Legendary: { dust: 200, legendaryEssence: 1 },
};
const chestBonus: Record<RewardChestTier, { coins: number; xp: number }> = {
  common: { coins: 10, xp: 5 },
  uncommon: { coins: 16, xp: 8 },
  rare: { coins: 25, xp: 13 },
  epic: { coins: 42, xp: 22 },
  legendary: { coins: 70, xp: 36 },
};
const locationUnlockLevel: Record<string, number> = { park: 1, city: 3, forest: 5, beach: 8, cave: 12, mountain: 20 };
const regionTaskRequirements: Record<string, { materials: number; activities: number; rare: number }> = {
  park: { materials: 4, activities: 2, rare: 0 },
  city: { materials: 4, activities: 2, rare: 0 },
  forest: { materials: 8, activities: 2, rare: 1 },
  beach: { materials: 6, activities: 2, rare: 1 },
  cave: { materials: 2, activities: 2, rare: 1 },
  mountain: { materials: 3, activities: 2, rare: 1 },
};
const secureRandom = () => randomInt(1_000_000) / 1_000_000;
const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
const integer = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
const stringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 10_000) : [];

function worldDayKey(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  let year = Number(values.year);
  let month = Number(values.month);
  let day = Number(values.day);
  if (Number(values.hour) < 4) {
    const previous = new Date(Date.UTC(year, month - 1, day - 1));
    year = previous.getUTCFullYear();
    month = previous.getUTCMonth() + 1;
    day = previous.getUTCDate();
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeEconomySave(input: JsonRecord, now: number): JsonRecord {
  const save = { ...input };
  const world = { ...asRecord(save.world) };
  const keys = Object.fromEntries(CHEST_TIERS.map((tier) => [tier, integer(asRecord(world.keys)[tier])]));
  const instances = Array.isArray(world.chestInstances)
    ? world.chestInstances.filter((entry) => {
        const chest = asRecord(entry);
        return typeof chest.id === "string" && typeof chest.source === "string" && tiers.has(String(chest.tier));
      }).map((entry) => ({ ...asRecord(entry) }))
    : [];
  const counts = Object.fromEntries(CHEST_TIERS.map((tier) => [tier, integer(asRecord(world.rewardChests)[tier])]));
  if (instances.length === 0) {
    for (const tier of CHEST_TIERS) {
      for (let index = 0; index < counts[tier]; index += 1) {
        instances.push({
          id: `legacy-${tier}-${index + 1}`,
          source: `legacy-${tier}-${index + 1}`,
          tier,
          earnedAt: now,
        });
      }
    }
  }
  const rewardChests = Object.fromEntries(
    CHEST_TIERS.map((tier) => [tier, instances.filter((entry) => entry.tier === tier).length]),
  );
  const day = worldDayKey(now);
  const sameDay = world.worldDay === day;
  return {
    ...save,
    coins: integer(save.coins),
    xp: integer(save.xp),
    collectionIds: stringArray(save.collectionIds),
    artifactLevels: { ...asRecord(save.artifactLevels) },
    owned: stringArray(save.owned),
    inventory: { ...asRecord(save.inventory) },
    world: {
      ...world,
      keys,
      chestInstances: instances,
      rewardChests,
      openedChestIds: stringArray(world.openedChestIds),
      worldDay: day,
      dailyChestCount: sameDay ? integer(world.dailyChestCount) : 0,
      dailyChestLocations: sameDay ? stringArray(world.dailyChestLocations) : [],
      regionDailyProgress: sameDay ? asRecord(world.regionDailyProgress) : {},
      discoveries: stringArray(world.discoveries),
    },
  };
}

function preserveServerEconomy(incoming: JsonRecord, current: JsonRecord): JsonRecord {
  if (integer(current.economyVersion) < 1) return incoming;
  const oldWorld = asRecord(current.world);
  const newWorld = asRecord(incoming.world);
  const openedChestIds = stringArray(oldWorld.openedChestIds);
  const chestInstances = [
    ...(Array.isArray(oldWorld.chestInstances) ? oldWorld.chestInstances : []),
    ...(Array.isArray(newWorld.chestInstances) ? newWorld.chestInstances : []),
  ].map((entry) => ({ ...asRecord(entry) }))
    .filter((entry) =>
      typeof entry.id === "string"
      && typeof entry.source === "string"
      && tiers.has(String(entry.tier))
      && !openedChestIds.includes(String(entry.id)),
    )
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index);
  const rewardChests = Object.fromEntries(
    CHEST_TIERS.map((tier) => [tier, chestInstances.filter((entry) => entry.tier === tier).length]),
  );
  return {
    ...incoming,
    economyVersion: 1,
    world: {
      ...newWorld,
      keys: oldWorld.keys,
      rewardChests,
      chestInstances,
      openedChestIds,
      worldDay: oldWorld.worldDay,
      dailyChestCount: oldWorld.dailyChestCount,
      dailyChestLocations: oldWorld.dailyChestLocations,
      milestoneChestsClaimed: [...new Set([
        ...stringArray(oldWorld.milestoneChestsClaimed),
        ...stringArray(newWorld.milestoneChestsClaimed),
      ])],
    },
  };
}

function titleFromId(id: string): string {
  return id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function makeFriendCode(): string {
  const code = Array.from({ length: 7 }, () =>
    friendCodeAlphabet[randomInt(friendCodeAlphabet.length)],
  ).join("");
  return `SCOT-${code}`;
}

function cleanPlayerName(value: string): string | null {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    name.length < 2 ||
    name.length > 24 ||
    !/^[\p{L}\p{N} _.-]+$/u.test(name) ||
    name.startsWith(".") ||
    name.endsWith(".")
  ) {
    return null;
  }
  const normalized = name.toLocaleLowerCase("de-DE").replace(/[\s_.-]/g, "");
  if (nameBlockedWords.some((word) => normalized.includes(word))) return null;
  return name;
}

function cleanPetName(value: string): string | null {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    name.length < 1 ||
    name.length > 18 ||
    !/^[\p{L}\p{N} _.'-]+$/u.test(name) ||
    /https?:|@/i.test(name)
  ) {
    return null;
  }
  return name;
}

export function validateSaveData(input: unknown): {
  value?: Record<string, unknown>;
  error?: string;
} {
  const parsed = z.record(z.string(), z.unknown()).safeParse(input);
  if (!parsed.success) return { error: "Der Spielstand muss ein JSON-Objekt sein." };
  const value = parsed.data;
  let nodes = 0;
  const visit = (current: unknown, depth: number): boolean => {
    nodes += 1;
    if (nodes > 25000 || depth > 32) return false;
    if (typeof current === "string") return current.length <= 12000;
    if (
      current === null ||
      typeof current === "boolean" ||
      (typeof current === "number" && Number.isFinite(current))
    ) {
      return true;
    }
    if (Array.isArray(current)) {
      return current.length <= 10000 && current.every((item) => visit(item, depth + 1));
    }
    if (typeof current === "object") {
      const entries = Object.entries(current);
      return (
        entries.length <= 5000 &&
        entries.every(
          ([key, item]) =>
            key.length <= 120 &&
            !["__proto__", "constructor", "prototype"].includes(key) &&
            visit(item, depth + 1),
        )
      );
    }
    return false;
  };

  if (!visit(value, 0)) return { error: "Der Spielstand ist zu groß oder ungültig." };
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, "utf8") > 700_000) {
    return { error: "Der Spielstand ist größer als erlaubt." };
  }
  if (value.version !== 1 || typeof value.name !== "string") {
    return { error: "Dieser Spielstand gehört nicht zu tamascottchi." };
  }
  if (
    typeof value.coins !== "number" ||
    !Number.isSafeInteger(value.coins) ||
    value.coins < 0 ||
    value.coins > 1_000_000_000 ||
    typeof value.xp !== "number" ||
    !Number.isSafeInteger(value.xp) ||
    value.xp < 0 ||
    value.xp > 1_000_000_000
  ) {
    return { error: "Münzen oder Erfahrungspunkte sind ungültig." };
  }
  if (!value.needs || typeof value.needs !== "object" || Array.isArray(value.needs)) {
    return { error: "Die Bedürfnisse des Spielstands fehlen." };
  }
  const needs = value.needs as Record<string, unknown>;
  for (const key of ["hunger", "glueck", "energie", "sauberkeit"]) {
    if (
      typeof needs[key] !== "number" ||
      !Number.isFinite(needs[key]) ||
      needs[key] < 0 ||
      needs[key] > 100
    ) {
      return { error: "Ein Bedürfniswert liegt außerhalb des gültigen Bereichs." };
    }
  }
  if (!allowedRooms.has(String(value.room))) {
    return { error: "Der gespeicherte Raum ist ungültig." };
  }
  if (
    !value.inventory ||
    typeof value.inventory !== "object" ||
    Array.isArray(value.inventory)
  ) {
    return { error: "Das Inventar des Spielstands fehlt." };
  }
  const inventory = value.inventory as Record<string, unknown>;
  if (
    Object.keys(inventory).length > 500 ||
    Object.entries(inventory).some(
      ([key, amount]) =>
        !/^[a-zA-Z0-9_-]{1,80}$/.test(key) ||
        typeof amount !== "number" ||
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > 1_000_000,
    )
  ) {
    return { error: "Ein Inventargegenstand oder seine Menge ist ungültig." };
  }
  for (const key of ["owned", "equipped", "roomItems"]) {
    const list = value[key];
    if (
      !Array.isArray(list) ||
      list.length > 500 ||
      list.some(
        (item) => typeof item !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item),
      )
    ) {
      return { error: "Ein Gegenstand im Spielstand ist ungültig." };
    }
  }
  return { value };
}

function profileResponse(profile: {
  playerName: string;
  petName: string;
  level: number;
  friendCode: string;
  publicProfile: boolean;
  createdAt: Date;
}) {
  return GetOnlineProfileResponse.parse(profile);
}

router.use(requireOnlineAuth);
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie");
  next();
});

type EconomyMutation =
  | { ok: true; saveData: JsonRecord; outcome: "key-purchased" | "chest-opened" | "daily-chest-claimed"; reward?: JsonRecord }
  | { ok: false; status: number; error: string };

async function runEconomyAction(
  userId: string,
  requestId: string,
  action: string,
  mutate: (save: JsonRecord, now: number) => EconomyMutation,
): Promise<{ ok: true; response: OnlineEconomyActionResponse } | { ok: false; status: number; error: string }> {
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ userId: onlineProfilesTable.userId })
      .from(onlineProfilesTable)
      .where(eq(onlineProfilesTable.userId, userId))
      .for("update")
      .limit(1);
    if (!profile) return { kind: "failure" as const, status: 404, error: "Richte zuerst dein Online-Profil ein." };

    const [prior] = await tx
      .select()
      .from(onlineEconomyTransactionsTable)
      .where(and(
        eq(onlineEconomyTransactionsTable.userId, userId),
        eq(onlineEconomyTransactionsTable.requestId, requestId),
      ))
      .limit(1);
    if (prior) {
      if (prior.action !== action) {
        return { kind: "failure" as const, status: 409, error: "Diese Anfrage-ID wurde bereits für eine andere Aktion verwendet." };
      }
      const [latest] = await tx
        .select()
        .from(onlineCloudSavesTable)
        .where(eq(onlineCloudSavesTable.userId, userId))
        .for("update")
        .limit(1);
      const previousResponse = PurchaseOnlineChestKeyResponse.parse(prior.response);
      return {
        kind: "success" as const,
        response: PurchaseOnlineChestKeyResponse.parse(latest
          ? { ...previousResponse, saveData: latest.saveData, revision: latest.revision, updatedAt: latest.updatedAt.toISOString() }
          : previousResponse),
      };
    }

    const [current] = await tx
      .select()
      .from(onlineCloudSavesTable)
      .where(eq(onlineCloudSavesTable.userId, userId))
      .for("update")
      .limit(1);
    if (!current) return { kind: "failure" as const, status: 404, error: "Verknüpfe zuerst einen Cloud-Spielstand." };

    const now = Date.now();
    const mutation = mutate(normalizeEconomySave(current.saveData, now), now);
    if (!mutation.ok) return { kind: "failure" as const, status: mutation.status, error: mutation.error };

    const revision = current.revision + 1;
    const updatedAt = new Date(now);
    const savedState: JsonRecord = { ...mutation.saveData, economyVersion: 1 };
    const response = PurchaseOnlineChestKeyResponse.parse({
      saveData: savedState,
      revision,
      updatedAt: updatedAt.toISOString(),
      outcome: mutation.outcome,
      ...(mutation.reward ? { reward: mutation.reward } : {}),
    });
    await tx
      .update(onlineCloudSavesTable)
      .set({ saveData: savedState, revision, updatedAt })
      .where(eq(onlineCloudSavesTable.userId, userId));
    await tx
      .update(onlineProfilesTable)
      .set({
        level: Math.floor(integer(savedState.xp) / 100) + 1,
        updatedAt,
      })
      .where(eq(onlineProfilesTable.userId, userId));
    await tx.insert(onlineEconomyTransactionsTable).values({
      userId,
      requestId,
      action,
      response: response as unknown as Record<string, unknown>,
    });
    return { kind: "success" as const, response };
  });
  return result.kind === "success"
    ? { ok: true, response: result.response }
    : { ok: false, status: result.status, error: result.error };
}

router.post(
  "/online/economy/keys/purchase",
  requireSameOrigin,
  limitRequests(30, 60_000),
  async (req, res): Promise<void> => {
    const parsed = PurchaseOnlineChestKeyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Die Schlüsselanfrage ist ungültig." });
      return;
    }
    const { tier, requestId } = parsed.data;
    const result = await runEconomyAction(playerId(res), requestId, "key-purchase", (save) => {
      const level = Math.floor(integer(save.xp) / 100) + 1;
      if (level < CHEST_UNLOCK_LEVEL[tier]) return { ok: false, status: 409, error: `Dieser Schlüssel wird ab Level ${CHEST_UNLOCK_LEVEL[tier]} freigeschaltet.` };
      const price = CHEST_KEY_PRICES[tier];
      if (integer(save.coins) < price) return { ok: false, status: 409, error: "Dafür fehlen Münzen." };
      const world = asRecord(save.world);
      const keys = asRecord(world.keys);
      const updated = {
        ...save,
        coins: integer(save.coins) - price,
        world: {
          ...world,
          keys: { ...keys, [tier]: integer(keys[tier]) + 1 },
        },
      };
      return { ok: true, saveData: updated, outcome: "key-purchased" };
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(PurchaseOnlineChestKeyResponse.parse(result.response));
  },
);

router.post(
  "/online/economy/chests/open",
  requireSameOrigin,
  limitRequests(30, 60_000),
  async (req, res): Promise<void> => {
    const parsed = OpenOnlineRewardChestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Die Kistenanfrage ist ungültig." });
      return;
    }
    const { tier, requestId } = parsed.data;
    const result = await runEconomyAction(playerId(res), requestId, "chest-open", (save, now) => {
      const level = Math.floor(integer(save.xp) / 100) + 1;
      if (level < CHEST_UNLOCK_LEVEL[tier]) return { ok: false, status: 409, error: "Diese Kiste ist noch nicht freigeschaltet." };
      const world = asRecord(save.world);
      const keys = asRecord(world.keys);
      if (integer(keys[tier]) < 1) return { ok: false, status: 409, error: "Für diese Kiste fehlt der passende Schlüssel." };
      const instances = Array.isArray(world.chestInstances) ? world.chestInstances.map((entry) => ({ ...asRecord(entry) })) : [];
      const openedIds = stringArray(world.openedChestIds);
      const index = instances.findIndex((instance) => instance.tier === tier && typeof instance.id === "string" && !openedIds.includes(instance.id));
      if (index < 0) return { ok: false, status: 409, error: "Du hast keine passende Kiste im Tresor." };
      const chest = instances[index];
      const rarity = chooseChance(chestDropChances(tier, level), secureRandom) as CollectionRarity;
      const pool = COLLECTION_RARITY_POOLS[rarity];
      const itemId = pool[Math.floor(secureRandom() * pool.length)];
      const artifactLevels = { ...asRecord(save.artifactLevels) };
      const collectionIds = stringArray(save.collectionIds);
      const wasOwned = integer(artifactLevels[itemId]) > 0 || collectionIds.includes(itemId);
      const itemName = titleFromId(itemId);
      const inventory = { ...asRecord(save.inventory) };
      const owned = stringArray(save.owned);
      const discoveries = stringArray(world.discoveries);
      const milestoneChestsClaimed = stringArray(world.milestoneChestsClaimed);
      const baseReward = chestBonus[tier];
      const coins = Math.floor(baseReward.coins * (1 + artifactBonusForEquipped(
        stringArray(save.equippedArtifacts), artifactLevels, "coins", "world",
      ) / 100));
      const xp = Math.floor(baseReward.xp * (1 + artifactBonusForEquipped(
        stringArray(save.equippedArtifacts), artifactLevels, "xp", "world",
      ) / 100));
      let duplicate = { dust: 0, epicEssence: 0, legendaryEssence: 0 };
      if (wasOwned) {
        const duplicateReward = rarityDuplicateReward[rarity];
        duplicate = {
          dust: duplicateReward.dust,
          epicEssence: duplicateReward.epicEssence || 0,
          legendaryEssence: duplicateReward.legendaryEssence || 0,
        };
        inventory["artifact-dust"] = integer(inventory["artifact-dust"]) + duplicate.dust;
        if (duplicate.epicEssence) inventory["epic-essence"] = integer(inventory["epic-essence"]) + duplicate.epicEssence;
        if (duplicate.legendaryEssence) inventory["legendary-essence"] = integer(inventory["legendary-essence"]) + duplicate.legendaryEssence;
      } else {
        artifactLevels[itemId] = 1;
        collectionIds.push(itemId);
        discoveries.push(itemId);
        const linked = COLLECTION_ITEM_LINKS[itemId];
        if (linked && !owned.includes(linked)) owned.push(linked);
      }

      instances.splice(index, 1);
      const nextOpened = [...new Set([...openedIds, String(chest.id)])];
      const nextKeys = { ...keys, [tier]: integer(keys[tier]) - 1 };
      const rewardChests = Object.fromEntries(
        CHEST_TIERS.map((candidate) => [candidate, instances.filter((entry) => entry.tier === candidate).length]),
      );
      const nextWorld: JsonRecord = {
        ...world,
        keys: nextKeys,
        chestInstances: instances,
        rewardChests,
        openedChestIds: nextOpened,
        discoveries: [...new Set(discoveries)],
      };
      const nextSave: JsonRecord = {
        ...save,
        coins: integer(save.coins) + coins,
        xp: integer(save.xp) + xp,
        collectionIds: [...new Set(collectionIds)],
        artifactLevels,
        inventory,
        owned,
        world: nextWorld,
        lastUpdated: now,
      };
      if (!wasOwned && Object.keys(artifactLevels).length > 0 && Object.keys(artifactLevels).filter((id) => integer(artifactLevels[id]) > 0).length >= Object.values(COLLECTION_RARITY_POOLS).flat().length && !milestoneChestsClaimed.includes("complete-artifact-collection")) {
        const milestoneSource = "milestone:complete-artifact-collection";
        instances.push({ id: `chest-${milestoneSource}`, source: milestoneSource, tier: "legendary", earnedAt: now });
        nextWorld.chestInstances = instances;
        nextWorld.rewardChests = {
          ...rewardChests,
          legendary: integer(rewardChests.legendary) + 1,
        };
        nextWorld.milestoneChestsClaimed = [...milestoneChestsClaimed, "complete-artifact-collection"];
      }
      return {
        ok: true,
        saveData: nextSave,
        outcome: "chest-opened",
        reward: {
          tier,
          itemId,
          itemName,
          rarity,
          source: String(chest.source),
          coins,
          xp,
          isCollectionFind: !wasOwned,
          isDuplicate: wasOwned,
          duplicateDust: duplicate.dust,
          epicEssence: duplicate.epicEssence,
          legendaryEssence: duplicate.legendaryEssence,
        },
      };
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(OpenOnlineRewardChestResponse.parse(result.response));
  },
);

router.post(
  "/online/economy/world-chests/claim",
  requireSameOrigin,
  limitRequests(60, 60_000),
  async (req, res): Promise<void> => {
    const parsed = ClaimOnlineDailyWorldChestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Die Weltkisten-Anfrage ist ungültig." });
      return;
    }
    const { locationId, requestId } = parsed.data;
    const result = await runEconomyAction(playerId(res), requestId, "daily-world-chest", (save, now) => {
      const level = Math.floor(integer(save.xp) / 100) + 1;
      const requiredLevel = locationUnlockLevel[locationId];
      if (!requiredLevel || level < requiredLevel) return { ok: false, status: 409, error: "Dieses Weltgebiet ist noch gesperrt." };
      const world = asRecord(save.world);
      const day = worldDayKey(now);
      const progressByLocation = asRecord(world.regionDailyProgress);
      const progress = asRecord(progressByLocation[locationId]);
      const target = regionTaskRequirements[locationId];
      if (integer(progress.materials) < target.materials || integer(progress.activities) < target.activities || integer(progress.rare) < target.rare) {
        return { ok: false, status: 409, error: "Erledige zuerst den aktiven Tagesauftrag in diesem Gebiet." };
      }
      const sameDay = world.worldDay === day;
      const claims = sameDay ? stringArray(world.dailyChestLocations) : [];
      if (claims.includes(locationId)) return { ok: false, status: 409, error: "Die Weltkiste für dieses Gebiet wurde heute schon abgeholt." };
      const tier = dailyWorldChestTier(level, secureRandom);
      const source = `region-daily:${locationId}:${day}`;
      const instance = { id: `chest-${source}`, source, tier, earnedAt: now };
      const instances = Array.isArray(world.chestInstances) ? world.chestInstances.map((entry) => ({ ...asRecord(entry) })) : [];
      if (instances.some((entry) => entry.source === source)) return { ok: false, status: 409, error: "Diese Weltkiste wurde bereits abgeholt." };
      instances.push(instance);
      const rewardChests = Object.fromEntries(
        CHEST_TIERS.map((candidate) => [candidate, instances.filter((entry) => entry.tier === candidate).length]),
      );
      return {
        ok: true,
        saveData: {
          ...save,
          world: {
            ...world,
            worldDay: day,
            dailyChestCount: (sameDay ? integer(world.dailyChestCount) : 0) + 1,
            dailyChestLocations: [...new Set([...claims, locationId])],
            chestInstances: instances,
            rewardChests,
          },
          lastUpdated: now,
        },
        outcome: "daily-chest-claimed",
        reward: { tier, locationId, day, source },
      };
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(ClaimOnlineDailyWorldChestResponse.parse(result.response));
  },
);

router.get("/online/profile", async (_req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(onlineProfilesTable)
    .where(eq(onlineProfilesTable.userId, playerId(res)))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Richte zuerst dein Online-Profil ein." });
    return;
  }
  res.json(
    profileResponse({
      playerName: profile.playerName,
      petName: profile.petName,
      level: profile.level,
      friendCode: profile.friendCode,
      publicProfile: profile.publicProfile,
      createdAt: profile.createdAt,
    }),
  );
});

router.post(
  "/online/profile",
  requireSameOrigin,
  limitRequests(5, 60_000),
  async (req, res): Promise<void> => {
    const parsed = CreateOnlineProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Spielername oder Scottchi-Name ist ungültig." });
      return;
    }
    const playerName = cleanPlayerName(parsed.data.playerName);
    const petName = cleanPetName(parsed.data.petName);
    if (!playerName || !petName) {
      res.status(400).json({ error: "Bitte wähle einen passenden Namen." });
      return;
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const [created] = await db
        .insert(onlineProfilesTable)
        .values({
          userId: playerId(res),
          playerName,
          petName,
          friendCode: makeFriendCode(),
        })
        .onConflictDoNothing()
        .returning();
      if (created) {
        res.status(201).json(profileResponse(created));
        return;
      }
      const [existing] = await db
        .select()
        .from(onlineProfilesTable)
        .where(eq(onlineProfilesTable.userId, playerId(res)))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "Für dieses Konto gibt es bereits ein Profil." });
        return;
      }
    }
    req.log.warn("Friend code generation exhausted collision retries");
    res.status(503).json({ error: "Der Freundescode konnte nicht erstellt werden." });
  },
);

router.patch(
  "/online/profile",
  requireSameOrigin,
  limitRequests(12, 60_000),
  async (req, res): Promise<void> => {
    const parsed = UpdateOnlineProfileBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
      res.status(400).json({ error: "Es gibt keine gültigen Profiländerungen." });
      return;
    }
    const update: Partial<{
      playerName: string;
      petName: string;
      publicProfile: boolean;
    }> = {};
    if (parsed.data.playerName !== undefined) {
      const value = cleanPlayerName(parsed.data.playerName);
      if (!value) {
        res.status(400).json({ error: "Dieser Spielername ist nicht verfügbar." });
        return;
      }
      update.playerName = value;
    }
    if (parsed.data.petName !== undefined) {
      const value = cleanPetName(parsed.data.petName);
      if (!value) {
        res.status(400).json({ error: "Der Scottchi-Name ist ungültig." });
        return;
      }
      update.petName = value;
    }
    if (parsed.data.publicProfile !== undefined) {
      update.publicProfile = parsed.data.publicProfile;
    }
    const [profile] = await db
      .update(onlineProfilesTable)
      .set(update)
      .where(eq(onlineProfilesTable.userId, playerId(res)))
      .returning();
    if (!profile) {
      res.status(404).json({ error: "Richte zuerst dein Online-Profil ein." });
      return;
    }
    res.json(profileResponse(profile));
  },
);

router.get("/online/save", async (_req, res): Promise<void> => {
  const [save] = await db
    .select()
    .from(onlineCloudSavesTable)
    .where(eq(onlineCloudSavesTable.userId, playerId(res)))
    .limit(1);
  res.json(
    GetOnlineSaveResponse.parse(
      save
        ? {
            saveData: save.saveData,
            revision: save.revision,
            imported: save.imported,
            updatedAt: save.updatedAt,
          }
        : { saveData: null, revision: 0, imported: false, updatedAt: null },
    ),
  );
});

router.put(
  "/online/save",
  requireSameOrigin,
  limitRequests(120, 60_000),
  async (req, res): Promise<void> => {
    const parsed = UpdateOnlineSaveBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Die Speicheranfrage ist ungültig." });
      return;
    }
    const checked = validateSaveData(parsed.data.saveData);
    const saveData = checked.value;
    if (!saveData) {
      res.status(422).json({ error: checked.error });
      return;
    }
    const userId = playerId(res);
    const result = await db.transaction(async (tx) => {
      const [profile] = await tx
        .select({ userId: onlineProfilesTable.userId })
        .from(onlineProfilesTable)
        .where(eq(onlineProfilesTable.userId, userId))
        .for("update")
        .limit(1);
      if (!profile) return { kind: "profile_missing" as const };
      const [current] = await tx
        .select()
        .from(onlineCloudSavesTable)
        .where(eq(onlineCloudSavesTable.userId, userId))
        .for("update")
        .limit(1);
      if (!current && parsed.data.expectedRevision !== 0) {
        return { kind: "conflict" as const, revision: 0 };
      }
      if (current && current.revision !== parsed.data.expectedRevision) {
        return { kind: "conflict" as const, revision: current.revision };
      }
      const nextSaveData = current
        ? preserveServerEconomy(saveData, current.saveData)
        : saveData;
      const revision = (current?.revision ?? 0) + 1;
      const now = new Date();
      if (current) {
        await tx
          .update(onlineCloudSavesTable)
          .set({ saveData: nextSaveData, revision, updatedAt: now })
          .where(eq(onlineCloudSavesTable.userId, userId));
      } else {
        await tx.insert(onlineCloudSavesTable).values({
          userId,
          saveData: nextSaveData,
          revision,
          imported: false,
          updatedAt: now,
        });
      }
      const xp = nextSaveData.xp as number;
      const name = nextSaveData.name as string;
      await tx
        .update(onlineProfilesTable)
        .set({
          petName: cleanPetName(name) || "Wuschel",
          level: Math.floor(xp / 100) + 1,
          updatedAt: now,
        })
        .where(eq(onlineProfilesTable.userId, userId));
      return { kind: "saved" as const, revision, imported: current?.imported ?? false, now };
    });
    if (result.kind === "profile_missing") {
      res.status(404).json({ error: "Richte zuerst dein Online-Profil ein." });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({
        error: `Der Cloud-Spielstand wurde auf einem anderen Gerät geändert (Revision ${result.revision}).`,
      });
      return;
    }
    res.json(
      UpdateOnlineSaveResponse.parse({
        revision: result.revision,
        imported: result.imported,
        duplicate: false,
        updatedAt: result.now,
      }),
    );
  },
);

router.post(
  "/online/save/import",
  requireSameOrigin,
  limitRequests(5, 60_000),
  async (req, res): Promise<void> => {
    const parsed = ImportOnlineSaveBody.safeParse(req.body);
    if (!parsed.success || !/^[0-9a-f-]{32,36}$/i.test(parsed.data?.requestId || "")) {
      res.status(400).json({ error: "Die Importanfrage ist ungültig." });
      return;
    }
    const checked = validateSaveData(parsed.data.saveData);
    const saveData = checked.value;
    if (!saveData) {
      res.status(422).json({ error: checked.error });
      return;
    }
    if (parsed.data.expectedRevision !== 0) {
      res.status(409).json({ error: "Ein bestehender Cloud-Spielstand wird nicht überschrieben." });
      return;
    }
    const userId = playerId(res);
    const result = await db.transaction(async (tx) => {
      const [profile] = await tx
        .select({ userId: onlineProfilesTable.userId })
        .from(onlineProfilesTable)
        .where(eq(onlineProfilesTable.userId, userId))
        .for("update")
        .limit(1);
      if (!profile) return { kind: "profile_missing" as const };
      const [current] = await tx
        .select()
        .from(onlineCloudSavesTable)
        .where(eq(onlineCloudSavesTable.userId, userId))
        .for("update")
        .limit(1);
      if (current?.importRequestId === parsed.data.requestId) {
        return {
          kind: "duplicate" as const,
          revision: current.revision,
          now: current.updatedAt,
        };
      }
      if (current) return { kind: "already_has_save" as const };
      const now = new Date();
      const [created] = await tx
        .insert(onlineCloudSavesTable)
        .values({
          userId,
          saveData,
          revision: 1,
          imported: true,
          importRequestId: parsed.data.requestId,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();
      if (!created) return { kind: "already_has_save" as const };
      const xp = saveData.xp as number;
      await tx
        .update(onlineProfilesTable)
        .set({
          petName: cleanPetName(saveData.name as string) || "Wuschel",
          level: Math.floor(xp / 100) + 1,
          updatedAt: now,
        })
        .where(eq(onlineProfilesTable.userId, userId));
      return { kind: "imported" as const, revision: 1, now };
    });
    if (result.kind === "profile_missing") {
      res.status(404).json({ error: "Richte zuerst dein Online-Profil ein." });
      return;
    }
    if (result.kind === "already_has_save") {
      res.status(409).json({
        error: "Für dieses Konto wurde bereits ein Cloud-Spielstand angelegt.",
      });
      return;
    }
    res.status(result.kind === "duplicate" ? 200 : 201).json(
      ImportOnlineSaveResponse.parse({
        revision: result.revision,
        imported: true,
        duplicate: result.kind === "duplicate",
        updatedAt: result.now,
      }),
    );
  },
);

router.delete(
  "/online/account",
  requireSameOrigin,
  limitRequests(3, 60_000),
  async (req, res): Promise<void> => {
    const userId = playerId(res);
    await db
      .delete(onlineProfilesTable)
      .where(eq(onlineProfilesTable.userId, userId));
    try {
      await clerkClient.users.deleteUser(userId);
    } catch (error) {
      req.log.warn({ err: error }, "Clerk account deletion did not complete");
      res.status(502).json({
        error: "Die Spieldaten wurden gelöscht, aber das Konto noch nicht. Bitte erneut versuchen.",
      });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
