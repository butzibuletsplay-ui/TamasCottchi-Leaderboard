import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSaveData } from "./online";

const validSave = {
  version: 1,
  saveSchema: 5,
  name: "Wuschel",
  needs: { hunger: 78, glueck: 83, energie: 72, sauberkeit: 88 },
  lastUpdated: 1_800_000_000_000,
  coins: 250,
  xp: 320,
  inventory: { kibble: 3 },
  owned: ["ball"],
  equipped: [],
  room: "Wohnzimmer",
  roomItems: [],
};

test("accepts a valid normalized game save", () => {
  assert.deepEqual(validateSaveData(validSave), { value: validSave });
});

test("rejects invalid needs and impossible room names", () => {
  assert.match(
    validateSaveData({ ...validSave, needs: { ...validSave.needs, hunger: 101 } }).error ?? "",
    /Bedürfniswert/,
  );
  assert.match(validateSaveData({ ...validSave, room: "Unknown" }).error ?? "", /Raum/);
});

test("rejects unsafe object keys and deeply nested payloads", () => {
  const unsafe = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
  assert.match(validateSaveData({ ...validSave, extra: unsafe }).error ?? "", /ungültig/);

  let nested: unknown = "leaf";
  for (let depth = 0; depth < 34; depth += 1) nested = { nested };
  assert.match(validateSaveData({ ...validSave, extra: nested }).error ?? "", /zu groß oder ungültig/);
});

test("rejects a payload larger than the cloud-save limit", () => {
  const huge = Object.fromEntries(
    Array.from({ length: 60 }, (_, index) => [`field-${index}`, "x".repeat(12_000)]),
  );
  assert.match(validateSaveData({ ...validSave, extra: huge }).error ?? "", /größer als erlaubt/);
});
