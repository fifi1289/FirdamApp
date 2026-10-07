'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Bell,
  Download,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Moon,
  MoonStar,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker } from '@/components/location/location-picker';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/utils';
import { getAuthErrorMessage, signOut as signOutService, updatePassword } from '@/lib/auth/auth-service';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSavedLocation } from '@/lib/geo/location';
import { CALCULATION_METHODS, usePrayerSettings } from '@/lib/prayer/prayer';
import { useReminderSettings } from '@/lib/reminders/reminders';
import type { Profile } from '@/types/database';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const;

/** Every table the signed-in user owns, for "Export my data". */
const EXPORT_TABLES = [
  'profiles',
  'family_members',
  'family_events',
  'planner_tasks',
  'planner_goals',
  'pantry_items',
  'meal_preferences',
  'meal_plans',
  'grocery_lists',
  'grocery_items',
  'budget_categories',
  'budget_transactions',
  'savings_goals',
  'ramadan_days',
  'quran_reading_sessions',
  'saved_halal_places',
] as const;

export function SettingsClient({ profile: _profile }: { profile?: Profile | null }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = React.useState('appearance');
  const [signingOut, setSigningOut] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const { location, save: saveLocation } = useSavedLocation();
  const { settings: prayer, update: updatePrayer } = usePrayerSettings();
  const { settings: reminders, permission, update: updateReminders } = useReminderSettings();

  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && ['appearance', 'prayer', 'notifications', 'account'].includes(t)) setTab(t);
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOutService(createSupabaseBrowserClient());
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('The passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(createSupabaseBrowserClient(), password);
      toast.success('Password updated');
      setPassword('');
      setConfirm('');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    // Untyped view of the client so we can loop over table names.
    const supabase = createSupabaseBrowserClient() as unknown as {
      from: (table: string) => {
        select: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: { id: user?.id, email: user?.email },
    };
    for (const table of EXPORT_TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      out[table] = error ? { error: error.message } : data;
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firdam-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success('Your data has been downloaded');
  };

  return (
    <>
      <PageHeader title="Settings" description="Appearance, prayer calculation, reminders and your account." />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="prayer">Prayer</TabsTrigger>
          <TabsTrigger value="notifications">Reminders</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose how Firdam looks. System follows your device preference.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                        isActive
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prayer" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MoonStar className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Used for prayer times, Ramadan and Halal Places.
              </p>
              <LocationPicker value={location} onChange={saveLocation} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calculation</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select
                  value={String(prayer.method)}
                  onValueChange={(v) => updatePrayer({ ...prayer, method: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALCULATION_METHODS.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name} · {m.region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Asr time</Label>
                <Select
                  value={String(prayer.school)}
                  onValueChange={(v) => updatePrayer({ ...prayer, school: v === '1' ? 1 : 0 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Standard (Shafi&apos;i, Maliki, Hanbali)</SelectItem>
                    <SelectItem value="1">Hanafi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {permission === 'unsupported' ? (
                <p className="text-sm text-muted-foreground">
                  This browser doesn&apos;t support notifications.
                </p>
              ) : permission === 'denied' ? (
                <p className="rounded-xl bg-warning/10 p-3 text-sm text-foreground">
                  Notifications are blocked for this site. Allow them in your browser&apos;s site
                  settings to turn reminders on.
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Prayer reminders</Label>
                  <p className="text-xs text-muted-foreground">A gentle alert before each prayer.</p>
                </div>
                <div className="flex items-center gap-3">
                  {reminders.prayers && (
                    <Select
                      value={String(reminders.prayerLeadMinutes)}
                      onValueChange={(v) => updateReminders({ ...reminders, prayerLeadMinutes: Number(v) })}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 30].map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m === 0 ? 'At prayer time' : `${m} min before`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Switch
                    checked={reminders.prayers}
                    disabled={permission === 'unsupported' || permission === 'denied'}
                    onCheckedChange={(v) => updateReminders({ ...reminders, prayers: v })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Family events</Label>
                  <p className="text-xs text-muted-foreground">
                    Birthdays, ceremonies and events — the day before and on the day.
                  </p>
                </div>
                <Switch
                  checked={reminders.events}
                  disabled={permission === 'unsupported' || permission === 'denied'}
                  onCheckedChange={(v) => updateReminders({ ...reminders, events: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Reminders appear while Firdam is open in a browser tab on this device.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user?.email}</span>
              </p>
              <form onSubmit={changePassword} className="grid max-w-md grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-fit" disabled={savingPassword || !password}>
                  {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" />
                Your data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Download everything you have stored in Firdam as a JSON file. Your data belongs to
                you.
              </p>
              <Button variant="outline" onClick={exportData} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export my data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LogOut className="h-4 w-4" />
                Sign out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                End your session on this device. You can sign back in anytime.
              </p>
              <Button variant="outline" onClick={handleLogout} disabled={signingOut}>
                {signingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
