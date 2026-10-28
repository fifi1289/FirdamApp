/**
 * Days to make up (qada): Ramadan days someone didn't fast — for example during
 * her period, illness, travel, pregnancy or nursing — and should fast before the
 * next Ramadan. Shared by the website and the app (mobile/scripts/sync-shared.mjs).
 * No reason is ever stored: only how many days and which days were made up.
 */

/** First day of Ramadan by Hijri year (Umm al-Qura calculation; local moon sighting can differ by a day). */
export const RAMADAN_STARTS: Record<number, string> = {
  1445: '2024-03-11',
  1446: '2025-03-01',
  1447: '2026-02-18',
  1448: '2027-02-08',
  1449: '2028-01-28',
  1450: '2029-01-16',
  1451: '2030-01-06',
  1452: '2030-12-26',
  1453: '2031-12-15',
  1454: '2032-12-04',
};

export interface MakeupRecord {
  ramadan_year: number;
  missed: number;
  made_up: string[];
}

const DAY = 86_400_000;

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Ramadan whose missed days you'd log now: the one under way, or the last one that ended. */
export function currentRamadanYear(today = new Date()): number {
  const t = isoDate(today);
  const years = Object.keys(RAMADAN_STARTS).map(Number).sort((a, b) => a - b);
  let year = years[0]!;
  for (const y of years) if (RAMADAN_STARTS[y]! <= t) year = y;
  return year;
}

/** The next Ramadan to start after today (null past the table). */
export function nextRamadan(today = new Date()): { year: number; start: string; daysAway: number } | null {
  const t = isoDate(today);
  const years = Object.keys(RAMADAN_STARTS).map(Number).sort((a, b) => a - b);
  for (const y of years) {
    const start = RAMADAN_STARTS[y]!;
    if (start > t) {
      const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return { year: y, start, daysAway: Math.round((parse(start).getTime() - midnight.getTime()) / DAY) };
    }
  }
  return null;
}

export function remaining(r: MakeupRecord): number {
  return Math.max(0, r.missed - r.made_up.length);
}

/** Every Ramadan that still has days to make up, oldest first. */
export function openRecords(records: MakeupRecord[]): MakeupRecord[] {
  return records.filter((r) => remaining(r) > 0).sort((a, b) => a.ramadan_year - b.ramadan_year);
}

export function totalRemaining(records: MakeupRecord[]): number {
  return records.reduce((n, r) => n + remaining(r), 0);
}

/**
 * When to remind: 30 days and 7 days before the next Ramadan, at 10 am,
 * only while days are left. Dates already past are left out.
 */
export function makeupReminderDates(records: MakeupRecord[], today = new Date()): { when: Date; daysBefore: number; left: number }[] {
  const left = totalRemaining(records);
  const next = nextRamadan(today);
  if (!left || !next) return [];
  return [30, 7]
    .map((daysBefore) => {
      const when = parse(next.start);
      when.setDate(when.getDate() - daysBefore);
      when.setHours(10, 0, 0, 0);
      return { when, daysBefore, left };
    })
    .filter((r) => r.when > today);
}

/** "4 days left to make up before Ramadan (in 72 days)". */
export function makeupSummary(records: MakeupRecord[], today = new Date()): string | null {
  const left = totalRemaining(records);
  if (!left) return null;
  const next = nextRamadan(today);
  const days = `${left} ${left === 1 ? 'day' : 'days'} left to make up`;
  return next ? `${days} before Ramadan (in ${next.daysAway} ${next.daysAway === 1 ? 'day' : 'days'})` : days;
}

/** True if the date falls inside a Ramadan (about 30 days from its start): a make-up fast can't be logged there. */
export function insideRamadan(date: string): boolean {
  return Object.values(RAMADAN_STARTS).some((start) => {
    const s = parse(start).getTime();
    const d = parse(date).getTime();
    return d >= s && d < s + 30 * DAY;
  });
}

export const MAKEUP_NOTE =
  'If you missed Ramadan days (for example during your period, illness, travel, pregnancy or nursing), make them up before the next Ramadan. Only you can see this.';
