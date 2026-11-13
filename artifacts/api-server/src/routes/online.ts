import { randomInt } from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import {
  CreateOnlineProfileBody,
  GetOnlineProfileResponse,
  GetOnlineSaveResponse,
  ImportOnlineSaveBody,
  ImportOnlineSaveResponse,
  UpdateOnlineProfileBody,
  UpdateOnlineProfileResponse,
  UpdateOnlineSaveBody,
  UpdateOnlineSaveResponse,
} from "@workspace/api-zod";
import { db, onlineCloudSavesTable, onlineProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

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
      const revision = (current?.revision ?? 0) + 1;
      const now = new Date();
      if (current) {
        await tx
          .update(onlineCloudSavesTable)
          .set({ saveData: checked.value, revision, updatedAt: now })
          .where(eq(onlineCloudSavesTable.userId, userId));
      } else {
        await tx.insert(onlineCloudSavesTable).values({
          userId,
          saveData,
          revision,
          imported: false,
          updatedAt: now,
        });
      }
      const xp = saveData.xp as number;
      const name = saveData.name as string;
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
