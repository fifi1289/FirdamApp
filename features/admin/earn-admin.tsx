'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/** Admin → Earn: every Earn with Firdam setting, and the referrals list with fraud flags. English only. */

const db = () => createSupabaseBrowserClient() as unknown as SupabaseClient;

interface ConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

interface ReferralRow {
  referred_user_id: string;
  referred_email: string | null;
  ambassador_email: string | null;
  clicked_at: string;
  signed_up_at: string;
  status: string;
  flags: string[];
  review: string;
  active_days: number;
  free_month: string | null;
}

const FLAG_LABEL: Record<string, string> = {
  same_email: 'Same email (normalised)',
  same_household: 'Same household',
  excluded_account: 'Admin/test account',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

export function EarnAdmin() {
  const [config, setConfig] = useState<ConfigRow[] | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      db().from('earn_config').select('key, value, description, updated_at').order('key'),
      db().rpc('admin_earn_referrals'),
    ]);
    if (c.error || r.error) setError((c.error ?? r.error)!.message);
    setConfig((c.data ?? []) as ConfigRow[]);
    setReferrals((r.data ?? []) as ReferralRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (key: string, value: unknown) => {
    const { error: err } = await db().rpc('admin_set_earn_config', { p_key: key, p_value: value });
    if (err) {
      toast.error(err.message);
      return false;
    }
    toast.success(`${key} saved`);
    load();
    return true;
  };

  const review = async (id: string, action: 'clear' | 'void') => {
    const { error: err } = await db().rpc('admin_review_referral', { p_referred: id, p_action: action });
    if (err) toast.error(err.message);
    else load();
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!config || !referrals)
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );

  const flags = config.filter((c) => typeof c.value === 'boolean');
  const others = config.filter((c) => typeof c.value !== 'boolean');
  const flagged = referrals.filter((r) => r.review === 'flagged');

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-semibold">Switches</h3>
          <p className="text-xs text-muted-foreground">
            Everything is off until you switch it on. Phase 1 needs only EARN_AMBASSADORS_LIVE. The others are for later phases
            and do nothing yet.
          </p>
          {flags.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4 border-t pt-3">
              <div>
                <p className="font-mono text-sm">{c.key}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Switch checked={c.value === true} onCheckedChange={(v) => save(c.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold">Referrals ({referrals.length})</h3>
          <p className="text-xs text-muted-foreground">
            Flagged referrals give no free month until you clear them. Void means never.
            {flagged.length > 0 && <strong className="text-foreground"> {flagged.length} waiting for review.</strong>}
          </p>
          {referrals.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No referrals yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Joined</th>
                    <th className="pr-3">New family</th>
                    <th className="pr-3">Invited by</th>
                    <th className="pr-3">Active days</th>
                    <th className="pr-3">Status</th>
                    <th className="pr-3">Free month</th>
                    <th className="pr-3">Flags</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.referred_user_id} className="border-t align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{day(r.signed_up_at)}</td>
                      <td className="pr-3">{r.referred_email}</td>
                      <td className="pr-3">{r.ambassador_email}</td>
                      <td className="pr-3 tabular-nums">{r.active_days}</td>
                      <td className="pr-3">{r.status.replace('_', ' ')}</td>
                      <td className="pr-3">{r.free_month ?? '—'}</td>
                      <td className="pr-3">
                        <div className="flex flex-wrap gap-1">
                          {r.flags.map((f) => (
                            <Badge key={f} variant="outline">{FLAG_LABEL[f] ?? f}</Badge>
                          ))}
                          {r.review !== 'none' && <Badge variant={r.review === 'flagged' ? 'destructive' : 'secondary'}>{r.review}</Badge>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {r.review === 'flagged' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => review(r.referred_user_id, 'clear')}>Clear</Button>
                            <Button size="sm" variant="ghost" onClick={() => review(r.referred_user_id, 'void')}>Void</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 p-5">
          <h3 className="font-semibold">Settings</h3>
          <p className="pb-2 text-xs text-muted-foreground">
            The numbers from the Earn with Firdam spec. Change one only when you mean to: it applies from now on.
          </p>
          {others.map((c) => (
            <ConfigField key={c.key} row={c} onSave={save} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigField({ row, onSave }: { row: ConfigRow; onSave: (key: string, value: unknown) => Promise<boolean> }) {
  const initial = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(initial), [initial]);

  const submit = async () => {
    let value: unknown = text;
    if (typeof row.value === 'number') {
      const n = Number(text);
      if (!Number.isFinite(n)) {
        toast.error('Please enter a number');
        return;
      }
      value = n;
    }
    setSaving(true);
    await onSave(row.key, value);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm">{row.key}</p>
        <p className="text-xs text-muted-foreground">{row.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} className="h-8 w-40" />
        <Button size="sm" variant="outline" disabled={saving || text === initial} onClick={submit}>
          Save
        </Button>
      </div>
    </div>
  );
}
