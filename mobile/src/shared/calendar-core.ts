// GENERATED from features/calendar/calendar-core.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Family calendar rules shared by the website and the phone app (the app gets
 * a copy via mobile/scripts/sync-shared.mjs): event kinds, Islamic dates,
 * yearly repeats. No birthdays: Firdam doesn't celebrate them. Plain TypeScript, no React or browser APIs.
 */

export type CalendarEventKind =
  | 'eid' | 'aqiqah' | 'nikah' | 'walima' | 'birthday' | 'anniversary'
  | 'school' | 'appointment' | 'gathering' | 'islamic' | 'other';

export const EVENT_KIND_LABELS: Record<CalendarEventKind, string> = {
  eid: 'Eid',
  aqiqah: 'Aqiqah',
  nikah: 'Nikah',
  walima: 'Walima',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  school: 'School',
  appointment: 'Appointment',
  gathering: 'Family gathering',
  islamic: 'Islamic date',
  other: 'Other',
};

/** Kinds a family can pick for its own events (Islamic dates are added automatically). */
export const EDITABLE_KINDS: CalendarEventKind[] = [
  'eid', 'aqiqah', 'nikah', 'walima', 'anniversary', 'school', 'appointment', 'gathering', 'other',
];

/** Kinds that usually come back every year. */
export const YEARLY_KINDS: CalendarEventKind[] = ['anniversary'];

/** Key Islamic dates by Hijri month/day. */
export const ISLAMIC_DATES: { month: number; day: number; title: string }[] = [
  { month: 1, day: 1, title: 'Islamic New Year' },
  { month: 1, day: 10, title: 'Day of Ashura' },
  { month: 9, day: 1, title: 'First day of Ramadan' },
  // The night belongs to the next day: the 21st night begins at Maghrib on the 20th.
  { month: 9, day: 20, title: 'Tonight: 21st night of Ramadan (seek Laylat al-Qadr)' },
  { month: 9, day: 22, title: 'Tonight: 23rd night of Ramadan (seek Laylat al-Qadr)' },
  { month: 9, day: 24, title: 'Tonight: 25th night of Ramadan (seek Laylat al-Qadr)' },
  { month: 9, day: 26, title: 'Tonight: 27th night of Ramadan (seek Laylat al-Qadr)' },
  { month: 9, day: 28, title: 'Tonight: 29th night of Ramadan (seek Laylat al-Qadr)' },
  { month: 10, day: 1, title: 'Eid al-Fitr' },
  { month: 12, day: 1, title: 'First ten days of Dhul Hijjah begin' },
  { month: 12, day: 9, title: 'Day of Arafah' },
  { month: 12, day: 10, title: 'Eid al-Adha' },
];

export interface CalendarEventRow {
  id: string;
  title: string;
  kind: CalendarEventKind;
  starts_on: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  member_ids: string[];
  repeats_yearly: boolean;
  /** Every week on the same weekday (older rows may not have it). */
  repeats_weekly?: boolean | null;
}

export interface CalendarMemberRow {
  id: string;
  first_name: string;
  birth_date: string | null;
}

export interface HijriLabel {
  day: number;
  month: string;
  monthNumber: number;
  year: number;
}

export interface CalendarItem<E extends CalendarEventRow = CalendarEventRow> {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: CalendarEventKind;
  source: 'event' | 'birthday' | 'islamic' | 'fasting';
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  event?: E;
  memberNames?: string[];
}

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** A valid YYYY-MM-DD calendar date. */
export function isISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return iso(d) === s;
}

