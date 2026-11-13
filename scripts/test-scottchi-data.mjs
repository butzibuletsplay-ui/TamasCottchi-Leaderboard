import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const require = createRequire(resolve('artifacts/api-server/package.json'));
const { build } = require('esbuild');
const compiled = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/data.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const { initialData, normalize, loadData, moodFor, rewardFor, STORE_KEY, BACKUP_KEY, BACKUP_KEY_21, SAVE_SCHEMA } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const worldBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/world.ts', 'artifacts/tamascottchi/src/game/data.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', outdir: 'test-build',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const worldModule = await import(`data:text/javascript;base64,${Buffer.from(worldBuild.outputFiles.find((file) => file.path.includes('world.js')).text).toString('base64')}`);
const dataModule = await import(`data:text/javascript;base64,${Buffer.from(worldBuild.outputFiles.find((file) => file.path.includes('data.js')).text).toString('base64')}`);
const BACKUP_KEY_30 = dataModule.BACKUP_KEY_30;
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

test('legacy possessions, currency, achievements and records survive normalization', () => {
  const legacy = {
    ...initialData(), saveSchema: undefined, coins: 987, xp: 432,
    inventory: { kibble: 17, soap: 8 }, owned: ['ball', 'scarf', 'crown', 'forest'],
    equipped: ['scarf', 'crown'], roomItems: ['plant'], activeBackground: 'forest',
    claimedAchievements: ['first-game'],
    records: [{ id: 'legacy', game: 'catch', score: 321, date: Date.now() }],
  };
  const actual = normalize(legacy);
  for (const key of ['coins', 'xp', 'inventory', 'owned', 'equipped', 'roomItems', 'activeBackground', 'claimedAchievements', 'records']) {
    assert.deepEqual(actual[key], legacy[key], key);
  }
  assert.equal(actual.highscores.catch, 321);
  assert.equal(actual.saveSchema, SAVE_SCHEMA);
});
test('legacy raw backup is exact and is never replaced on later loads', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: undefined };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  loadData();
  assert.equal(storage.get(BACKUP_KEY), raw);
  storage.set(STORE_KEY, JSON.stringify({ ...old, coins: 999 }));
  loadData();
  assert.equal(storage.get(BACKUP_KEY), raw);
});
test('unreadable save fails explicitly and remains untouched', () => {
  storage.clear();
  storage.set(STORE_KEY, '{broken');
  assert.throws(loadData, /nicht überschrieben/);
  assert.equal(storage.get(STORE_KEY), '{broken');
});
test('unknown save schema is not silently replaced', () => {
  storage.clear();
  const raw = '{"version":999,"needs":{},"stats":{}}';
  storage.set(STORE_KEY, raw);
  assert.throws(loadData, /nicht überschrieben/);
  assert.equal(storage.get(STORE_KEY), raw);
});
test('need priorities override excitement when a need is critical', () => {
  const needs = { hunger: 95, energie: 10, sauberkeit: 25, glueck: 90 };
  assert.equal(moodFor(needs, true, false), 'tired');
  assert.equal(moodFor({ ...needs, energie: 90 }, false, false), 'dirty');
  assert.equal(moodFor({ hunger: 90, energie: 90, sauberkeit: 90, glueck: 90 }, false, false), 'happy');
  assert.equal(moodFor(needs, true, true), 'tired');
});
test('round rewards stay bounded and diminish after fifteen daily games', () => {
  for (const game of ['catch', 'run', 'turbo', 'bone', 'memory']) {
    for (const score of [0, 10, 999999]) {
      const r = rewardFor(game, score, 0);
      assert.ok(r.coins >= 2 && r.coins <= 30);
      assert.ok(r.xp >= 4 && r.xp <= 35);
      const reduced = rewardFor(game, score, 15);
      assert.equal(reduced.coins, Math.ceil(r.coins / 2));
      assert.equal(reduced.xp, Math.ceil(r.xp / 2));
    }
  }
});
test('best score survives even when older records are no longer in history', () => {
  const data = normalize({ ...initialData(), highscores: { catch: 900 }, records: [{ id: 'newer', game: 'catch', score: 10, date: Date.now() }] });
  assert.equal(data.highscores.catch, 900);
});
test('returning after several days does not penalize needs or possessions', () => {
  const old = { ...initialData(), lastUpdated: Date.now() - 7 * 86400000 };
  const next = normalize(old);
  assert.deepEqual(next.needs, old.needs);
  assert.equal(next.coins, old.coins);
});
test('version 2.0 gets a separate untouched 2.1 backup', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 2 };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_21), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.ok(next.personality);
  assert.ok(next.visitedRooms.includes(old.room));
});
test('schema 3 saves keep a raw 3.0 backup and preserve all old progress', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 3, coins: 987, xp: 432, owned: ['ball','crown'] };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_30), raw);
  assert.equal(next.saveSchema, 4);
  assert.deepEqual(next.owned, old.owned);
  assert.equal(next.coins, 987);
  assert.equal(next.xp, 432);
  assert.deepEqual(next.world.discoveries, []);
});
test('world and collection assets have unique IDs and complete starter quests', () => {
  const { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_REWARDS } = worldModule;
  const { LOCATIONS, WORLD_QUESTS } = dataModule;
  assert.equal(LOCATIONS.length, 6);
  assert.deepEqual(LOCATIONS.map((place) => place.level), [1,3,5,8,12,20]);
  assert.equal(WORLD_QUESTS.filter((quest) => quest.place === 'park').length, 2);
  assert.equal(WORLD_QUESTS.filter((quest) => quest.place === 'city').length, 2);
  assert.ok(WORLD_QUESTS.every((quest) => quest.target > 0 && quest.coins > 0 && quest.xp > 0));
  assert.equal(COLLECTION_ITEMS.length, 70);
  assert.equal(new Set(COLLECTION_ITEMS.map((item) => item.id)).size, 70);
  assert.equal(COLLECTION_CATEGORIES.length, 8);
  assert.ok(COLLECTION_ITEMS.every((item) => existsSync(`artifacts/tamascottchi/public/assets/collections/items/${item.id}.png`)));
  assert.ok(COLLECTION_REWARDS.every((reward) => reward.items.every((id) => COLLECTION_ITEMS.some((item) => item.id === id))));
});
