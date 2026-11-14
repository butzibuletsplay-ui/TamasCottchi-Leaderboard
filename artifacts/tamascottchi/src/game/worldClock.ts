const WORLD_TIME_ZONE = 'Europe/Berlin';
const DAY_RESET_HOUR = 4;

function berlinParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WORLD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

/** A stable Berlin calendar key for the world day, which rolls over at 04:00. */
export function worldDayKey(timestamp: number): string {
  const parts = berlinParts(timestamp);
  let year = Number(parts.year);
  let month = Number(parts.month);
  let day = Number(parts.day);
  if (Number(parts.hour) < DAY_RESET_HOUR) {
    const previous = new Date(Date.UTC(year, month - 1, day - 1));
    year = previous.getUTCFullYear();
    month = previous.getUTCMonth() + 1;
    day = previous.getUTCDate();
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Week key for the world week; the Berlin 04:00 day boundary also defines Monday's reset. */
export function worldWeekKey(timestamp: number): string {
  const dayKey = worldDayKey(timestamp);
  const [year, month, day] = dayKey.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

export function hoursRemaining(lastCollectedAt: number | undefined, cooldownHours: number, now: number): number {
  if (!Number.isFinite(lastCollectedAt) || lastCollectedAt === undefined) return 0;
  return Math.max(0, (lastCollectedAt + cooldownHours * 60 * 60 * 1000 - now) / (60 * 60 * 1000));
}

export function formatRemaining(hours: number): string {
  if (hours <= 0) return 'Bereit';
  const minutes = Math.ceil(hours * 60);
  const days = Math.floor(minutes / 1440);
  const wholeHours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return `Noch ${days} T ${wholeHours} Std.`;
  if (wholeHours > 0) return `Noch ${wholeHours} Std. ${remainingMinutes} Min.`;
  return `Noch ${remainingMinutes} Min.`;
}
