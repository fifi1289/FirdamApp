import { User, Mail, Calendar, MapPin } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { requireAuth } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const { profile } = await requireAuth();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'Firdam User';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const details = [
    { icon: Mail, label: 'Email', value: profile?.email ?? 'Not connected yet' },
    { icon: Calendar, label: 'Member since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not available' },
    { icon: MapPin, label: 'Location', value: 'Not set' },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Profile"
        description="Manage how your identity appears across Firdam."
      >
        <Button size="sm">Save changes</Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-24 w-24 border border-border">
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {displayName}
            </h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              <User className="mr-2 h-4 w-4" />
              Change avatar
            </Button>
          </CardContent>
        </Card>

        {/* Details + placeholder */}
        <div className="space-y-6 lg:col-span-2">
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
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {d.label}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {d.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Placeholder
            icon={User}
            title="Profile editing coming soon"
            description="Soon you'll be able to update your name, avatar, and preferences here. Business logic lands in the next phase."
          />
        </div>
      </div>
    </AppShell>
  );
}
