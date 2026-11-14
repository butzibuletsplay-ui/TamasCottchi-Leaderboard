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
  entryPoints: ['artifacts/tamascottchi/src/game/collectionWorld.ts', 'artifacts/tamascottchi/src/game/data.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', outdir: 'test-build',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const worldModule = await import(`data:text/javascript;base64,${Buffer.from(worldBuild.outputFiles.find((file) => file.path.includes('collectionWorld.js')).text).toString('base64')}`);
const dataModule = await import(`data:text/javascript;base64,${Buffer.from(worldBuild.outputFiles.find((file) => file.path.includes('data.js')).text).toString('base64')}`);
const BACKUP_KEY_30 = dataModule.BACKUP_KEY_30;
const BACKUP_KEY_40 = dataModule.BACKUP_KEY_40;
const questBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/questEngine.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const questModule = await import(`data:text/javascript;base64,${Buffer.from(questBuild.outputFiles[0].text).toString('base64')}`);
const craftBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/crafting.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const craftingModule = await import(`data:text/javascript;base64,${Buffer.from(craftBuild.outputFiles[0].text).toString('base64')}`);
const worldEngineBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/worldEngine.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const worldEngine = await import(`data:text/javascript;base64,${Buffer.from(worldEngineBuild.outputFiles[0].text).toString('base64')}`);
const chestBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/rewardChests.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const chestModule = await import(`data:text/javascript;base64,${Buffer.from(chestBuild.outputFiles[0].text).toString('base64')}`);
const timeBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/worldClock.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const worldClock = await import(`data:text/javascript;base64,${Buffer.from(timeBuild.outputFiles[0].text).toString('base64')}`);
const outfitBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/outfits.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' },
});
const outfitModule = await import(`data:text/javascript;base64,${Buffer.from(outfitBuild.outputFiles[0].text).toString('base64')}`);
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
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.deepEqual(next.owned, old.owned);
  assert.equal(next.coins, 987);
  assert.equal(next.xp, 432);
  assert.deepEqual(next.world.discoveries, []);
});
test('schema 4 saves get an untouched 4.0 backup and migrate the new persistent systems', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 4, coins: 321, owned: ['shampoo', 'ball'], roomItems: ['plant'] };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_40), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(next.coins, 321);
  assert.equal(next.inventory.shampoo, 1);
  assert.deepEqual(next.roomPlacements.plant, { x: 16, y: 67 });
  assert.deepEqual(next.journal, []);
  assert.deepEqual(next.world.activeQuests, []);
  assert.deepEqual(next.world.petPosition, { x: 32, y: 38 });
});
test('schema 5 saves get a 6.0 backup while retaining purchases and world progress', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 5, coins: 275, owned: ['ball', 'crown'], inventory: { wood: 9, shell: 4 }, world: { ...initialData().world, discoveries: ['bone-cream'], completedQuests: ['park-bones'] } };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_60), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(next.coins, 275);
  assert.deepEqual(next.owned, ['ball', 'crown']);
  assert.equal(next.inventory.wood, 9);
  assert.equal(next.inventory.shell, 4);
  assert.deepEqual(next.world.discoveries, ['bone-cream']);
  assert.deepEqual(next.world.completedQuests, ['park-bones']);
});
test('schema 6 saves keep a raw 6.1 backup and migrate unopened chest counts', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 6, coins: 275, owned: ['ball'], world: { ...initialData().world, rewardChests: { rare: 2 } } };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_61), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.deepEqual(next.world.rewardChests, { common: 0, uncommon: 0, rare: 2, epic: 0, legendary: 0 });
  assert.equal(next.coins, 275);
  assert.deepEqual(next.owned, ['ball']);
});
test('challenge chests consume once, award collection finds and convert duplicates to materials', () => {
  const chestTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  assert.deepEqual([...new Set(dataModule.CHALLENGES.map((challenge) => challenge.chestTier))].sort(), [...chestTiers].sort());
  let data = normalize({ ...initialData(), world: { ...initialData().world, rewardChests: Object.fromEntries(chestTiers.map((tier) => [tier, 1])) } });
  for (const tier of chestTiers) {
    const opened = chestModule.openRewardChest(data, tier, () => 0);
    assert.ok(opened, `${tier} chest should open`);
    assert.equal(opened.data.world.rewardChests[tier], 0);
    assert.equal(opened.data.coins, data.coins + chestModule.CHEST_DEFINITIONS[tier].coins);
    assert.equal(opened.data.xp, data.xp + chestModule.CHEST_DEFINITIONS[tier].xp);
    assert.ok(opened.reward.itemName);
    data = opened.data;
  }
  const commonFinds = worldModule.COLLECTION_ITEMS.filter((item) => item.rarity === 'Common').map((item) => item.id);
  const fullAlbum = normalize({
    ...initialData(), collectionIds: commonFinds, world: { ...initialData().world, discoveries: commonFinds, rewardChests: { common: 1 } },
  });
  const duplicate = chestModule.openRewardChest(fullAlbum, 'common', () => 0);
  assert.equal(duplicate.reward.isCollectionFind, false);
  assert.equal(duplicate.reward.itemId, 'wood');
  assert.equal(duplicate.data.inventory.wood, (fullAlbum.inventory.wood || 0) + 2);
  assert.equal(chestModule.openRewardChest(duplicate.data, 'common'), null);
});
test('malformed quantities are clamped without dropping valid possessions', () => {
  const next = normalize({ ...initialData(), inventory: { wood: -5, cloth: 1.8, kibble: 'bad' }, owned: ['ball'] });
  assert.equal(next.inventory.wood, 0);
  assert.equal(next.inventory.cloth, 1);
  assert.equal(next.inventory.kibble, 0);
  assert.ok(next.owned.includes('ball'));
  const initial = initialData();
  const badPosition = normalize({ ...initial, world: { ...initial.world, petPosition: { x: 140, y: -20 } } });
  assert.deepEqual(badPosition.world.petPosition, { x: 97, y: 3 });
});
test('quest rewards, material pickups and multi-step actions are saved and one-time', () => {
  let data = normalize(initialData());
  data = questModule.startQuest(data, 'park-bones');
  for (let point = 0; point < 5; point++) {
    const result = questModule.pickQuestPoint(data, 'park-bones', point);
    data = result.data;
    assert.equal(result.outcome, point === 4 ? 'completed' : 'found');
  }
  assert.equal(data.inventory['bone-scrap'], 5);
  assert.ok(data.world.completedQuests.includes('park-bones'));
  assert.ok(data.world.claimedRewards.includes('quest:park-bones'));
  const coinsAfterReward = data.coins;
  assert.equal(questModule.pickQuestPoint(data, 'park-bones', 0).outcome, 'already-completed');
  assert.equal(data.coins, coinsAfterReward);

  data = questModule.startQuest(data, 'park-lost-toy');
  for (let point = 0; point < 3; point++) data = questModule.pickQuestPoint(data, 'park-lost-toy', point).data;
  assert.equal(data.world.questStages['park-lost-toy'], 'awaiting-action');
  assert.ok(data.owned.includes('ball'));
  const finished = questModule.completeQuestAction(data, 'use:ball');
  assert.equal(finished.outcome, 'completed');
  assert.ok(finished.data.world.completedQuests.includes('park-lost-toy'));
  assert.equal(questModule.completeQuestAction(finished.data, 'use:ball').outcome, 'invalid');
});
test('forest sequence requires its actual order and does not duplicate puzzle loot', () => {
  let data = questModule.startQuest(normalize(initialData()), 'forest-riddle');
  const wrong = questModule.pickQuestPoint(data, 'forest-riddle', 0);
  assert.equal(wrong.outcome, 'wrong-order');
  data = wrong.data;
  assert.equal(data.inventory['gold-fragment'] || 0, 0);
  for (const point of [2, 0, 3, 1]) data = questModule.pickQuestPoint(data, 'forest-riddle', point).data;
  assert.equal(data.world.questProgress['forest-riddle'], 4);
  assert.equal(data.inventory['gold-fragment'], 1);
  assert.ok(data.world.completedQuests.includes('forest-riddle'));
});
test('beach treasure needs an explicit opening action and frisbee quests need a real throw', () => {
  let data = questModule.startQuest(normalize(initialData()), 'beach-treasure');
  for (const point of [0, 1, 2]) data = questModule.pickQuestPoint(data, 'beach-treasure', point).data;
  assert.equal(data.world.questStages['beach-treasure'], 'awaiting-action');
  assert.equal(data.inventory['rope-fiber'], 3);
  assert.equal(data.inventory['gold-fragment'] || 0, 0);
  const opened = questModule.completeQuestAction(data, 'open:treasure');
  assert.equal(opened.outcome, 'completed');
  assert.equal(opened.data.inventory['gold-fragment'], 1);
  assert.ok(opened.data.world.completedQuests.includes('beach-treasure'));

  data = questModule.startQuest(normalize(initialData()), 'beach-frisbee');
  data = questModule.pickQuestPoint(data, 'beach-frisbee', 0).data;
  assert.ok(data.owned.includes('frisbee'));
  assert.equal(data.world.questStages['beach-frisbee'], 'awaiting-action');
  const thrown = questModule.completeQuestAction(data, 'use:frisbee');
  assert.equal(thrown.outcome, 'completed');
  assert.ok(thrown.data.world.completedQuests.includes('beach-frisbee'));
});
test('crafting spends exact ingredients, stores output, and blocks a second unique craft', () => {
  const base = normalize({ ...initialData(), inventory: { wood: 3, cloth: 2, kibble: 2 } });
  const crafted = craftingModule.craftItem(base, 'forest-toy');
  assert.equal(crafted.error, undefined);
  assert.equal(crafted.data.inventory.wood, 0);
  assert.equal(crafted.data.inventory.cloth, 0);
  assert.ok(crafted.data.owned.includes('crafted-toy'));
  assert.equal(crafted.data.world.weeklyMetrics.craft, 1);
  assert.equal(craftingModule.craftItem(crafted.data, 'forest-toy').error, 'Wald-Wurfseil hast du bereits hergestellt.');
  const denied = craftingModule.craftItem(base, 'shell-mobile');
  assert.match(denied.error, /fehlen noch/);
  assert.equal(denied.data.inventory.wood, 3);
});
test('world and collection assets have unique IDs and complete starter quests', () => {
  const { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_REWARDS } = worldModule;
  const { LOCATIONS, WORLD_QUESTS } = dataModule;
  assert.equal(LOCATIONS.length, 6);
  assert.deepEqual(LOCATIONS.map((place) => place.level), [1,3,5,8,12,20]);
  assert.equal(WORLD_QUESTS.filter((quest) => quest.place === 'park').length, 3);
  assert.equal(WORLD_QUESTS.filter((quest) => quest.place === 'city').length, 2);
  assert.ok(WORLD_QUESTS.some((quest) => quest.place === 'forest'));
  assert.ok(WORLD_QUESTS.some((quest) => quest.place === 'beach'));
  assert.ok(WORLD_QUESTS.every((quest) => quest.target > 0 && quest.coins > 0 && quest.xp > 0));
  for (const place of ['park', 'city', 'forest', 'beach']) assert.ok(WORLD_QUESTS.some((quest) => quest.place === place), `${place} needs playable content`);
  assert.ok(WORLD_QUESTS.every((quest) => !quest.actionLoot || quest.actionLoot.quantity > 0 && dataModule.itemById(quest.actionLoot.id)));
  assert.ok(craftingModule.CRAFT_RECIPES.every((recipe) => recipe.ingredients.every((ingredient) => dataModule.itemById(ingredient.id))));
  assert.ok(craftingModule.CRAFT_RECIPES.every((recipe) => dataModule.itemById(recipe.result)));
  assert.equal(COLLECTION_ITEMS.length, 70);
  assert.equal(new Set(COLLECTION_ITEMS.map((item) => item.id)).size, 70);
  assert.equal(COLLECTION_CATEGORIES.length, 8);
  assert.ok(COLLECTION_ITEMS.every((item) => existsSync(`artifacts/tamascottchi/public/assets/collections/items/${item.id}.png`)));
  assert.ok(COLLECTION_REWARDS.every((reward) => reward.items.every((id) => COLLECTION_ITEMS.some((item) => item.id === id))));
  for (const tier of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
    assert.ok(existsSync(`artifacts/tamascottchi/public/assets/rewards/frames/${tier}.png`), `missing ${tier} rarity frame`);
    assert.ok(existsSync(`artifacts/tamascottchi/public/assets/rewards/chests/${tier}-closed.png`), `missing closed ${tier} chest`);
    assert.ok(existsSync(`artifacts/tamascottchi/public/assets/rewards/chests/${tier}-open.png`), `missing open ${tier} chest`);
  }
});
test('all wearable layers have an anchor fit for every mood and valid image assets', () => {
  const { WEARABLES, BASE_CONFIG, resolveFit, layerSrc } = outfitModule;
  const moods = Object.keys(BASE_CONFIG.anchors);
  assert.equal(WEARABLES.length, 18);
  for (const id of WEARABLES) {
    assert.ok(BASE_CONFIG.items[id], `missing outfit fit for ${id}`);
    for (const mood of moods) {
      const fit = resolveFit(id, mood, BASE_CONFIG);
      assert.ok(fit && Number.isFinite(fit.left) && Number.isFinite(fit.top) && fit.scaleX > 0, `bad ${id} fit for ${mood}`);
    }
    const src = layerSrc(id);
    if (src) assert.ok(existsSync(`artifacts/tamascottchi/public/${src.startsWith('/') ? src.slice(1) : src}`), `missing layer asset for ${id}`);
  }
});

