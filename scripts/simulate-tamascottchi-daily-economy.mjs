import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve('artifacts/api-server/package.json'));
const { build } = require('esbuild');
const output = await build({
  entryPoints: ['lib/game-economy/src/index.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const economy = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);

const levels = [1, 25, 100, 500, 1000];
const sessions = [
  { minutes: 15, rounds: 10 },
  { minutes: 30, rounds: 20 },
  { minutes: 60, rounds: 40 },
];
const skills = [
  { name: 'weak', targetXp: 8 },
  { name: 'average', targetXp: 18 },
  { name: 'good', targetXp: 35 },
];
const now = Date.UTC(2026, 0, 15, 12);

console.log('minutes,level,skill,rounds,xp,coins,xp_remaining,coins_remaining,tasks,chests,common_chests,uncommon_chests,rare_chests,epic_chests,legendary_chests,epic_key_days,legendary_key_days');
for (const level of levels) {
  for (const skill of skills) {
    for (const session of sessions) {
      let state = economy.createMinigameDailyState(now);
      for (let round = 0; round < session.rounds; round += 1) {
        const game = economy.MINIGAME_IDS[round % economy.MINIGAME_IDS.length];
        const score = Math.round(economy.MINIGAME_REWARD_DIVISORS[game] * skill.targetXp * 0.8);
        state = economy.applyMinigameRound(state, game, score, level, now).state;
      }
      const dailyTasks = Object.values(state.taskPoints)
        .filter((points) => (points || 0) >= economy.MINIGAME_DAILY_TASK_TARGET).length;
      const epicPrice = economy.chestKeyPrice('epic', level);
      const legendaryPrice = economy.chestKeyPrice('legendary', level);
      const odds = economy.minigameDailyChestChances(level);
      const expectedChests = economy.CHEST_TIERS.map((tier) => (dailyTasks * odds[tier] / 100).toFixed(2));
      const epicDays = level < economy.CHEST_UNLOCK_LEVEL.epic
        ? 'locked'
        : String(Math.max(1, Math.ceil(epicPrice / Math.max(1, state.coins))));
      const legendaryDays = level < economy.CHEST_UNLOCK_LEVEL.legendary
        ? 'locked'
        : String(Math.max(1, Math.ceil(legendaryPrice / Math.max(1, state.coins))));
      console.log([
        session.minutes,
        level,
        skill.name,
        state.rounds,
        state.xp,
        state.coins,
        economy.MINIGAME_DAILY_XP_CAP - state.xp,
        economy.minigameDailyCoinCap(level) - state.coins,
        dailyTasks,
        dailyTasks,
        ...expectedChests,
        epicDays,
        legendaryDays,
      ].join(','));
    }
  }
}

console.log('\nDaily high-score check: 40 maximum-score rounds with +25% artifacts at level 1000');
let maximum = economy.createMinigameDailyState(now);
let postXpCoins = 0;
for (let round = 0; round < 40; round += 1) {
  const game = economy.MINIGAME_IDS[round % economy.MINIGAME_IDS.length];
  const before = maximum.xp;
  const result = economy.applyMinigameRound(maximum, game, 100_000, 1000, now, { xp: 25, coins: 25 });
  maximum = result.state;
  if (before >= economy.MINIGAME_DAILY_XP_CAP && result.coins > 0) postXpCoins += result.coins;
}
console.log(JSON.stringify({
  rounds: maximum.rounds,
  xp: maximum.xp,
  coins: maximum.coins,
  coinCap: economy.minigameDailyCoinCap(1000),
  coinsEarnedAfterXpCap: postXpCoins,
}, null, 2));
