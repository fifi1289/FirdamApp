'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface AdminProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  provider: string;
  plan: string;
  plan_status: string | null;
  household: string | null;
  household_role: string | null;
}

/** Everyone with a Firdam account (admin only; the database checks too). */
export async function loadAdminProfiles(): Promise<AdminProfile[]> {
  const db = createSupabaseBrowserClient() as unknown as SupabaseClient;
  const { data, error } = await db.rpc('admin_profiles');
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminProfile[];
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const PROVIDER: Record<string, string> = { email: 'Email', google: 'Google', apple: 'Apple' };

export function AdminProfiles({ profiles, error }: { profiles: AdminProfile[] | null; error: string | null }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!profiles || !s) return profiles ?? [];
    return profiles.filter((p) =>
      [p.first_name, p.last_name, p.email, p.household].some((v) => v?.toLowerCase().includes(s))
    );
  }, [profiles, q]);

  if (error) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Couldn’t load profiles: {error}. If this says the function doesn’t exist, run the admin profiles SQL in Supabase.
      </p>
    );
  }
  if (!profiles) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading profiles…
      </p>
    );
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  const newThisWeek = profiles.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length;
  const activeThisWeek = profiles.filter((p) => p.last_sign_in_at && new Date(p.last_sign_in_at).getTime() >= weekAgo).length;
  const paid = profiles.filter((p) => p.plan !== 'free' && p.plan_status !== 'canceled').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Profiles', value: profiles.length },
          { label: 'Joined in the last 7 days', value: newThisWeek },
          { label: 'Signed in, last 7 days', value: activeThisWeek },
          { label: 'Paid plans', value: paid },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or family" className="pl-9" />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
                <th className="px-4 py-3 font-medium">Signs in with</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Family</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || <span className="text-muted-foreground">No name</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="break-all">{p.email ?? '—'}</span>
                    {!p.email_confirmed && (
                      <Badge variant="outline" className="ml-2">
                        Not confirmed
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{day(p.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{day(p.last_sign_in_at)}</td>
                  <td className="px-4 py-3">{PROVIDER[p.provider] ?? p.provider}</td>
                  <td className="px-4 py-3 capitalize">
                    {p.plan}
                    {p.plan_status && p.plan !== 'free' ? ` · ${p.plan_status}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {p.household ?? '—'}
                    {p.household_role ? <span className="text-muted-foreground"> · {p.household_role}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground">No profiles match.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

/** Loads profiles once for the admin page. */
export function useAdminProfiles(enabled: boolean) {
  const [profiles, setProfiles] = useState<AdminProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    loadAdminProfiles()
      .then(setProfiles)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [enabled]);
  return { profiles, error };
}