function worldDataAt(timestamp) {
  const fresh = initialData();
  return normalize({
    ...fresh,
    lastUpdated: timestamp,
    world: { ...fresh.world, lastKnownWorldTime: timestamp, worldDay: worldClock.worldDayKey(timestamp), worldEvent: null, dailyGoals: [] },
  });
}

test('world day uses the Berlin 04:00 reset, including the hour before it', () => {
  assert.equal(worldClock.worldDayKey(Date.parse('2026-11-14T02:59:59+01:00')), '2026-11-13');
  assert.equal(worldClock.worldDayKey(Date.parse('2026-11-14T04:00:00+01:00')), '2026-11-14');
  assert.equal(worldClock.worldWeekKey(Date.parse('2026-11-16T03:59:59+01:00')), '2026-11-09');
  assert.equal(worldClock.worldWeekKey(Date.parse('2026-11-16T04:00:00+01:00')), '2026-11-16');
  assert.equal(worldClock.hoursRemaining(1000, 24, 1000 + 23 * 60 * 60 * 1000), 1);
  assert.equal(worldClock.hoursRemaining(1000, 24, 1000 + 24 * 60 * 60 * 1000), 0);
});

test('resource nodes award once, stay exhausted until their configured respawn, then return', () => {
  const start = Date.now() + 60_000;
  const base = worldDataAt(start);
  const first = worldEngine.collectResource(base, 'park-bones', start, 1);
  assert.equal(first.outcome, 'collected');
  assert.equal(first.quantity, 2);
  assert.equal(first.data.inventory['bone-scrap'], (base.inventory['bone-scrap'] || 0) + 2);
  assert.equal(worldEngine.collectResource(first.data, 'park-bones', start, 1).outcome, 'cooldown');
  assert.equal(worldEngine.collectResource(first.data, 'park-bones', start + 23 * 60 * 60 * 1000, 1).outcome, 'cooldown');
  const respawn = worldEngine.collectResource(first.data, 'park-bones', start + 24 * 60 * 60 * 1000, 1);
  assert.equal(respawn.outcome, 'collected');
  assert.equal(respawn.data.inventory['bone-scrap'], (base.inventory['bone-scrap'] || 0) + 4);
});