/** A valid 24-hour HH:MM time. */
export function isTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Expand weekly, yearly and one-off items into concrete dates within [start, end]. */
export function occurrences(base: string, repeats: boolean, start: Date, end: Date, weekly = false): string[] {
  const first = parseISODate(base);
  if (weekly) {
    const out: string[] = [];
    const d = new Date(first);
    if (d < start) {
      const weeks = Math.floor((start.getTime() - d.getTime()) / (7 * 86_400_000));
      d.setDate(d.getDate() + weeks * 7);
      while (d < start) d.setDate(d.getDate() + 7);
    }
    for (; d <= end; d.setDate(d.getDate() + 7)) out.push(iso(d));
    return out;
  }
  if (!repeats) {
    return first >= start && first <= end ? [base] : [];
  }
  const out: string[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    // Feb 29 falls back to Feb 28 in non-leap years.
    const d = new Date(y, first.getMonth(), first.getDate());
    if (d.getMonth() !== first.getMonth()) d.setDate(0);
    if (d >= start && d <= end && d >= new Date(first.getFullYear(), first.getMonth(), first.getDate())) {
      out.push(iso(d));
    }
  }
  return out;
}

export interface FastingOptions {
  /** White days (13–15 of each Hijri month), the 9th of Muharram and the six days of Shawwal. */
  sunnahFasts?: boolean;
  /** Every Monday and Thursday. */
  mondaysThursdays?: boolean;
}

/** Days it is forbidden or not the custom to fast voluntarily: Ramadan, Eid al-Fitr, Eid al-Adha and the days of Tashreeq. */
function noVoluntaryFast(h: HijriLabel): boolean {
  return h.monthNumber === 9 || (h.monthNumber === 10 && h.day === 1) || (h.monthNumber === 12 && h.day >= 10 && h.day <= 13);
}

/** Recommended (Sunnah) fasting days, from the Hijri dates of the range. */
export function sunnahFastingDays(hijri: Map<string, HijriLabel>, start: Date, end: Date, opts: FastingOptions): { date: string; title: string }[] {
  const out: { date: string; title: string }[] = [];
  hijri.forEach((h, date) => {
    const d = parseISODate(date);
    if (d < start || d > end || noVoluntaryFast(h)) return;
    if (opts.sunnahFasts) {
      if (h.day >= 13 && h.day <= 15) out.push({ date, title: `White day fast (${h.day} ${h.month})` });
      if (h.monthNumber === 1 && h.day === 9) out.push({ date, title: 'Fast of the 9th of Muharram (Tasu’a)' });
      if (h.monthNumber === 10 && h.day === 2) out.push({ date, title: 'Six days of Shawwal: fast any six days this month' });
    }
    if (opts.mondaysThursdays && (d.getDay() === 1 || d.getDay() === 4)) {
      out.push({ date, title: d.getDay() === 1 ? 'Monday fast (Sunnah)' : 'Thursday fast (Sunnah)' });
    }
  });
  return out;
}

/** Everything on the calendar between start and end: family events, Islamic dates and, if chosen, Sunnah fasts. */
export function buildCalendarItems<E extends CalendarEventRow>(
  events: E[],
  members: CalendarMemberRow[],
  hijri: Map<string, HijriLabel>,
  start: Date,
  end: Date,
  fasting: FastingOptions = {},
): CalendarItem<E>[] {
  const memberName = new Map(members.map((m) => [m.id, m.first_name]));
  const out: CalendarItem<E>[] = [];

  for (const e of events) {
    for (const date of occurrences(e.starts_on, e.repeats_yearly, start, end, !!e.repeats_weekly)) {
      out.push({
        id: `${e.id}:${date}`,
        date,
        title: e.title,
        kind: e.kind,
        source: 'event',
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        event: e,
        memberNames: (e.member_ids ?? []).map((id) => memberName.get(id)).filter(Boolean) as string[],
      });
    }
  }

  hijri.forEach((h, date) => {
    const d = parseISODate(date);
    if (d < start || d > end) return;
    const special = ISLAMIC_DATES.find((s) => s.month === h.monthNumber && s.day === h.day);
    if (special) out.push({ id: `islamic:${date}`, date, title: special.title, kind: 'islamic', source: 'islamic' });
  });

  for (const f of sunnahFastingDays(hijri, start, end, fasting)) {
    out.push({ id: `fast:${f.date}:${f.title}`, date: f.date, title: f.title, kind: 'islamic', source: 'fasting' });
  }

  out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title),
  );
  return out;
}

/** "14:30" → "2:30 PM" in the reader's locale. */
export function formatTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
