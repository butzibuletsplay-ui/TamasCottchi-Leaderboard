import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve('artifacts/api-server/package.json'));
const { build } = require('esbuild');

async function loadBundle(entryPoint, define = {}) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define,
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const [economy, gameData, world] = await Promise.all([
  loadBundle('lib/game-economy/src/index.ts'),
  loadBundle('artifacts/tamascottchi/src/game/data.ts', { 'import.meta.env.BASE_URL': '"/"' }),
  loadBundle('artifacts/tamascottchi/src/game/worldEngine.ts', { 'import.meta.env.BASE_URL': '"/"' }),
]);

const representativeScores = { catch: 173, memory: 72, turbo: 202, bone: 130, run: 173 };
const gameRewards = Object.keys(representativeScores).map((game) => gameData.rewardFor(game, representativeScores[game], 0));
const gameXp = Math.round(gameRewards.reduce((sum, reward) => sum + reward.xp, 0) / gameRewards.length);
const gameCoins = Math.round(gameRewards.reduce((sum, reward) => sum + reward.coins, 0) / gameRewards.length);
const dailyMissionXp = [10, 15, 12, 12, 12].reduce((sum, amount) => sum + amount, 0);
const dailyMissionCoins = [8, 15, 10, 10, 12].reduce((sum, amount) => sum + amount, 0);
const dailyWorldGoals = ['gather-three', 'find-event', 'visit-two'].map((id) => world.DAILY_WORLD_GOALS.find((goal) => goal.id === id));
const weeklyXpPerDay = world.WEEKLY_WORLD_GOALS.reduce((sum, goal) => sum + goal.xp, 0) / 7;
const weeklyCoinsPerDay = world.WEEKLY_WORLD_GOALS.reduce((sum, goal) => sum + goal.coins, 0) / 7;
const careXp = ({ feeds, baths, pets }) => feeds * 9 + baths * 10 + pets * 4;
const DAILY_GOALS = [0, 1, 2, 3, 4];

const profiles = [
  {
    name: 'Gelegenheit (10–15 Min./Tag)',
    games: 2,
    care: { feeds: 3, baths: 1, pets: 3 },
    missions: [0],
    worldGoals: [dailyWorldGoals[0]],
    regionTask: false,
    weeklyCompletion: 0,
  },
  {
    name: 'Regelmäßig (30 Min./Tag)',
    games: 3,
    care: { feeds: 3, baths: 2, pets: 5 },
    missions: DAILY_GOALS,
    worldGoals: dailyWorldGoals,
    regionTask: true,
    weeklyCompletion: 0.4,
  },
  {
    name: 'Aktiv (60 Min./Tag)',
    games: 15,
    care: { feeds: 3, baths: 2, pets: 5 },
    missions: DAILY_GOALS,
    worldGoals: dailyWorldGoals,
    regionTask: true,
    weeklyCompletion: 1,
  },
];

function totalDailyXp(profile) {
  const game = Array.from({ length: profile.games }, (_, index) => {
    const name = Object.keys(representativeScores)[index % Object.keys(representativeScores).length];
    return gameData.rewardFor(name, representativeScores[name], index).xp;
  }).reduce((sum, amount) => sum + amount, 0);
  const missionXp = profile.missions === DAILY_GOALS ? dailyMissionXp : profile.missions.reduce((sum, index) => sum + [10, 15, 12, 12, 12][index], 0);
  const worldXp = profile.worldGoals.reduce((sum, goal) => sum + (goal?.xp || 0), 0);
  const regionXp = profile.regionTask ? 15 : 0;
  return Math.round(game + careXp(profile.care) + missionXp + worldXp + regionXp + weeklyXpPerDay * profile.weeklyCompletion);
}

function totalDailyCoins(profile) {
  const game = profile.games * gameCoins;
  const missionCoins = profile.missions === DAILY_GOALS ? dailyMissionCoins : profile.missions.reduce((sum, index) => sum + [8, 15, 10, 10, 12][index], 0);
  const worldCoins = profile.worldGoals.reduce((sum, goal) => sum + (goal?.coins || 0), 0);
  const regionCoins = profile.regionTask ? 20 : 0;
  return Math.round(game + missionCoins + worldCoins + regionCoins + weeklyCoinsPerDay * profile.weeklyCompletion);
}

const targets = [50, 100, 250, 500, 1000];
console.log('Vereinfachte Tagesbilanz, ohne einmalige Questbelohnungen oder Artefaktboni:');
for (const profile of profiles) {
  const xpPerDay = totalDailyXp(profile);
  const coinsPerDay = totalDailyCoins(profile);
  const estimates = targets.map((level) => {
    const days = Math.ceil(economy.playerLevelXpThreshold(level) / xpPerDay);
    return `${level}: ${days} Tage (${(days / 30.4).toFixed(1)} Monate)`;
  });
  console.log(`\n${profile.name} · ca. ${xpPerDay} XP und ${coinsPerDay} Coins/Tag`);
  console.log(estimates.join(' · '));
  console.log(`Schlüsselpreise: ${[50, 150, 400, 1000, 2500].map((price) => `${price} Coins ≈ ${Math.ceil(price / coinsPerDay)} Tage`).join(' · ')}`);
}