test('area mastery unlocks rare resource nodes instead of only showing a progress bar', () => {
  const start = Date.now() + 60_000;
  const base = worldDataAt(start);
  assert.equal(worldEngine.collectResource(base, 'park-lost-coins', start, 1).outcome, 'locked');
  const mastered = { ...base, world: { ...base.world, areaMastery: { ...base.world.areaMastery, park: 100 } } };
  assert.equal(worldEngine.collectResource(mastered, 'park-lost-coins', start, 1).outcome, 'collected');
});

test('daily world reset is idempotent and keeps permanent progress and resources', () => {
  const start = Date.now() + 60_000;
  const base = worldDataAt(start);
  const earned = worldEngine.collectResource(base, 'park-bones', start, 1).data;
  const nextDay = start + 26 * 60 * 60 * 1000;
  const firstReset = worldEngine.ensureWorldDay(earned, nextDay, 1);
  const secondReset = worldEngine.ensureWorldDay(firstReset, nextDay, 1);
  assert.equal(firstReset.world.worldDay, worldClock.worldDayKey(nextDay));
  assert.deepEqual(secondReset.world.dailyMetrics, {});
  assert.deepEqual(secondReset.world.dailyClaimed, []);
  assert.deepEqual(secondReset.world.resourceCollectedAt, earned.world.resourceCollectedAt);
  assert.equal(secondReset.inventory['bone-scrap'], earned.inventory['bone-scrap']);
  assert.equal(secondReset.world.areaMastery.park, earned.world.areaMastery.park);
});

