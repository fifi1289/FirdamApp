'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Gift, Loader2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  acceptAmbassadorTerms,
  inviteUrl,
  isAdmin,
  loadAmbassadorStats,
  type AmbassadorFamily,
  type AmbassadorStats,
} from '@/features/earn/earn-client';
import { qrMatrix, qrPath } from '@/features/earn/qr';
import { locale, tr } from '@/lib/i18n';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });

export function AmbassadorDashboard() {
  const [stats, setStats] = useState<AmbassadorStats | null>(null);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([loadAmbassadorStats(), isAdmin()])
      .then(([s, a]) => {
        setStats(s);
        setAdmin(a);
      })
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title={tr('Earn with Firdam')}
        description={tr('Invite families to Firdam and earn free months of Firdam Family.')}
      />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !stats ? (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {tr('Loading…')}
        </p>
      ) : !stats.live && !admin ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Gift className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">{tr('Coming soon, in shaa Allah.')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {!stats.live && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              Admin preview: the programme is switched off, so invite links don’t count yet. Turn it on in Admin → Earn.
            </p>
          )}
          {stats.excluded && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {tr('This account is an admin or test account, so it can’t earn rewards.')}
            </p>
          )}
          {!stats.terms_accepted_at ? (
            <TermsCard version={stats.terms_version} onAccepted={load} />
          ) : (
            <>
              <InviteCard code={stats.code} />
              <Funnel stats={stats} />
              <FreeMonths stats={stats} />
              <Families stats={stats} />
              <p className="text-xs text-muted-foreground">
                {tr('You accepted the')}{' '}
                <Link href="/earn/terms/ambassador" className="text-primary hover:underline">
                  {tr('Ambassador Terms')}
                </Link>{' '}
                {tr('on {0}.', [dayMonth(stats.terms_accepted_at)])}
              </p>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function TermsCard({ version, onAccepted }: { version: string; onAccepted: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const accept = async () => {
    setSaving(true);
    try {
      await acceptAmbassadorTerms(version);
      onAccepted();
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };
  return (
    <Card className="max-w-2xl">
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{tr('Become a Firdam ambassador')}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>{tr('Share your personal invite link with families you know.')}</li>
          <li>{tr('Each new family that uses Firdam on 7 different days in its first 30 days earns you 1 free month of Firdam Family.')}</li>
          <li>{tr('Up to 12 free months at a time, each valid for 12 months. No cash value.')}</li>
          <li>{tr('Your own account and household never count.')}</li>
        </ul>
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
          <span>
            {tr('I accept the')}{' '}
            <Link href="/earn/terms/ambassador" target="_blank" className="font-medium text-primary hover:underline">
              {tr('Ambassador Terms')}
            </Link>
          </span>
        </label>
        <Button onClick={accept} disabled={!agreed || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {tr('Get my invite link')}
        </Button>
      </CardContent>
    </Card>
  );
}

function InviteCard({ code }: { code: string }) {
  const url = inviteUrl(code);
  const [copied, setCopied] = useState<string | null>(null);
  const qr = useMemo(() => qrPath(qrMatrix(url)), [url]);
  const message = tr('Assalamu alaykum! I use Firdam for our family’s meals, prayer times and home. Join with my link: {0}', [url]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(tr('Couldn’t copy. Select the text and copy it yourself.'));
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Firdam', text: message });
      } catch {
        /* closed */
      }
    } else copy(message, 'message');
  };

  const downloadQr = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" width="1024" height="1024" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${qr.path}" fill="#000"/></svg>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = 'firdam-invite-qr.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-sm font-semibold">{tr('Your invite link')}</p>
            <div className="mt-2 flex items-center gap-2">
              <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg border bg-muted/50 px-3 py-2 text-sm">{url}</code>
              <Button size="sm" variant="outline" onClick={() => copy(url, 'link')}>
                {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">{tr('Copy')}</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tr('Or they can type your code when they sign up:')}{' '}
              <span dir="ltr" className="font-mono font-semibold text-foreground">{code}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={share}>
              <Share2 className="mr-2 h-4 w-4" /> {tr('Share')}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(message, 'message')}>
              {copied === 'message' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />} {tr('Copy message')}
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="h-40 w-40 rounded-lg border bg-white" shapeRendering="crispEdges" role="img" aria-label={tr('QR code for your invite link')}>
            <path d={qr.path} fill="#000" />
          </svg>
          <Button size="sm" variant="ghost" onClick={downloadQr}>
            <Download className="mr-2 h-4 w-4" /> {tr('Download QR code')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Funnel({ stats }: { stats: AmbassadorStats }) {
  const steps = [
    { label: 'Link opened', value: stats.clicks },
    { label: 'Families joined', value: stats.signups },
    { label: 'Active families', value: stats.qualified, hint: tr('{0} days in their first {1}', [stats.needed_days, stats.window_days]) },
    { label: 'Paying families', value: stats.paying },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {steps.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted-foreground">{tr(s.label)}</p>
            {s.hint && <p className="text-xs text-muted-foreground/80">{s.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FreeMonths({ stats }: { stats: AmbassadorStats }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{tr('Your free months')}</h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.months_banked}<span className="text-sm text-muted-foreground"> / {stats.max_banked}</span></p>
            <p className="text-xs text-muted-foreground">{tr('Saved')}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.months_used}</p>
            <p className="text-xs text-muted-foreground">{tr('Used')}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{stats.months_expiring}</p>
            <p className="text-xs text-muted-foreground">{tr('Expiring within 30 days')}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {stats.next_expiry
            ? tr('Your next free month expires on {0}. Saved months are used automatically when Firdam Family launches.', [dayMonth(stats.next_expiry)])
            : tr('Saved months are used automatically when Firdam Family launches.')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{tr('Cash rewards: not yet. If they come, we’ll publish new terms first.')}</p>
      </CardContent>
    </Card>
  );
}

function familyStatus(f: AmbassadorFamily, needed: number): { text: string; tone: 'ok' | 'wait' | 'no' } {
  if (f.on_hold) return { text: tr('Being checked'), tone: 'wait' };
  if (f.status === 'qualified')
    return { text: f.free_month === 'over_cap' ? tr('Active (you already hold the most free months)') : tr('Active — free month earned'), tone: 'ok' };
  if (f.status === 'not_qualified') return { text: tr('Didn’t reach {0} days', [needed]), tone: 'no' };
  if (f.active_days >= needed) return { text: tr('Waiting for email check and family profile'), tone: 'wait' };
  return { text: tr('Getting started'), tone: 'wait' };
}

function Families({ stats }: { stats: AmbassadorStats }) {
  if (stats.families.length === 0)
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {tr('No families yet. Share your link with a family you think Firdam would help.')}
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-semibold">{tr('Families you invited')}</h2>
        <p className="text-xs text-muted-foreground">{tr('To protect their privacy, you only see their progress, never who they are.')}</p>
        <ul className="mt-4 divide-y">
          {stats.families.map((f, i) => {
            const s = familyStatus(f, stats.needed_days);
            return (
              <li key={i} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tr('Family joined {0}', [monthYear(f.joined)])}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={Math.min(100, (f.active_days / stats.needed_days) * 100)} className="h-1.5 max-w-[160px]" />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {tr('{0} / {1} days', [Math.min(f.active_days, stats.needed_days), stats.needed_days])}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={s.tone === 'ok' ? 'default' : s.tone === 'no' ? 'outline' : 'secondary'}>{s.text}</Badge>
                  {f.paying && <Badge variant="secondary">{tr('Paying')}</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
