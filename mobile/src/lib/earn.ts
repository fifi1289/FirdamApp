import AsyncStorage from '@react-native-async-storage/async-storage';

import { WEBSITE } from '@/lib/config';
import { supabase } from '@/lib/supabase';

/**
 * Earn with Firdam (Phase 1: ambassadors), the same as firdam.com/earn/ambassador.
 * The database checks every rule; this is the app side.
 */

const REF_KEY = 'firdam.ref';
const ACTIVE_KEY = 'firdam.activeDay';

export const isReferralCode = (s: string) => /^[a-z2-9]{6,12}$/i.test(s.trim());
export const inviteUrl = (code: string) => `${WEBSITE}/join/${code}`;

/** A code typed on the sign-up screen, claimed once they're signed in. */
export async function rememberInviteCode(code: string) {
  const c = code.trim().toLowerCase();
  if (isReferralCode(c)) await AsyncStorage.setItem(REF_KEY, c).catch(() => {});
}

/** After sign-in and when the app comes back: claims a remembered code and records today as an active day. */
export async function runEarnHousekeeping() {
  const code = await AsyncStorage.getItem(REF_KEY).catch(() => null);
  if (code) {
    const { data, error } = await supabase.rpc('claim_referral', { p_code: code, p_clicked_at: null, p_source: 'app' });
    if (!error && data) await AsyncStorage.removeItem(REF_KEY).catch(() => {});
  }
  const today = new Date().toISOString().slice(0, 10);
  if ((await AsyncStorage.getItem(ACTIVE_KEY).catch(() => null)) !== today) {
    const { error } = await supabase.rpc('touch_activity');
    if (!error) await AsyncStorage.setItem(ACTIVE_KEY, today).catch(() => {});
  }
}

/** Open to everyone, or you're an admin previewing it. */
export async function earnVisible(): Promise<boolean> {
  const [{ data: live }, { data: admin }] = await Promise.all([supabase.rpc('earn_ambassadors_live'), supabase.rpc('is_admin')]);
  return live === true || admin === true;
}

export async function earnLive(): Promise<boolean> {
  const { data } = await supabase.rpc('earn_ambassadors_live');
  return data === true;
}

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
  const { data, error } = await supabase.rpc('my_ambassador_stats');
  if (error) throw error;
  return data as AmbassadorStats;
}

export async function acceptAmbassadorTerms(version: string) {
  const { error } = await supabase.rpc('accept_earn_terms', { p_terms: 'ambassador', p_version: version });
  if (error) throw error;
}