test('weekly goals reward once and reset separately from permanent progress', () => {
  const start = Date.now() + 60_000;
  const base = worldEngine.ensureWorldDay(worldDataAt(start), start, 1);
  let progress = base;
  for (let i = 0; i < 20; i += 1) progress = worldEngine.applyWeeklyMetric(progress, 'gather', 1, start, 1);
  const rewardedCoins = progress.coins;
  assert.ok(progress.world.weeklyClaimed.includes('weekly-gather'));
  progress = worldEngine.applyWeeklyMetric(progress, 'gather', 1, start, 1);
  assert.equal(progress.coins, rewardedCoins);
  const nextWeek = worldEngine.ensureWorldDay(progress, start + 8 * 24 * 60 * 60 * 1000, 1);
  assert.notEqual(nextWeek.world.weeklyKey, progress.world.weeklyKey);
  assert.deepEqual(nextWeek.world.weeklyMetrics, {});
  assert.deepEqual(nextWeek.world.weeklyClaimed, []);
  assert.equal(nextWeek.coins, progress.coins);
});

test('an authenticated server clock repairs a locally advanced clock', () => {
  const now = Date.now() + 60_000;
  const future = now + 10 * 24 * 60 * 60 * 1000;
  const base = worldDataAt(now);
  const advanced = {
    ...base,
    world: {
      ...base.world,
      lastKnownWorldTime: future,
      resourceCollectedAt: { ...base.world.resourceCollectedAt, 'park-bones': future },
      worldDay: worldClock.worldDayKey(future),
    },
  };
  const offline = worldEngine.ensureWorldDay(advanced, now, 1);
  assert.equal(offline.world.lastKnownWorldTime, future);
  const corrected = worldEngine.ensureWorldDay(advanced, now, 1, true);
  assert.equal(corrected.world.lastKnownWorldTime, now);
  assert.equal(corrected.world.worldDay, worldClock.worldDayKey(now));
  assert.equal(worldEngine.collectResource(advanced, 'park-bones', now, 1, true).outcome, 'cooldown');
});

