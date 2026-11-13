const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short archive date for entries older than a week: "22 OCT", or "22 OCT 2025"
 * when the year differs from `now`. Uppercased to match mono-label stamps.
 */
export function shortDate(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  try {
    return d
      .toLocaleDateString(
        undefined,
        sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" },
      )
      .toUpperCase();
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Relative "when" stamp for the specimen index:
 * JUST NOW · 4 MIN AGO · 2 H AGO · 3 D AGO · then a short date.
 */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (!Number.isFinite(diff) || diff < MINUTE) return "JUST NOW";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} MIN AGO`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} H AGO`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} D AGO`;
  return shortDate(ts, now);
}
