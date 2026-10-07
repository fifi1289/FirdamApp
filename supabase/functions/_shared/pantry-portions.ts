/** Family portions: adult (13+) = 1, child 6–12 = ¾, under 6 = ½. Shared by the app and the Companion. */

export interface MemberLike {
  birth_date: string | null;
  relationship: string;
}

export function portionFor(member: MemberLike): number {
  if (member.birth_date) {
    const born = new Date(member.birth_date);
    if (!Number.isNaN(born.getTime())) {
      const age = (Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 6) return 0.5;
      if (age < 13) return 0.75;
      return 1;
    }
  }
  // No birth date: assume children are school-age, everyone else an adult.
  return member.relationship === 'Son' || member.relationship === 'Daughter' ? 0.75 : 1;
}

export interface Household {
  /** Total portions to cook for, rounded to ¼. */
  portions: number;
  people: number;
  children: number;
}

export function householdFrom(members: MemberLike[]): Household {
  // The account holder counts too, unless they've added themselves as "Self".
  const hasSelf = members.some((m) => m.relationship === 'Self');
  const raw = (hasSelf ? 0 : 1) + members.reduce((sum, m) => sum + portionFor(m), 0);
  return {
    portions: Math.max(1, Math.round(raw * 4) / 4),
    people: members.length + (hasSelf ? 0 : 1),
    children: members.filter((m) => portionFor(m) < 1).length,
  };
}

export function formatPortions(p: number): string {
  const whole = Math.floor(p);
  const frac = p - whole;
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  return `${whole || (f ? '' : '0')}${f}`;
}
