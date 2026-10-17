/**
 * Quran reading tracker rules shared by the website and the phone app (the
 * app gets a copy via mobile/scripts/sync-shared.mjs).
 */
import { QURAN_PAGES } from '@/features/quran/surahs';

export const GOAL_OPTIONS = [
  { pages: 1, label: '1 page a day', hint: 'Khatm in about 20 months' },
  { pages: 2, label: '2 pages a day', hint: 'Khatm in about 10 months' },
  { pages: 4, label: '4 pages a day', hint: 'Khatm in about 5 months' },
  { pages: 10, label: 'Half a juz a day', hint: 'Khatm in 2 months' },
  { pages: 20, label: 'One juz a day', hint: 'Khatm in a month' },
];

export const DEFAULT_GOAL = 4;

export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readingStreak(sessions: { read_on: string }[]): number {
  const days = new Set(sessions.map((s) => s.read_on));
  const cursor = new Date();
  if (!days.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function readingStats(sessions: { read_on: string; pages: number }[]) {
  const today = isoDate();
  const monthPrefix = today.slice(0, 7);
  let total = 0;
  let todayPages = 0;
  let monthPages = 0;
  for (const s of sessions) {
    total += s.pages;
    if (s.read_on === today) todayPages += s.pages;
    if (s.read_on.startsWith(monthPrefix)) monthPages += s.pages;
  }
  return {
    total,
    todayPages,
    monthPages,
    khatms: Math.floor(total / QURAN_PAGES),
    intoKhatm: total % QURAN_PAGES,
    streak: readingStreak(sessions),
  };
}

/** Pages typed into the log box: a whole number from 1 to 604, or null. */
export function parsePages(v: string): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= QURAN_PAGES ? n : null;
}

/** The message after logging, the same on both. */
export function loggedMessage(before: { intoKhatm: number; todayPages: number }, added: number, goal: number): string {
  if (before.intoKhatm + added >= QURAN_PAGES) return 'MashaAllah, you completed a khatm of the Quran!';
  if (before.todayPages < goal && before.todayPages + added >= goal) return "Today's goal reached. May Allah reward you.";
  return 'Reading logged';
}

/** Search surahs by name or number. */
export function matchSurah(s: { number: number; name: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || s.name.toLowerCase().includes(q) || String(s.number) === q;
}
