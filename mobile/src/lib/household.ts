import { WEBSITE } from './config';
import { supabase } from './supabase';

/** Same tables and rules as the website's "Share Firdam with your family". */
export interface Household {
  id: string;
  name: string;
  owner_id: string;
}

export interface HouseholdMember {
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  joined_at: string;
}

export interface HouseholdInvite {
  id: string;
  email: string;
  token: string;
  expires_at: string;
}

export interface HouseholdState {
  household: Household | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
  capacity: number;
}

export async function loadHousehold(): Promise<HouseholdState> {
  const { data: household, error } = await supabase.from('households').select('id, name, owner_id').maybeSingle();
  if (error) throw error;
  if (!household) return { household: null, members: [], invites: [], capacity: 4 };
  const [{ data: members }, { data: invites }, { data: cap }] = await Promise.all([
    supabase.from('household_members').select('user_id, role, display_name, joined_at').order('joined_at'),
    supabase
      .from('household_invites')
      .select('id, email, token, expires_at')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase.rpc('household_capacity', { hid: household.id }),
  ]);
  return {
    household: household as Household,
    members: (members ?? []) as HouseholdMember[],
    invites: (invites ?? []) as HouseholdInvite[],
    capacity: typeof cap === 'number' ? cap : 4,
  };
}

export async function createHousehold(name: string): Promise<void> {
  const { error } = await supabase.rpc('create_household', { household_name: name.trim() || 'Our family' });
  if (error) throw error;
}

export async function createInvite(householdId: string, email: string): Promise<HouseholdInvite> {
  const { data, error } = await supabase
    .from('household_invites')
    .insert({ household_id: householdId, email: email.trim().toLowerCase() })
    .select('id, email, token, expires_at')
    .single();
  if (error) throw error;
  return data as HouseholdInvite;
}

export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.from('household_invites').update({ status: 'revoked' }).eq('id', id);
  if (error) throw error;
}

export async function acceptInvite(token: string): Promise<void> {
  const { error } = await supabase.rpc('accept_household_invite', { invite_token: token });
  if (error) throw error;
}

export async function leaveHousehold(): Promise<void> {
  const { error } = await supabase.rpc('leave_household');
  if (error) throw error;
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_household_member', { member: userId });
  if (error) throw error;
}

/** The link the invited person opens (works on firdam.com, and its token can be pasted in the app). */
export function inviteLink(token: string): string {
  return `${WEBSITE}/join/${token}`;
}

/** The invite token from a pasted link or code, or null. */
export function tokenFrom(text: string): string | null {
  const m = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0].toLowerCase() : null;
}
