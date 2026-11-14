# Tamascottchi daily minigame economy

## Rules in the game

- Repeatable minigame XP is capped at **900 XP per day**, shared by Catch, Memory, Turbo, Bone, and Run. The cap does not apply to quests, challenges, milestones, level-ups, or chest-opening rewards.
- Repeatable minigame coins use a separate daily earning cap of **10,000 × (1 + player level / 100)**, rounded to whole coins. This is not a wallet limit: saved coins are never removed or capped. Coin rewards continue after the XP cap.
- Repeatable minigame coin rewards also scale by **1 + max(0, level − 20) / 10**. The first 20 levels keep the existing coin pace; later levels scale toward the rising shop prices.
- Each minigame has a 10-point daily task. Rounds that yield under 12 base XP earn 1 point; 12–24 XP earn 2; 25+ XP earn 3. Tasks keep progressing after the shared XP cap.
- A completed task grants one claimable chest for that game. There are at most five such chests per day. Daily minigame progress resets at midnight in `Europe/Berlin`.
- Daily chest tier odds follow the player's global level. These odds select the chest tier; the separate item-drop odds inside each chest remain unchanged.
- Shop key prices use the requested base prices and `round(base × (1 + player level / 200))`. Rare, Epic, and Legendary tiers unlock at levels 25, 50, and 100 so daily chest awards can be opened as soon as their odds become possible.

## Why these caps

The existing per-round reward was bounded at 35 XP and 30 coins, and rewards were halved from the 16th minigame round each day. With the existing first-20-level requirement of 100 XP, a **900 XP** cap allows about nine early levels at the absolute maximum, while preventing unlimited repeatable XP.

At a strong score, the cap takes about **36 rounds without an artifact bonus** (about 7 rounds per game across five games) or about **27 rounds with a 25% XP artifact bonus** (about 5–6 rounds per game). The XP cap does not stop daily task progress or coin earnings.

The coin cap ranges from **10,100 at level 1** to **110,000 at level 1000**. The matching level-scaled coin multiplier means an active player can still buy later-game keys without needing weeks of savings, while repeated play remains bounded.

## Simulation

Run `node scripts/simulate-tamascottchi-daily-economy.mjs` to reproduce the table. It models 10, 20, and 40 rounds for 15, 30, and 60 minutes (90 seconds per round), cycles evenly through all five games, and samples low, average, and strong scores calibrated to yield about 8, 18, and 35 base XP before the existing 15-round reduction. It covers levels 1, 25, 100, 500, and 1000.

Representative average-score results:

| Level | 30-minute minigame coins | Epic key | Legendary key |
| ---: | ---: | ---: | ---: |
| 100 | 2,205/day | 3 days (4,500) | 7 days (15,000) |
| 500 | 12,005/day | 1 day (10,500) | 3 days (35,000) |
| 1000 | 24,255/day | 1 day (18,000) | 3 days (60,000) |

This estimates savings from repeatable minigame coins alone, without assuming a player already has keys or will open every chest. Chest openings separately award their existing 10–70 coins, outside the minigame caps. Multiple game tasks can grant multiple chests: when all five are completed, the expected tier counts per day are:

| Level | Common | Uncommon | Rare | Epic | Legendary |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 2.00 | 1.75 | 0.90 | 0.30 | 0.05 |
| 500 | 0.75 | 1.35 | 1.60 | 1.05 | 0.25 |
| 1000 | 0.25 | 0.75 | 1.75 | 1.75 | 0.50 |

These are long-run averages across the five independent chest rolls; actual daily counts are whole chests. The script also runs a maximum-score, 25%-artifact stress case: at level 1000, 40 rounds earn 900 XP and 102,080 coins against the 110,000 coin cap, including 24,128 coins after the XP cap is reached.

## Online integrity

When a save is linked to the cloud, round payouts and daily chest claims are server transactions with server time and idempotency keys. The server retains the minigame daily ledger when accepting normal save updates and does not accept client-created minigame chest sources. Unlinked local saves continue to work, but—as with any browser-only save—the local economy is not tamper-proof.
