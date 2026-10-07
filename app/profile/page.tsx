'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Loader2, Mail, MapPin, MoonStar, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { displayNameFor } from '@/lib/auth/display-name';
import { useSavedLocation } from '@/lib/geo/location';
import { CALCULATION_METHODS, usePrayerSettings } from '@/lib/prayer/prayer';

function initialsFor(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { location } = useSavedLocation();
  const { settings } = usePrayerSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [familyCount, setFamilyCount] = useState<number | null>(null);

  useEffect(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    setFirstName(meta.first_name ? String(meta.first_name) : '');
    setLastName(meta.last_name ? String(meta.last_name) : '');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    createSupabaseBrowserClient()
      .from('family_members')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setFamilyCount(count ?? 0));
  }, [user]);

  const displayName = displayNameFor(user);
  const method = CALCULATION_METHODS.find((m) => m.id === settings.method);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const first = firstName.trim() || null;
    const last = lastName.trim() || null;
    const { error } = await supabase.auth.updateUser({ data: { first_name: first, last_name: last } });
    if (!error) {
      await supabase
        .from('profiles')
        .update({ first_name: first, last_name: last, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    setSaving(false);
    if (error) {
      toast.error('Could not save your profile', { description: error.message });
      return;
    }
    toast.success('Profile saved');
  };

  const details = [
    { icon: Mail, label: 'Email', value: user?.email ?? '—' },
    {
      icon: Calendar,
      label: 'Member since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : '—',
    },
    { icon: MapPin, label: 'Location', value: location?.label ?? 'Not set' },
    {
      icon: MoonStar,
      label: 'Prayer calculation',
      value: `${method?.name ?? 'ISNA'}${settings.school === 1 ? ' · Hanafi Asr' : ''}`,
    },
    {
      icon: Users,
      label: 'Family members',
      value: familyCount === null ? '—' : String(familyCount),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Profile" description="How you appear across Firdam." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="bg-girih flex flex-col items-center p-6 text-center">
            <Avatar className="h-24 w-24 border border-border">
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                {initialsFor(displayName)}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email ?? 'Not signed in'}</p>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your name</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {details.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div key={d.label}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {d.label}
                      </span>
                      <span className="text-right text-sm font-medium text-foreground">{d.value}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings?tab=prayer">Change location & prayer settings</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/family">Manage family</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