test('daily goals award only once and the daily event cannot be claimed twice', () => {
  const start = Date.now() + 60_000;
  const base = worldEngine.ensureWorldDay(worldDataAt(start), start, 1);
  const goal = base.world.dailyGoals.find((id) => id === 'gather-three');
  assert.ok(goal);
  let progress = base;
  for (let i = 0; i < 3; i += 1) progress = worldEngine.applyWorldMetric(progress, 'gather', 1, start, 1);
  const rewardedCoins = progress.coins;
  progress = worldEngine.applyWorldMetric(progress, 'gather', 1, start, 1);
  assert.equal(progress.coins, rewardedCoins);
  assert.ok(progress.world.dailyClaimed.includes(goal));
  const event = worldEngine.claimWorldEvent(progress, start, 1);
  assert.equal(event.outcome, 'claimed');
  const eventItem = event.data.world.worldEvent.resourceId;
  const itemCount = event.data.inventory[eventItem];
  const duplicate = worldEngine.claimWorldEvent(event.data, start, 1);
  assert.equal(duplicate.outcome, 'already-claimed');
  assert.equal(duplicate.data.inventory[eventItem], itemCount);
});

test('area NPC orders consume the requested material and pay only once per world day', () => {
  const start = Date.now() + 60_000;
  const base = worldEngine.ensureWorldDay({
    ...worldDataAt(start),
    inventory: { 'bone-scrap': 1 },
  }, start, 1);
  const first = worldEngine.claimNpcRequest(base, 'park', start, 1);
  assert.equal(first.outcome, 'claimed');
  assert.equal(first.data.inventory['bone-scrap'], 0);
  assert.equal(first.data.coins, base.coins + 8);
  assert.equal(first.data.xp, base.xp + 7);
  const duplicate = worldEngine.claimNpcRequest(first.data, 'park', start, 1);
  assert.equal(duplicate.outcome, 'already-claimed');
  assert.equal(duplicate.data.coins, first.data.coins);
  assert.equal(worldEngine.claimNpcRequest(base, 'forest', start, 1).outcome, 'invalid');
});

