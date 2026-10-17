// GENERATED from features/calendar/calendar-core.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Family calendar rules shared by the website and the phone app (the app gets
 * a copy via mobile/scripts/sync-shared.mjs): event kinds, Islamic dates,
 * yearly repeats and birthdays. Plain TypeScript, no React or browser APIs.
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
  'eid', 'aqiqah', 'nikah', 'walima', 'birthday', 'anniversary', 'school', 'appointment', 'gathering', 'other',
];

/** Kinds that usually come back every year. */
export const YEARLY_KINDS: CalendarEventKind[] = ['birthday', 'anniversary'];

/** Key Islamic dates by Hijri month/day. */
export const ISLAMIC_DATES: { month: number; day: number; title: string }[] = [
  { month: 1, day: 1, title: 'Islamic New Year' },
  { month: 1, day: 10, title: 'Day of Ashura' },
  { month: 9, day: 1, title: 'First day of Ramadan' },
  { month: 10, day: 1, title: 'Eid al-Fitr' },
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
  source: 'event' | 'birthday' | 'islamic';
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

/** Expand yearly-repeating and one-off items into concrete dates within [start, end]. */
export function occurrences(base: string, repeats: boolean, start: Date, end: Date): string[] {
  const first = parseISODate(base);
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

/** Everything on the calendar between start and end: events, birthdays and Islamic dates. */
export function buildCalendarItems<E extends CalendarEventRow>(
  events: E[],
  members: CalendarMemberRow[],
  hijri: Map<string, HijriLabel>,
  start: Date,
  end: Date,
): CalendarItem<E>[] {
  const memberName = new Map(members.map((m) => [m.id, m.first_name]));
  const out: CalendarItem<E>[] = [];

  for (const e of events) {
    for (const date of occurrences(e.starts_on, e.repeats_yearly, start, end)) {
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

  for (const m of members) {
    if (!m.birth_date) continue;
    const born = parseISODate(m.birth_date);
    for (const date of occurrences(m.birth_date, true, start, end)) {
      const age = parseISODate(date).getFullYear() - born.getFullYear();
      out.push({
        id: `birthday:${m.id}:${date}`,
        date,
        title: age > 0 ? `${m.first_name}'s birthday (${age})` : `${m.first_name} was born`,
        kind: 'birthday',
        source: 'birthday',
      });
    }
  }

  hijri.forEach((h, date) => {
    const d = parseISODate(date);
    if (d < start || d > end) return;
    const special = ISLAMIC_DATES.find((s) => s.month === h.monthNumber && s.day === h.day);
    if (special) out.push({ id: `islamic:${date}`, date, title: special.title, kind: 'islamic', source: 'islamic' });
  });

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
