'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Preview {
  household_name: string;
  invited_by_name: string | null;
  email: string;
  valid: boolean;
}

export function JoinHousehold({ token }: { token: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const { user } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!UUID_RE.test(token)) {
      setLoading(false);
      return;
    }
    supabase.rpc('household_invite_preview', { invite_token: token }).then(({ data, error: err }) => {
      if (err) setError(err.message);
      setPreview(data?.[0] ?? null);
      setLoading(false);
    });
  }, [supabase, token]);

  const join = async () => {
    setJoining(true);
    setError(null);
    const { error: err } = await supabase.rpc('accept_household_invite', { invite_token: token });
    setJoining(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success(`Welcome to ${preview?.household_name ?? 'the household'}!`);
    router.push('/dashboard/family');
  };

  const wrongEmail =
    !!preview && !!user?.email && preview.email.toLowerCase() !== user.email.toLowerCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-10">
        <Card className="overflow-hidden">
          <div className="bg-girih bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid px-6 py-7 text-center text-brand-linen">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold text-brand-espresso">
              <Home className="h-6 w-6" />
            </span>
            <p className="mt-3 font-arabic text-lg" lang="ar" dir="rtl">
              أَهْلًا وَسَهْلًا
            </p>
          </div>
          <CardContent className="space-y-4 p-6 text-center">
            {loading ? (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your invite…
              </p>
            ) : !preview || !preview.valid ? (
              <>
                <p className="font-display text-lg font-semibold text-foreground">This invite has expired</p>
                <p className="text-sm text-muted-foreground">
                  Ask the person who invited you to send a new link from their Family page.
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-semibold text-foreground">
                  Join {preview.household_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {preview.invited_by_name ?? 'A family member'} invited you to share your family calendar, shopping
                  lists, tasks, meal plans and pantry. Your budget and personal trackers stay private.
                </p>
                {wrongEmail && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    This invite was sent to {preview.email}. Sign in with that email to accept it.
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={join} disabled={joining || wrongEmail}>
                    {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Join household
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/dashboard">Not now</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
