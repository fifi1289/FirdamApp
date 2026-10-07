'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Crown, Home, Loader2, LogOut, Mail, UserMinus, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UpgradeDialog } from '@/components/plan/upgrade-prompt';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePlan } from '@/lib/plan/plan';
import type { Household, HouseholdInvite, HouseholdMember } from '@/types/database';

const SHARED = ['Family calendar', 'Shopping lists', 'Household tasks', 'Meal plans', 'Pantry', 'Family profiles'];
const MAX_MEMBERS = 8;

export function inviteLink(token: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/${token}`;
}

function errorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Something went wrong. Please try again.';
}

export function SharedHouseholdCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user } = useAuth();
  const { plan, loading: planLoading } = usePlan();

  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'leave' } | { kind: 'remove'; member: HouseholdMember } | null>(null);

  const load = useCallback(async () => {
    const { data: hh, error } = await supabase.from('households').select('*').maybeSingle();
    if (error) {
      // Not migrated yet — hide quietly.
      console.warn('Could not load household:', error.message);
      setHousehold(null);
      setLoading(false);
      return;
    }
    setHousehold(hh);
    if (hh) {
      const [{ data: m }, { data: inv }] = await Promise.all([
        supabase.from('household_members').select('*').order('joined_at'),
        supabase
          .from('household_invites')
          .select('*')
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ]);
      setMembers(m ?? []);
      setInvites(inv ?? []);
    } else {
      setMembers([]);
      setInvites([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!household && household.owner_id === user?.id;

  const create = async () => {
    if (plan !== 'family') {
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('create_household', { household_name: name.trim() || 'Our family' });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success('Your family household is ready. Now invite your family.');
    load();
  };

  const invite = async () => {
    const value = email.trim().toLowerCase();
    if (!household || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (members.length + invites.length >= MAX_MEMBERS) {
      toast.error(`A household can have up to ${MAX_MEMBERS} people.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('household_invites')
      .insert({ household_id: household.id, email: value })
      .select('*')
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(errorMessage(error));
      return;
    }
    setEmail('');
    setInvites((list) => [data, ...list]);
    copy(data.token);
    toast.success('Invite link copied — send it to them by message or email.');
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      toast.message(inviteLink(token));
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from('household_invites').update({ status: 'revoked' }).eq('id', id);
    if (error) toast.error(errorMessage(error));
    else setInvites((list) => list.filter((i) => i.id !== id));
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    const { error } =
      confirm.kind === 'leave'
        ? await supabase.rpc('leave_household')
        : await supabase.rpc('remove_household_member', { member: confirm.member.user_id });
    setBusy(false);
    setConfirm(null);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(confirm.kind === 'leave' ? 'You left the household.' : 'Member removed.');
    load();
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your household…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 overflow-hidden">
        <div className="bg-girih flex flex-col gap-4 bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid p-5 text-brand-linen sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold text-brand-espresso">
              <Home className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                {household ? household.name : 'Share Firdam with your family'}
              </p>
              <p className="text-sm text-brand-linen/80">
                {household
                  ? `${members.length} ${members.length === 1 ? 'person' : 'people'} share this home.`
                  : 'One home for everyone: plan together, shop together, never miss a family date.'}
              </p>
            </div>
          </div>
          {household && (
            <Button
              variant="outline"
              size="sm"
              className="border-brand-linen/30 bg-transparent text-brand-linen hover:bg-brand-linen/10 hover:text-brand-linen"
              onClick={() => setConfirm({ kind: 'leave' })}
            >
              <LogOut className="mr-2 h-4 w-4" /> Leave
            </Button>
          )}
        </div>

        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap gap-1.5">
            {SHARED.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                <Check className="h-3 w-3 text-brand-sage" /> {s}
              </span>
            ))}
            <span className="rounded-full px-2.5 py-1 text-xs text-muted-foreground">
              Budget, Quran and personal trackers stay private.
            </span>
          </div>

          {!household ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Household name, e.g. The Rahman family"
                maxLength={80}
                aria-label="Household name"
              />
              <Button onClick={create} disabled={busy || planLoading} className="shrink-0">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : plan === 'family' ? <Users className="mr-2 h-4 w-4" /> : <Crown className="mr-2 h-4 w-4" />}
                {plan === 'family' ? 'Create household' : 'Get Family+'}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Members</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {members.map((m) => (
                    <li key={m.user_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(m.display_name ?? '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-sm text-foreground">
                          {m.display_name ?? 'Family member'}
                          {m.user_id === user?.id && <span className="text-muted-foreground"> (you)</span>}
                        </span>
                        {m.role === 'owner' && (
                          <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a5a30] dark:text-brand-gold">
                            Owner
                          </span>
                        )}
                      </div>
                      {isOwner && m.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirm({ kind: 'remove', member: m })}
                          aria-label={`Remove ${m.display_name ?? 'member'}`}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {isOwner && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Invite family</p>
                  <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      invite();
                    }}
                  >
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Their email address"
                      aria-label="Email to invite"
                    />
                    <Button type="submit" disabled={busy} className="shrink-0">
                      <Mail className="mr-2 h-4 w-4" /> Create invite link
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground">
                    They sign in to Firdam with this email and open the link. Links last 14 days. Up to {MAX_MEMBERS} people
                    per household.
                  </p>
                  {invites.length > 0 && (
                    <ul className="space-y-2">
                      {invites.map((inv) => (
                        <li
                          key={inv.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                        >
                          <span className="truncate text-foreground">
                            {inv.email} <span className="text-muted-foreground">· pending</span>
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="sm" onClick={() => copy(inv.token)}>
                              {copied === inv.token ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                              {copied === inv.token ? 'Copied' : 'Copy link'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)} aria-label="Cancel invite">
                              <X className="h-4 w-4" />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'leave' ? 'Leave this household?' : `Remove ${confirm?.kind === 'remove' ? confirm.member.display_name ?? 'this member' : ''}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'leave'
                ? 'Your own items become private again. Items you added to the family’s shopping lists stay with the family.'
                : 'Their own items become private to them again. You can invite them back later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm} disabled={busy}>
              {confirm?.kind === 'leave' ? 'Leave' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Shared households come with Family+"
        description="Invite up to 7 family members to share your calendar, shopping lists, tasks, meals and pantry."
      />
    </>
  );
}
