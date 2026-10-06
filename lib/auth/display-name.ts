import type { User } from '@supabase/supabase-js';

/** A friendly display name from Supabase auth metadata, falling back to the email name. */
export function displayNameFor(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const first = meta.first_name ? String(meta.first_name) : '';
  const last = meta.last_name ? String(meta.last_name) : '';
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;
  const direct = (meta.full_name ?? meta.name) as string | undefined;
  if (direct) return String(direct);
  if (user?.email) return user.email.split('@')[0] ?? 'Member';
  return 'Member';
}

export function firstNameFor(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  if (meta.first_name) return String(meta.first_name);
  return displayNameFor(user).split(' ')[0] ?? 'friend';
}
