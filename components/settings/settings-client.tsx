'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Bell, Lock, User, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { signOut, getAuthErrorMessage } from '@/lib/auth/auth-service';
import type { Profile } from '@/types/database';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const;

export function SettingsClient({ profile }: { profile: Profile | null }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await signOut(supabase);
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Adjust appearance, notifications, and account preferences."
      />

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Appearance */}
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
                        'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                        isActive
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: 'Prayer reminders', desc: 'Gentle alerts before each prayer time.' },
                { label: 'Bill due alerts', desc: 'Get notified before upcoming bills.' },
                { label: 'Family events', desc: 'Reminders for birthdays and milestones.' },
                { label: 'Weekly summary', desc: 'A calm Sunday digest of your week.' },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-medium">{n.label}</Label>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Account email</Label>
                  <p className="text-xs text-muted-foreground">{profile?.email ?? 'Not available'}</p>
                </div>
              </div>
              <Placeholder
                icon={User}
                title="Security settings coming soon"
                description="Password, two-factor authentication, and active sessions will be configurable here in the next phase."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing out…
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              Export my data
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
