import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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
const BACKUP_KEY_66 = dataModule.BACKUP_KEY_66;
const BACKUP_KEY_67 = dataModule.BACKUP_KEY_67;
const BACKUP_KEY_68 = dataModule.BACKUP_KEY_68;
const BACKUP_KEY_69 = dataModule.BACKUP_KEY_69;
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
const toyBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/toyRules.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const toyModule = await import(`data:text/javascript;base64,${Buffer.from(toyBuild.outputFiles[0].text).toString('base64')}`);
const evolutionBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/evolution.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const evolutionModule = await import(`data:text/javascript;base64,${Buffer.from(evolutionBuild.outputFiles[0].text).toString('base64')}`);
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
const artifactBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/artifactSystem.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const artifactModule = await import(`data:text/javascript;base64,${Buffer.from(artifactBuild.outputFiles[0].text).toString('base64')}`);
const discoveriesBuild = await build({
  entryPoints: ['artifacts/tamascottchi/src/game/worldDiscoveries.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.BASE_URL': '"/"' },
});
const discoveriesModule = await import(`data:text/javascript;base64,${Buffer.from(discoveriesBuild.outputFiles[0].text).toString('base64')}`);
const economyBuild = await build({
  entryPoints: ['lib/game-economy/src/index.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const economy = await import(`data:text/javascript;base64,${Buffer.from(economyBuild.outputFiles[0].text).toString('base64')}`);
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
  for (const key of ['coins', 'xp', 'owned', 'equipped', 'roomItems', 'activeBackground', 'claimedAchievements', 'records']) {
    assert.deepEqual(actual[key], legacy[key], key);
  }
  assert.deepEqual(actual.inventory, { kibble: 17, soap: 8, ball: 1 });
  assert.equal(actual.highscores.catch, 321);
  assert.equal(actual.saveSchema, SAVE_SCHEMA);
});
test('consumable toys decrement one at a time and cannot consume collectible artifacts', () => {
  const inventory = { ball: 5, teddy: 1, 'artifact-dust': 8 };
  const afterUse = toyModule.consumeToyStock(inventory, 'ball');
  assert.equal(afterUse.ball, 4);
  assert.equal(toyModule.consumeToyStock(afterUse, 'ball').ball, 3);
  assert.equal(toyModule.consumeToyStock({ ball: 0 }, 'ball'), null);
  assert.equal(toyModule.consumeToyStock(inventory, 'artifact-dust'), null);
  assert.equal(toyModule.consumeToyStock(inventory, worldModule.COLLECTION_ITEMS[0].id), null);
  for (const id of toyModule.CONSUMABLE_TOY_IDS) {
    assert.equal(dataModule.itemById(id)?.type, 'toy', `${id} is a toy, not a collectible`);
    assert.equal(dataModule.itemById(id)?.stackable, true, `${id} keeps a visible stack count`);
  }
  assert.equal(inventory.ball, 5, 'failed attempts leave the saved stack untouched');
  assert.equal(inventory['artifact-dust'], 8);
});
test('schema 11 migration preserves toy stacks, saved XP, and all previously unlocked worlds', () => {
  const xp = economy.playerLevelXpThreshold(20);
  const prior = normalize({
    ...initialData(), saveSchema: 11, xp, coins: 4321,
    inventory: { kibble: 9, ball: 4, 'crafted-toy': 5 },
    owned: ['ball', 'teddy', 'crafted-toy'],
  });
  assert.equal(prior.xp, xp);
  assert.equal(prior.coins, 4321);
  assert.equal(prior.inventory.ball, 4);
  assert.equal(prior.inventory['crafted-toy'], 5);
  assert.equal(prior.inventory.teddy, 1, 'a previously owned single toy becomes one usable piece');
  assert.deepEqual(prior.world.legacyUnlockedLocations, ['park', 'city', 'forest', 'beach', 'cave', 'mountain']);
  for (const place of dataModule.LOCATIONS) assert.equal(dataModule.isWorldLocationUnlocked(prior, place.id, 20), true, place.id);
  const currentZero = normalize({ ...initialData(), saveSchema: SAVE_SCHEMA, owned: ['ball'], inventory: { ball: 0 } });
  assert.equal(currentZero.inventory.ball, 0, 'normalization must not restore already-consumed stock');
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
  const characterPoints = { verspielt: 900, neugierig: 800, verschlafen: 700, frech: 600, anhaenglich: 500 };
  const old = { ...initialData(), characterPoints, lastUpdated: Date.now() - 7 * 86400000 };
  const next = normalize(old);
  assert.deepEqual(next.needs, old.needs);
  assert.equal(next.coins, old.coins);
  assert.deepEqual(next.characterPoints, characterPoints, 'character points never decay during absence');
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
test('schema 8 saves get a raw 6.3 backup while retaining old chests and purchases', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 8, coins: 820, xp: 760, owned: ['ball', 'teddy'], world: { ...initialData().world, rewardChests: { rare: 2 } } };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_63), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(next.coins, 820);
  assert.equal(next.xp, 760);
  assert.deepEqual(next.owned, ['ball', 'teddy']);
  assert.equal(next.world.rewardChests.rare, 2);
  assert.deepEqual(next.world.keys, { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 });
});
test('schema 9 XP migrates to the extended curve without losing the old level or progress', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 9, coins: 820, xp: 5150, owned: ['ball'] };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_64), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(dataModule.levelFor(next.xp), Math.floor(old.xp / 100) + 1);
  const progress = economy.playerLevelProgress(next.xp);
  assert.equal(progress.earned / progress.required, (old.xp % 100) / 100);
  assert.equal(next.coins, old.coins);
  assert.deepEqual(next.owned, old.owned);
});
test('schema 10 saves keep their XP unchanged and receive a 6.5 backup', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 10, coins: 820, xp: 5150, owned: ['ball'] };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_65), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(next.xp, old.xp);
  assert.deepEqual(next.owned, old.owned);
  assert.equal(next.minigameDaily.xp, 0);
});
test('schema 11 saves get an untouched 6.6 backup before toy and world migration', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 11, coins: 810, xp: economy.playerLevelXpThreshold(8), owned: ['ball'], inventory: { ball: 3 } };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_66), raw);
  assert.equal(next.inventory.ball, 3);
  assert.ok(next.world.legacyUnlockedLocations.includes('beach'));
  assert.equal(next.world.legacyUnlockedLocations.includes('mountain'), false);
});
test('schema 12 saves keep an untouched 6.7 backup and never auto-evolve from level alone', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 12, coins: 810, xp: economy.playerLevelXpThreshold(1000) };
  delete old.evolutionStage;
  delete old.activeEvolutionStage;
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_67), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.equal(next.evolutionStage, 1);
  assert.equal(next.xp, old.xp);
  assert.equal(next.coins, old.coins);

  const alreadyEvolved = normalize({ ...old, evolutionStage: 7 });
  assert.equal(alreadyEvolved.evolutionStage, 7, 'a saved form remains unlocked');
  assert.equal(alreadyEvolved.activeEvolutionStage, 7, 'the highest unlocked form becomes active on migration');
});
test('schema 13 saves preserve their unlocked stage and default to that form once', () => {
  storage.clear();
  const old = { ...initialData(), saveSchema: 13, coins: 810, evolutionStage: 6 };
  delete old.activeEvolutionStage;
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_68), raw);
  assert.equal(next.evolutionStage, 6);
  assert.equal(next.activeEvolutionStage, 6);

  const selectedPrevious = normalize({ ...next, activeEvolutionStage: 2 });
  assert.equal(selectedPrevious.evolutionStage, 6, 'choosing an old form does not lower the highest unlocked stage');
  assert.equal(selectedPrevious.activeEvolutionStage, 2);
  const clampedSelection = normalize({ ...next, activeEvolutionStage: 9 });
  assert.equal(clampedSelection.activeEvolutionStage, 6, 'unlocked forms cannot be bypassed by importing a later active form');
});
test('schema 14 migration preserves unlocked forms and migrates legacy personality without inflating it', () => {
  storage.clear();
  const old = {
    ...initialData(), saveSchema: 14, evolutionStage: 4, activeEvolutionStage: 2,
    personality: { verspielt: 88, neugierig: 67, verschlafen: 12, frech: 0, anhaenglich: 100 },
  };
  delete old.characterPoints;
  delete old.characterDaily;
  delete old.characterProgressVersion;
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const next = loadData();
  assert.equal(storage.get(BACKUP_KEY_69), raw);
  assert.equal(next.saveSchema, SAVE_SCHEMA);
  assert.deepEqual(next.characterPoints, old.personality);
  assert.equal(next.evolutionStage, 4);
  assert.equal(next.activeEvolutionStage, 2);
  assert.deepEqual(next.owned, old.owned);
});
test('the ten uploaded transparent form images map to stages in the requested order', () => {
  const source = readFileSync('artifacts/tamascottchi/src/game/evolutionArtwork.ts', 'utf8');
  const imports = Object.fromEntries(
    [...source.matchAll(/import (\w+) from '@assets\/([^']+)'/g)].map(([, identifier, filename]) => [identifier, filename]),
  );
  const arrayBody = source.match(/export const EVOLUTION_ARTWORK = \[([\s\S]*?)\] as const/)?.[1] || '';
  const orderedFiles = [...arrayBody.matchAll(/\b[A-Za-z][A-Za-z0-9]*Scotchi\b/g)].map((match) => imports[match[0]]);
  const expected = [
    '9F565728-1506-4265-B4FC-AB66189F9024_1794669072942.png',
    '7A1344AA-7099-4162-B91F-1C8878AFB393_1794669072942.png',
    '92D59578-2EE2-4A20-A72D-D9F0EF557A63_1794669072942.png',
    'BCC410E4-FBE0-49A4-B7AC-8966418AD851_1794669072942.png',
    '031AEEDE-35AB-462A-BB2B-46C093B18B89_1794669072942.png',
    '93F3AFC6-AF47-4813-B9A2-35E5CEE704EE_1794669072942.png',
    'EACC95D2-D52A-4A2C-B8C0-EB5D33F85B14_1794669072942.png',
    'E5C67D88-4927-4439-968F-EB3578D3C68B_1794669072942.png',
    '0AA10B07-C065-49CE-917E-44AAAF42798D_1794669072942.png',
    'CF363CD3-49AC-4F2D-8EC6-32282425EA14_1794669072942.png',
  ];
  assert.deepEqual(orderedFiles, expected);
  for (const file of expected) {
    const filePath = `attached_assets/${file}`;
    assert.ok(existsSync(filePath), `${file} exists`);
    const png = readFileSync(filePath);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${file} is PNG`);
    assert.equal(png.readUInt32BE(16), 1254, `${file} keeps the uploaded width`);
    assert.equal(png.readUInt32BE(20), 1254, `${file} keeps the uploaded height`);
    assert.equal(png[25], 6, `${file} retains PNG transparency`);
  }
});
test('manual evolution checks level, five traits and coins without consuming character points', () => {
  const { EVOLUTION_STAGES, purchaseNextEvolution, selectUnlockedEvolution } = evolutionModule;
  assert.deepEqual(EVOLUTION_STAGES.map(({ stage, name, playerLevel, traitPointsRequired, coinCost }) => [stage, name, playerLevel, traitPointsRequired, coinCost]), [
    [1, 'Original Scotchi', 1, 0, 0], [2, 'Sprössling Scotchi', 10, 100, 500], [3, 'Entdecker Scotchi', 25, 250, 2000], [4, 'Magischer Scotchi', 50, 500, 6000],
    [5, 'Blumen Scotchi', 100, 900, 15000], [6, 'Naturwächter Scotchi', 175, 1500, 35000], [7, 'Sternenkristall Scotchi', 275, 2300, 75000],
    [8, 'Himmlischer Scotchi', 400, 3300, 150000], [9, 'Königlicher Scotchi', 600, 4500, 300000], [10, 'Transzendenter Scotchi', 850, 6000, 600000],
  ]);
  assert.equal(EVOLUTION_STAGES.slice(1).reduce((sum, stage) => sum + stage.coinCost, 0), 1_183_500);

  let data = normalize({
    ...initialData(),
    coins: 2_000_000,
    xp: economy.playerLevelXpThreshold(1000),
    characterPoints: Object.fromEntries(economy.CHARACTER_TRAIT_IDS.map((trait) => [trait, 100])),
    owned: ['crown'],
    equipped: ['crown'],
    inventory: { ...initialData().inventory, ball: 3 },
  });
  assert.equal(data.evolutionStage, 1, 'even a level-1000 save starts at its explicitly saved form');
  assert.equal(purchaseNextEvolution(data, 9).reason, 'level');
  assert.equal(purchaseNextEvolution({ ...data, characterPoints: Object.fromEntries(economy.CHARACTER_TRAIT_IDS.map((trait) => [trait, 99])) }, 10).reason, 'traits');
  assert.equal(purchaseNextEvolution({ ...data, coins: 499 }, 10).reason, 'coins');
  let result = purchaseNextEvolution(data, 10);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.coins, data.coins - 500);
  assert.equal(result.data.xp, data.xp, 'evolution does not grant XP multipliers or bonus XP');
  assert.equal(result.data.evolutionStage, 2);
  assert.equal(result.data.activeEvolutionStage, 2);
  assert.deepEqual(result.data.characterPoints, data.characterPoints, 'evolution never consumes character points');
  assert.equal(purchaseNextEvolution(result.data, 10).reason, 'level', 'the paid stage cannot be purchased again');
  data = result.data;

  for (const stage of EVOLUTION_STAGES.slice(2)) {
    const before = {
      ...data,
      characterPoints: Object.fromEntries(economy.CHARACTER_TRAIT_IDS.map((trait) => [trait, Math.max(data.characterPoints[trait], stage.traitPointsRequired)])),
    };
    result = purchaseNextEvolution(before, stage.playerLevel);
    assert.equal(result.ok, true, `${stage.name} unlocks at its specified level`);
    if (!result.ok) return;
    assert.equal(result.stage.stage, stage.stage);
    assert.equal(result.data.evolutionStage, stage.stage);
    assert.equal(result.data.activeEvolutionStage, stage.stage, 'a newly purchased form becomes active');
    assert.equal(result.data.coins, before.coins - stage.coinCost);
    assert.deepEqual(result.data.characterPoints, before.characterPoints, 'each evolution keeps accumulated points');
    if (stage.unlockItem) assert.ok(result.data.owned.includes(stage.unlockItem), `${stage.name} grants its cosmetic item`);
    data = result.data;
  }
  assert.equal(data.evolutionStage, 10);
  assert.equal(data.xp, economy.playerLevelXpThreshold(1000), 'the final form does not reduce the level-1000 endgame');
  assert.deepEqual(data.owned.slice(0, 1), ['crown'], 'purchased inventory is retained alongside stage rewards');
  assert.deepEqual(data.equipped, ['crown'], 'equipped clothing remains in the save even when illustration overlays are hidden');
  assert.equal(data.inventory.ball, 3);
  assert.equal(purchaseNextEvolution(data, 1000).reason, 'complete');
  const coinsBeforeSelection = data.coins;
  for (const stage of EVOLUTION_STAGES) {
    const selected = selectUnlockedEvolution(data, stage.stage);
    assert.ok(selected, `${stage.name} is selectable once unlocked`);
    assert.equal(selected.activeEvolutionStage, stage.stage);
    assert.equal(selected.evolutionStage, 10, 'selecting an older form never reduces the unlocked maximum');
    assert.equal(selected.coins, coinsBeforeSelection, 'form selection is free');
    assert.equal(selected.xp, data.xp);
  }
  assert.equal(selectUnlockedEvolution(data, 11), null, 'locked future forms cannot be selected');
});
test('keyed chests open once and consume one matching key', () => {
  const chestTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  assert.ok(dataModule.CHALLENGES.every((challenge) => !challenge.chestTier && challenge.dust > 0));
  let data = normalize({ ...initialData(), coins: 5000, xp: economy.playerLevelXpThreshold(100), world: { ...initialData().world, keys: Object.fromEntries(chestTiers.map((tier) => [tier, 1])), rewardChests: Object.fromEntries(chestTiers.map((tier) => [tier, 1])) } });
  for (const tier of chestTiers) {
    const opened = chestModule.openRewardChest(data, tier, () => 0, 100);
    assert.ok(opened, `${tier} chest should open`);
    assert.equal(opened.data.world.rewardChests[tier], 0);
    assert.equal(opened.data.world.keys[tier], 0);
    assert.equal(opened.data.coins, data.coins + chestModule.CHEST_DEFINITIONS[tier].coins);
    assert.equal(opened.data.xp, data.xp + chestModule.CHEST_DEFINITIONS[tier].xp);
    assert.equal(opened.data.world.chestInstances.length, data.world.chestInstances.length - 1);
    assert.ok(opened.reward.itemName);
    data = opened.data;
  }
  const commonFinds = worldModule.COLLECTION_ITEMS.filter((item) => item.rarity === 'Common').map((item) => item.id);
  const fullAlbum = normalize({
    ...initialData(), collectionIds: commonFinds, world: { ...initialData().world, keys: { common: 1 }, discoveries: commonFinds, rewardChests: { common: 1 } },
  });
  const duplicate = chestModule.openRewardChest(fullAlbum, 'common', () => 0);
  assert.equal(duplicate.reward.isCollectionFind, false);
  assert.equal(duplicate.reward.isDuplicate, true);
  assert.equal(duplicate.reward.duplicateDust, 5);
  assert.equal(duplicate.data.inventory['artifact-dust'], (fullAlbum.inventory['artifact-dust'] || 0) + 5);
  assert.equal(chestModule.openRewardChest(duplicate.data, 'common'), null);
  assert.equal(chestModule.openRewardChest(normalize({ ...initialData(), world: { ...initialData().world, rewardChests: { common: 1 } } }), 'common'), null, 'a chest without its key stays unopened');
});
test('new chest rewards are capped at the highest globally unlocked tier', () => {
  const starting = normalize(initialData());
  const early = artifactModule.grantChest(starting, 'legendary', 'test-early', 1);
  assert.equal(early.world.chestInstances[0].tier, 'common');
  const epicUnlocked = normalize({ ...initialData(), xp: economy.playerLevelXpThreshold(70) });
  const capped = artifactModule.grantChest(epicUnlocked, 'legendary', 'test-epic-cap', 2);
  assert.equal(capped.world.chestInstances[0].tier, 'epic');
  const legendaryUnlocked = normalize({ ...initialData(), xp: economy.playerLevelXpThreshold(100) });
  const allowed = artifactModule.grantChest(legendaryUnlocked, 'legendary', 'test-legendary', 3);
  assert.equal(allowed.world.chestInstances[0].tier, 'legendary');
});
test('key purchases charge level-based prices and enforce unlock levels and sufficient coins', () => {
  for (const tier of economy.CHEST_TIERS) {
    const level = economy.CHEST_UNLOCK_LEVEL[tier];
    const price = economy.chestKeyPrice(tier, level);
    const base = normalize({ ...initialData(), coins: price, xp: economy.playerLevelXpThreshold(level) });
    const purchased = chestModule.buyChestKey(base, tier, level);
    assert.equal(purchased.ok, true, `${tier} purchase should work at its unlock level`);
    assert.equal(purchased.data.coins, 0);
    assert.equal(purchased.data.world.keys[tier], 1);
    const short = normalize({ ...initialData(), coins: price - 1, xp: economy.playerLevelXpThreshold(level) });
    assert.deepEqual(chestModule.buyChestKey(short, tier, level), { ok: false, reason: 'not-enough-coins' });
    if (level > 1) assert.deepEqual(chestModule.buyChestKey(base, tier, level - 1), { ok: false, reason: 'locked' });
  }
  assert.deepEqual(economy.CHEST_KEY_PRICES, { common: 100, uncommon: 300, rare: 900, epic: 3000, legendary: 10000 });
  assert.equal(economy.chestKeyPrice('legendary', 100), 15000);
  assert.equal(economy.chestKeyPrice('legendary', 500), 35000);
  assert.equal(economy.chestKeyPrice('legendary', 1000), 60000);
});
test('daily minigame economy applies shared caps, skill-based tasks, level odds, and one chest per game', () => {
  const now = Date.UTC(2026, 0, 15, 12);
  let daily = economy.createMinigameDailyState(now);
  let earnedAfterXpCap = 0;
  for (let round = 0; round < 40; round += 1) {
    const game = economy.MINIGAME_IDS[round % economy.MINIGAME_IDS.length];
    const wasXpCapped = daily.xp >= economy.MINIGAME_DAILY_XP_CAP;
    const result = economy.applyMinigameRound(daily, game, 100_000, 1000, now, { xp: 25, coins: 25 });
    daily = result.state;
    if (wasXpCapped && result.xp === 0 && result.coins > 0) earnedAfterXpCap += result.coins;
  }
  assert.equal(daily.xp, economy.MINIGAME_DAILY_XP_CAP);
  assert.equal(daily.coins, 102_080);
  assert.ok(earnedAfterXpCap > 0, 'coin earnings continue after the XP cap');
  assert.equal(daily.rounds, 40, 'round count is shared across all five games');

  assert.equal(economy.minigameTaskPointsForXp(economy.rewardForMinigame('catch', 60, 0).xp), 1);
  assert.equal(economy.minigameTaskPointsForXp(economy.rewardForMinigame('catch', 180, 0).xp), 2);
  assert.equal(economy.minigameTaskPointsForXp(economy.rewardForMinigame('catch', 600, 0).xp), 3);
  let task = economy.createMinigameDailyState(now);
  for (let round = 0; round < 4; round += 1) task = economy.applyMinigameRound(task, 'catch', 600, 100, now).state;
  assert.equal(task.taskPoints.catch, 10);
  const firstClaim = economy.claimMinigameDailyChest(task, 'catch', 100, now, () => 0.99);
  assert.equal(firstClaim.ok, true);
  if (firstClaim.ok) {
    assert.equal(firstClaim.tier, 'legendary');
    assert.deepEqual(firstClaim.state.claimed, ['catch']);
    assert.equal(economy.claimMinigameDailyChest(firstClaim.state, 'catch', 100, now, () => 0).error, 'already-claimed');
  }
});
test('minigame daily chest probabilities and level-scaled key prices match the published balance', () => {
  const expected = [
    { level: 1, chances: [90, 10, 0, 0, 0] },
    { level: 25, chances: [75, 23, 2, 0, 0] },
    { level: 50, chances: [55, 33, 10, 2, 0] },
    { level: 100, chances: [40, 35, 18, 6, 1] },
    { level: 200, chances: [30, 35, 24, 9, 2] },
    { level: 350, chances: [22, 32, 30, 13, 3] },
    { level: 500, chances: [15, 27, 32, 21, 5] },
    { level: 750, chances: [10, 22, 33, 28, 7] },
    { level: 1000, chances: [5, 15, 35, 35, 10] },
  ];
  for (const { level, chances } of expected) {
    const actual = economy.CHEST_TIERS.map((tier) => economy.minigameDailyChestChances(level)[tier]);
    assert.deepEqual(actual, chances);
    assert.equal(actual.reduce((sum, value) => sum + value, 0), 100);
    if (level < 100) assert.equal(economy.minigameDailyChestChances(level).legendary, 0);
  }
  assert.equal(economy.chestKeyPrice('legendary', 100), 15_000);
  assert.equal(economy.chestKeyPrice('legendary', 500), 35_000);
  assert.equal(economy.chestKeyPrice('legendary', 1000), 60_000);
  assert.equal(economy.minigameCoinMultiplier(20), 1);
  assert.equal(economy.minigameCoinMultiplier(1000), 99);
  assert.equal(economy.minigameDailyCoinCap(1000), 110_000);
  assert.equal(economy.minigameDailyDayKey(Date.UTC(2026, 2, 28, 22, 59)), '2026-03-28');
  assert.equal(economy.minigameDailyDayKey(Date.UTC(2026, 2, 28, 23, 0)), '2026-03-29');
  assert.equal(economy.minigameDailyDayKey(Date.UTC(2026, 9, 24, 21, 59)), '2026-10-24');
  assert.equal(economy.minigameDailyDayKey(Date.UTC(2026, 9, 24, 22, 0)), '2026-10-25');
});
test('player levels, fixed chest odds, and area-gated world loot use the configured rules', () => {
  const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  assert.equal(dataModule.levelFor(0), 1);
  assert.equal(dataModule.levelFor(1900), 20);
  assert.equal(dataModule.levelFor(1999), 20);
  assert.equal(dataModule.levelFor(2000), 21);
  assert.equal(dataModule.levelFor(economy.playerLevelXpThreshold(1000)), 1000);
  assert.equal(dataModule.levelFor(1_000_000_000), 1000);
  assert.equal(economy.playerLevelXpNeeded(1), 100);
  assert.equal(economy.playerLevelXpNeeded(20), 100);
  assert.equal(economy.playerLevelXpNeeded(21), 101);
  assert.ok(economy.playerLevelXpNeeded(1000) > economy.playerLevelXpNeeded(21));
  assert.equal(economy.playerLevelProgress(economy.MAX_PLAYER_XP).isMaxLevel, true);
  assert.equal(economy.playerLevelProgress(economy.MAX_PLAYER_XP).percent, 100);
  assert.equal(normalize({ ...initialData(), xp: 1_000_000_000 }).xp, economy.MAX_PLAYER_XP);
  assert.deepEqual(dataModule.PLAYER_LEVEL_MILESTONES.map((item) => item.level), [25, 50, 100, 150, 250, 500, 750, 1000]);
  const expectedChestOdds = {
    common: [90, 10, 0, 0, 0],
    uncommon: [55, 40, 5, 0, 0],
    rare: [20, 50, 27, 3, 0],
    epic: [5, 20, 50, 23, 2],
    legendary: [0, 5, 20, 55, 20],
  };
  for (const tier of economy.CHEST_TIERS) {
    const chances = economy.chestDropChances(tier);
    assert.deepEqual(rarities.map((rarity) => chances[rarity]), expectedChestOdds[tier]);
    assert.equal(Object.values(chances).reduce((sum, weight) => sum + weight, 0), 100, `${tier} chest`);
  }
  for (const row of economy.WORLD_LEVEL_DROP_TABLE) {
    assert.equal(Object.values(row.chances).reduce((sum, weight) => sum + weight, 0), 100, `${row.minLevel} world table`);
  }
  for (const level of [1, 3, 5, 7, 9, 11, 16, 20]) {
    for (const tier of economy.CHEST_TIERS) {
      const chances = economy.chestDropChances(tier, level);
      assert.equal(Object.values(chances).reduce((sum, weight) => sum + weight, 0), 100, `${tier} at ${level}`);
    }
  }
  for (const level of [1, 3, 5, 7, 9, 11, 16, 20]) {
    const weights = economy.worldLevelDropChances(level, 1000);
    let state = 0x12345678;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const counts = Object.fromEntries(rarities.map((rarity) => [rarity, 0]));
    for (let draw = 0; draw < 100_000; draw += 1) counts[economy.chooseChance(weights, random)] += 1;
    for (const rarity of rarities) {
      const expected = weights[rarity] / 100;
      const actual = counts[rarity] / 100_000;
      const tolerance = expected === 0 ? 0 : Math.max(0.0012, 6 * Math.sqrt(expected * (1 - expected) / 100_000));
      assert.ok(Math.abs(actual - expected) <= tolerance, `level ${level}/${rarity}: expected ${expected}, got ${actual}`);
    }
  }
  assert.equal(economy.worldLevelDropChances(1, 1000).Legendary, 0, 'early areas do not produce legendary world loot');
  assert.deepEqual(economy.worldLevelDropChances(20, 1), { Common: 100, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0 }, 'low-level players remain capped even in advanced areas');
  assert.equal(economy.chestDropChances('legendary', 2).Legendary, 20, 'the shown table remains the actual tier-specific table even while locked');
  assert.equal(economy.chestTierUnlocked('rare', 24), false);
  assert.equal(economy.chestTierUnlocked('rare', 25), true);
  assert.equal(economy.dailyWorldChestTier(20, 1, () => 0), 'common', 'low player level caps daily world chests');
  assert.equal(economy.dailyWorldChestTier(1, 1000, () => 0.99), 'common', 'the starter region remains common even for high-level players');
  assert.notEqual(economy.dailyWorldChestTier(20, 1000, () => 0.99), 'legendary', 'daily world chests stay below epic and legendary');
  for (const rarity of rarities) {
    const clientIds = worldModule.COLLECTION_ITEMS.filter((item) => item.rarity === rarity).map((item) => item.id).sort();
    assert.deepEqual([...economy.COLLECTION_RARITY_POOLS[rarity]].sort(), clientIds, `${rarity} server pool matches the album`);
  }
});
test('server-side chest bonuses stay identical to equipped artifact bonuses', () => {
  const ids = worldModule.COLLECTION_ITEMS.map((item) => item.id);
  for (const activity of ['world', 'games', 'quests']) {
    for (const kind of ['coins', 'xp']) {
      for (let offset = 0; offset < 7; offset += 1) {
        const equippedArtifacts = ids.filter((_, index) => index % 7 === offset);
        const artifactLevels = Object.fromEntries(equippedArtifacts.map((id, index) => [id, (index % 20) + 1]));
        assert.equal(
          economy.artifactBonusForEquipped(equippedArtifacts, artifactLevels, kind, activity),
          artifactModule.applicableArtifactBonus({ equippedArtifacts, artifactLevels }, kind, activity),
          `${kind}/${activity}/${offset}`,
        );
      }
    }
  }
});
test('legacy collection finds migrate to level-one artifacts without losing balances or chests', () => {
  storage.clear();
  const old = {
    ...initialData(), saveSchema: 7, coins: 875, xp: 920, collectionIds: ['clover'],
    inventory: { wood: 23, shell: 7 }, owned: ['ball'],
    world: { ...initialData().world, discoveries: ['clover'], rewardChests: { rare: 2 } },
  };
  const raw = JSON.stringify(old);
  storage.set(STORE_KEY, raw);
  const migrated = loadData();
  assert.equal(storage.get(dataModule.BACKUP_KEY_62), raw);
  assert.equal(migrated.artifactLevels.clover, 1);
  assert.deepEqual(migrated.equippedArtifacts, []);
  assert.equal(migrated.coins, 875);
  assert.equal(migrated.inventory.wood, 23);
  assert.equal(migrated.inventory.shell, 7);
  assert.equal(migrated.world.rewardChests.rare, 2);
  assert.equal(migrated.world.chestInstances.length, 2);
});
test('artifact upgrades consume the configured coins and materials and equipped bonuses obey caps', () => {
  let data = normalize({
    ...initialData(), coins: 5000, artifactLevels: { 'cap-red': 1, 'clover': 1, 'key-gold': 1 },
    inventory: { wood: 8, wildflower: 8, 'artifact-dust': 30 },
  });
  const cost = artifactModule.artifactUpgradeCost(artifactModule.artifactById('cap-red'), 1);
  assert.equal(cost.coins, 100);
  const upgraded = artifactModule.upgradeArtifact(data, 'cap-red');
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.data.artifactLevels['cap-red'], 2);
  assert.equal(upgraded.data.coins, data.coins - 100);
  assert.equal(upgraded.data.inventory.wood, 7);
  const broke = artifactModule.upgradeArtifact({ ...data, coins: 1 }, 'cap-red');
  assert.equal(broke.reason, 'not-enough-coins');
  data = { ...data, equippedArtifacts: ['key-gold', 'clover'] };
  assert.ok(artifactModule.equippedArtifactBonuses(data).coins <= artifactModule.ARTIFACT_BONUS_LIMITS.coins);
  assert.equal(artifactModule.applicableArtifactBonus({ ...data, equippedArtifacts: [] }, 'coins', 'world'), 0);
  assert.equal(artifactModule.playerArtifactSlots(1), 2);
  assert.equal(artifactModule.playerArtifactSlots(10), 3);
  assert.equal(artifactModule.playerArtifactSlots(20), 4);
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
  assert.equal(data.inventory.ball, 1, 'quest rewards now grant a consumable piece');
  const usedBall = toyModule.consumeToyStock(data.inventory, 'ball');
  const finished = questModule.completeQuestAction({ ...data, inventory: usedBall }, 'use:ball');
  assert.equal(finished.outcome, 'completed');
  assert.equal(finished.data.inventory.ball, 0);
  assert.ok(finished.data.world.completedQuests.includes('park-lost-toy'));
  assert.equal(questModule.completeQuestAction(finished.data, 'use:ball').outcome, 'invalid');
});
test('city quest finds wait for both global rarity and local world-stage unlocks', () => {
  let data = normalize({ ...initialData(), xp: economy.playerLevelXpThreshold(3) });
  data = questModule.startQuest(data, 'city-delivery');
  for (const point of [0, 1, 2]) data = questModule.pickQuestPoint(data, 'city-delivery', point).data;
  assert.deepEqual(data.world.pendingDiscoveries.map((entry) => entry.artifactId).sort(), ['key-gold', 'royal-armor', 'royal-cape']);
  assert.equal(data.collectionIds.includes('royal-cape'), false);

  data = {
    ...data,
    xp: economy.playerLevelXpThreshold(15),
  };
  data = discoveriesModule.releasePendingWorldDiscoveries(data);
  assert.ok(data.collectionIds.includes('key-gold'), 'uncommon discoveries unlock at global level 15');
  assert.equal(data.collectionIds.includes('royal-cape'), false, 'epic discoveries remain pending');

  data = {
    ...data,
    xp: economy.playerLevelXpThreshold(70),
    world: { ...data.world, areaMastery: { ...data.world.areaMastery, city: 400 } },
  };
  data = discoveriesModule.releasePendingWorldDiscoveries(data);
  assert.ok(data.collectionIds.includes('royal-cape'));
  assert.ok(data.collectionIds.includes('royal-armor'));
  assert.deepEqual(data.world.pendingDiscoveries, []);
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
  assert.equal(data.inventory.frisbee, 1);
  assert.equal(data.world.questStages['beach-frisbee'], 'awaiting-action');
  const usedFrisbee = toyModule.consumeToyStock(data.inventory, 'frisbee');
  const thrown = questModule.completeQuestAction({ ...data, inventory: usedFrisbee }, 'use:frisbee');
  assert.equal(thrown.outcome, 'completed');
  assert.equal(thrown.data.inventory.frisbee, 0);
  assert.ok(thrown.data.world.completedQuests.includes('beach-frisbee'));
});
test('crafting consumes exact ingredients for a stack and allows repeated toy production', () => {
  const base = normalize({ ...initialData(), inventory: { wood: 15, cloth: 10, kibble: 2 } });
  const crafted = craftingModule.craftItem(base, 'forest-toy', 5);
  assert.equal(crafted.error, undefined);
  assert.equal(crafted.data.inventory.wood, 0);
  assert.equal(crafted.data.inventory.cloth, 0);
  assert.equal(crafted.data.inventory['crafted-toy'], 5);
  assert.equal(crafted.data.world.weeklyMetrics.craft, 5);
  assert.match(craftingModule.craftItem(crafted.data, 'forest-toy').error, /fehlen noch/);
  const unique = normalize({ ...initialData(), inventory: { shell: 10, 'rope-fiber': 2 } });
  const decor = craftingModule.craftItem(unique, 'shell-mobile');
  assert.equal(decor.error, undefined);
  assert.equal(craftingModule.craftItem(decor.data, 'shell-mobile').error, 'Muschel-Mobile hast du bereits hergestellt.');
  const denied = craftingModule.craftItem(base, 'shell-mobile');
  assert.match(denied.error, /fehlen noch/);
  assert.equal(denied.data.inventory.wood, 15);
});
test('world and collection assets have unique IDs and complete starter quests', () => {
  const { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_REWARDS } = worldModule;
  const { LOCATIONS, WORLD_QUESTS } = dataModule;
  assert.equal(LOCATIONS.length, 6);
  assert.deepEqual(LOCATIONS.map((place) => place.level), [1,35,100,220,350,500]);
  assert.deepEqual(LOCATIONS.map((place) => place.stageLevel), [1,5,9,13,17,20]);
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
test('worlds unlock at their new milestones while the final world stays locked until level 500', () => {
  const fresh = normalize(initialData());
  const { isWorldLocationUnlocked } = dataModule;
  assert.equal(isWorldLocationUnlocked(fresh, 'city', 34), false);
  assert.equal(isWorldLocationUnlocked(fresh, 'city', 35), true);
  assert.equal(isWorldLocationUnlocked(fresh, 'forest', 99), false);
  assert.equal(isWorldLocationUnlocked(fresh, 'beach', 219), false);
  assert.equal(isWorldLocationUnlocked(fresh, 'cave', 349), false);
  assert.equal(isWorldLocationUnlocked(fresh, 'mountain', 499), false);
  assert.equal(isWorldLocationUnlocked(fresh, 'mountain', 500), true);
  assert.deepEqual(dataModule.LOCATIONS.map((place) => place.level), [1, 35, 100, 220, 350, 500]);
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

test('regional daily tasks award one chest per unlocked region and reset after Berlin day rollover', () => {
  const start = Date.now() + 60_000;
  let data = worldDataAt(start);
  data = worldEngine.recordRegionActivity(data, 'park', 4, 2, 0, start, 1);
  assert.ok(data.world.dailyClaimed.includes('region-daily:park'));
  assert.equal(data.inventory['bone-scrap'], 2);
  const coins = data.coins;
  data = worldEngine.recordRegionActivity(data, 'park', 4, 2, 0, start, 1);
  assert.equal(data.coins, coins);

  const readyRegions = ['park', 'city', 'forest', 'beach'];
  data = {
    ...data,
    world: {
      ...data.world,
      regionDailyProgress: Object.fromEntries(readyRegions.map((id) => [id, {
        materials: worldEngine.REGION_DAILY_TASKS[id].materials,
        activities: worldEngine.REGION_DAILY_TASKS[id].activities,
        rare: worldEngine.REGION_DAILY_TASKS[id].rare,
      }])),
    },
  };
  for (const region of readyRegions) {
    const result = worldEngine.claimRegionDailyChest(data, region, start, 500, false, () => 0);
    assert.equal(result.outcome, 'claimed');
    data = result.data;
  }
  assert.equal(data.world.dailyChestCount, 4);
  assert.equal(worldEngine.claimRegionDailyChest(data, 'beach', start, 500).outcome, 'already-claimed');
  assert.equal(worldEngine.claimRegionDailyChest(data, 'park', start, 500).outcome, 'already-claimed');
  const nextDay = worldEngine.ensureWorldDay(data, start + 26 * 60 * 60 * 1000, 1);
  assert.equal(nextDay.world.dailyChestCount, 0);
  assert.deepEqual(nextDay.world.dailyChestLocations, []);
});

test('area mastery unlocks rare resource nodes instead of only showing a progress bar', () => {
  const start = Date.now() + 60_000;
  const base = { ...worldDataAt(start), xp: economy.playerLevelXpThreshold(15) };
  assert.equal(worldEngine.collectResource(base, 'park-lost-coins', start, 14).outcome, 'locked');
  const mastered = { ...base, world: { ...base.world, areaMastery: { ...base.world.areaMastery, park: 100 } } };
  assert.equal(worldEngine.collectResource(mastered, 'park-lost-coins', start, 15).outcome, 'collected');
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

test('weekly goals award one rare chest once and reset separately from permanent progress', () => {
  const start = Date.now() + 60_000;
  const base = worldEngine.ensureWorldDay(worldDataAt(start), start, 1);
  let progress = base;
  progress = worldEngine.applyWeeklyMetric(progress, 'materials', 100, start, 1);
  progress = worldEngine.applyWeeklyMetric(progress, 'activities', 12, start, 1);
  progress = worldEngine.applyWeeklyMetric(progress, 'craft', 3, start, 1);
  progress = worldEngine.applyWeeklyMetric(progress, 'daily', 5, start, 1);
  const rewardedCoins = progress.coins;
  assert.ok(progress.world.weeklyClaimed.includes('weekly-materials'));
  assert.equal(progress.world.weeklyChestClaimed, true);
  assert.equal(progress.world.rewardChests.common, 1, 'level-one players cannot receive a rare chest');
  assert.equal(progress.world.rewardChests.rare, 0);
  progress = worldEngine.applyWeeklyMetric(progress, 'materials', 1, start, 1);
  assert.equal(progress.coins, rewardedCoins);
  const nextWeek = worldEngine.ensureWorldDay(progress, start + 8 * 24 * 60 * 60 * 1000, 1);
  assert.notEqual(nextWeek.world.weeklyKey, progress.world.weeklyKey);
  assert.deepEqual(nextWeek.world.weeklyMetrics, {});
  assert.deepEqual(nextWeek.world.weeklyClaimed, []);
  assert.equal(nextWeek.world.weeklyChestClaimed, false);
  assert.equal(nextWeek.world.rewardChests.common, 1);
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
  let base = worldEngine.ensureWorldDay({ ...worldDataAt(start), xp: economy.playerLevelXpThreshold(100) }, start, 100);
  base = { ...base, world: { ...base.world, dailyGoals: ['gather-three'] } };
  const goal = base.world.dailyGoals.find((id) => id === 'gather-three');
  assert.ok(goal);
  let progress = base;
  for (let i = 0; i < 3; i += 1) progress = worldEngine.applyWorldMetric(progress, 'gather', 1, start, 100);
  const rewardedCoins = progress.coins;
  progress = worldEngine.applyWorldMetric(progress, 'gather', 1, start, 100);
  assert.equal(progress.coins, rewardedCoins);
  assert.ok(progress.world.dailyClaimed.includes(goal));
  const event = worldEngine.claimWorldEvent(progress, start, 100);
  assert.equal(event.outcome, 'claimed');
  const eventItem = event.data.world.worldEvent.resourceId;
  const itemCount = event.data.inventory[eventItem];
  const duplicate = worldEngine.claimWorldEvent(event.data, start, 100);
  assert.equal(duplicate.outcome, 'already-claimed');
  assert.equal(duplicate.data.inventory[eventItem], itemCount);
});

test('world daily claims leave the minigame XP and coin cap ledger intact', () => {
  const start = Date.now() + 60_000;
  const base = worldDataAt(start);
  const ledger = { ...base.minigameDaily, xp: economy.MINIGAME_DAILY_XP_CAP, coins: economy.minigameDailyCoinCap(1), rounds: 18 };
  let progress = {
    ...base,
    minigameDaily: ledger,
    world: { ...base.world, dailyGoals: ['gather-three'] },
  };
  for (let count = 0; count < 3; count += 1) progress = worldEngine.applyWorldMetric(progress, 'gather', 1, start, 1);
  assert.deepEqual(progress.minigameDaily, ledger);
  assert.ok(progress.world.dailyClaimed.includes('gather-three'));
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
  const beforeBeach = worldEngine.ensureWorldDay(worldDataAt(start), start, 219);
  assert.equal(worldEngine.catchFish(beforeBeach, 'fish-common', start, 219).outcome, 'locked', 'beach access is level-gated');
  let data = worldEngine.ensureWorldDay(worldDataAt(start), start, 220);
  const rare = worldEngine.catchFish(data, 'fish-rare', start, 220);
  assert.equal(rare.outcome, 'caught', 'rare fish unlock when global rarity and beach access are both met');
  data = rare.data;
  for (let count = 0; count < 2; count += 1) {
    const catchResult = worldEngine.catchFish(data, 'fish-common', start, 220);
    assert.equal(catchResult.outcome, 'caught');
    data = catchResult.data;
  }
  const practiced = worldEngine.catchFish(data, 'fish-rare', start, 220);
  assert.equal(practiced.outcome, 'practice');
  assert.equal(practiced.data.inventory['fish-rare'], 1);
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

test('character points share one server-enforced 100-point cap and cooldown across traits', () => {
  const now = Date.parse('2026-02-10T12:00:00Z');
  const points = economy.normalizeCharacterPoints(undefined);
  const day = economy.normalizeCharacterDailyProgress(undefined, now);
  const first = economy.awardCharacterActivity(points, day, 'minigame', undefined, now);
  assert.equal(first.ok, true);
  assert.equal(first.trait, 'verspielt');
  assert.equal(first.points, 2);
  assert.equal(first.daily.earned, 2);
  const rapidSecondAction = economy.awardCharacterActivity(first.characterPoints, first.daily, 'feeding', undefined, now + 1);
  assert.equal(rapidSecondAction.ok, false);
  assert.equal(rapidSecondAction.reason, 'cooldown', 'the cooldown is shared across all five traits');
  const afterCooldown = economy.awardCharacterActivity(first.characterPoints, first.daily, 'feeding', undefined, now + economy.CHARACTER_ACTIVITY_COOLDOWN_MS);
  assert.equal(afterCooldown.ok, true);
  assert.equal(afterCooldown.trait, 'anhaenglich');
  const toy = economy.awardCharacterActivity(points, day, 'toy-use', 'duck', now);
  assert.equal(toy.trait, 'verspielt', 'all completed toy actions support the playful trait');

  const nearCap = { day: economy.characterProgressDayKey(now), earned: 99, nextAwardAt: 0 };
  const lastPoint = economy.awardCharacterActivity(points, nearCap, 'cuddle', undefined, now);
  assert.equal(lastPoint.ok, true);
  assert.equal(lastPoint.points, 1, 'the last award cannot cross the shared cap');
  assert.equal(lastPoint.daily.earned, 100);
  const capped = economy.awardCharacterActivity(lastPoint.characterPoints, lastPoint.daily, 'rest-complete', undefined, now + 30_000);
  assert.equal(capped.ok, false);
  assert.equal(capped.reason, 'daily-cap');
});

test('character-point daily totals reset at Berlin midnight and cooldown timestamps stay bounded', () => {
  assert.equal(economy.characterProgressDayKey(Date.parse('2026-01-01T22:59:00Z')), '2026-01-01');
  assert.equal(economy.characterProgressDayKey(Date.parse('2026-01-01T23:00:00Z')), '2026-01-02');
  assert.equal(economy.characterProgressDayKey(Date.parse('2026-06-02T21:59:00Z')), '2026-06-02');
  assert.equal(economy.characterProgressDayKey(Date.parse('2026-06-02T22:00:00Z')), '2026-06-03');
  const timestamp = Date.parse('2026-06-02T22:00:00Z');
  const reset = economy.normalizeCharacterDailyProgress({ day: '2026-06-02', earned: 85, nextAwardAt: timestamp + 10_000 }, timestamp);
  assert.deepEqual(reset, { day: '2026-06-03', earned: 0, nextAwardAt: 0 });
  const bounded = economy.normalizeCharacterDailyProgress({ day: '2026-06-03', earned: 4, nextAwardAt: timestamp + 50_000 }, timestamp);
  assert.equal(bounded.nextAwardAt, timestamp + economy.CHARACTER_ACTIVITY_COOLDOWN_MS);
});

test('balanced daily caps reach every evolution threshold on the same schedule', () => {
  const projectedDays = economy.CHARACTER_EVOLUTION_REQUIREMENTS.map((requirement) =>
    Math.ceil((requirement.traitPointsRequired * economy.CHARACTER_TRAIT_IDS.length) / economy.CHARACTER_DAILY_POINT_CAP));
  assert.deepEqual(projectedDays, [0, 5, 13, 25, 45, 75, 115, 165, 225, 300]);
  assert.equal(economy.CHARACTER_EVOLUTION_REQUIREMENTS.at(-1).traitPointsRequired * economy.CHARACTER_TRAIT_IDS.length, 30_000);
});