test('fishing has a daily reward cap but remains available for practice', () => {
  const start = Date.now() + 60_000;
  let data = worldEngine.ensureWorldDay(worldDataAt(start), start, 8);
  for (let count = 0; count < 3; count += 1) {
    const catchResult = worldEngine.catchFish(data, 'fish-common', start, 8);
    assert.equal(catchResult.outcome, 'caught');
    data = catchResult.data;
  }
  const practiced = worldEngine.catchFish(data, 'fish-rare', start, 8);
  assert.equal(practiced.outcome, 'practice');
  assert.equal(practiced.data.inventory['fish-rare'] || 0, 0);
  assert.equal(practiced.data.world.fishingRewardsToday, 3);
});

test('all 24 craft recipes resolve to defined usable game items', () => {
  assert.equal(craftingModule.CRAFT_RECIPES.length, 24);
  for (const recipe of craftingModule.CRAFT_RECIPES) {
    const result = dataModule.itemById(recipe.result);
    assert.ok(result, `${recipe.id} has a result`);
    assert.ok(recipe.ingredients.every((ingredient) => dataModule.itemById(ingredient.id)), `${recipe.id} ingredients exist`);
    assert.ok(['food', 'toy', 'room'].includes(result.type), `${recipe.id} creates something usable`);
  }
  const recipe = craftingModule.CRAFT_RECIPES.find((entry) => entry.id === 'fish-snack');
  const base = normalize({ ...initialData(), inventory: { 'fish-common': 1, leaf: 1 } });
  const crafted = craftingModule.craftItem(base, recipe.id);
  assert.equal(crafted.error, undefined);
  assert.equal(crafted.data.inventory['fish-common'], 0);
  assert.equal(crafted.data.inventory['crafted-fish-snack'], 1);
});
