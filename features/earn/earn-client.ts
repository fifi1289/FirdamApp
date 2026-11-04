'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/site';

/** Earn with Firdam (Phase 1: ambassadors). The database checks every rule; this is the browser side. */

const db = () => createSupabaseBrowserClient() as unknown as SupabaseClient;

const REF_KEY = 'firdam_ref';
const VISITOR_KEY = 'firdam_visitor';
const ACTIVE_KEY = 'firdam_active_day';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export { isReferralCode } from '@/features/earn/referral-code';
import { isReferralCode } from '@/features/earn/referral-code';

export const inviteUrl = (code: string) => `${SITE.url}/join/${code}`;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function visitorId(): string {
  const s = store();
  let id = s?.getItem(VISITOR_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    s?.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** /join/<code>: logs the click and remembers the code until sign-up. Returns false for an unknown code or when closed. */
export async function recordReferralClick(code: string): Promise<boolean> {
  const { data, error } = await db().rpc('log_referral_click', { p_code: code.toLowerCase(), p_visitor: visitorId() });
  if (error || data !== true) return false;
  const s = store();
  // First link wins: a later link doesn't replace a code that's still valid.
  if (!pendingReferral()) s?.setItem(REF_KEY, JSON.stringify({ code: code.toLowerCase(), at: new Date().toISOString() }));
  return true;
}

/** A code typed on the sign-up form. */
export function rememberTypedCode(code: string) {
  const c = code.trim().toLowerCase();
  if (isReferralCode(c)) store()?.setItem(REF_KEY, JSON.stringify({ code: c, at: new Date().toISOString(), typed: true }));
}

export function pendingReferral(): { code: string; at: string; typed?: boolean } | null {
  try {
    const raw = store()?.getItem(REF_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.code || Date.now() - new Date(v.at).getTime() > WINDOW_MS) return null;
    return v;
  } catch {
    return null;
  }
}

/**
 * Runs in the app shell once the user is signed in: claims a remembered
 * invite (only new accounts can be referred) and records today as an active day.
 */
export async function runEarnHousekeeping() {
  const s = store();
  const ref = pendingReferral();
  if (ref) {
    const { data, error } = await db().rpc('claim_referral', {
      p_code: ref.code,
      p_clicked_at: ref.typed ? null : ref.at,
      p_source: ref.typed ? 'code' : 'web',
    });
    if (!error && data) s?.removeItem(REF_KEY);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (s?.getItem(ACTIVE_KEY) !== today) {
    const { error } = await db().rpc('touch_activity');
    if (!error) s?.setItem(ACTIVE_KEY, today);
  }
}

/** Whether to show Earn with Firdam: it's open, or you're an admin previewing it (null while checking). */
export function useEarnVisibleState(): boolean | null {
  const [visible, setVisible] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = db();
      const [{ data: live }, { data: admin }] = await Promise.all([c.rpc('earn_ambassadors_live'), c.rpc('is_admin')]);
      if (alive) setVisible(live === true || admin === true);
    })().catch(() => alive && setVisible(false));
    return () => {
      alive = false;
    };
  }, []);
  return visible;
}

export const useEarnVisible = () => useEarnVisibleState() === true;

export interface AmbassadorFamily {
  joined: string;
  status: 'pending' | 'qualified' | 'not_qualified';
  on_hold: boolean;
  active_days: number;
  window_ends: string;
  paying: boolean;
  free_month: 'banked' | 'used' | 'expired' | 'over_cap' | null;
}

export interface AmbassadorStats {
  live: boolean;
  code: string;
  excluded: boolean;
  terms_version: string;
  terms_accepted_at: string | null;
  needed_days: number;
  window_days: number;
  max_banked: number;
  clicks: number;
  signups: number;
  qualified: number;
  paying: number;
  months_banked: number;
  months_used: number;
  months_expiring: number;
  next_expiry: string | null;
  families: AmbassadorFamily[];
}

export async function loadAmbassadorStats(): Promise<AmbassadorStats> {
  const { data, error } = await db().rpc('my_ambassador_stats');
  if (error) throw new Error(error.message);
  return data as AmbassadorStats;
}

export async function acceptAmbassadorTerms(version: string) {
  const { error } = await db().rpc('accept_earn_terms', { p_terms: 'ambassador', p_version: version });
  if (error) throw new Error(error.message);
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await db().rpc('is_admin');
  return data === true;
}
