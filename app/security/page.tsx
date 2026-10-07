import Link from 'next/link';
import { CreditCard, Eye, KeyRound, Lock, Server, ShieldCheck, Smartphone, Sparkles, Trash2 } from 'lucide-react';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Security',
  description: 'How Firdam keeps your family’s information safe.',
};

const points = [
  {
    icon: Lock,
    title: 'Encrypted all the way',
    body: 'Everything between your device and Firdam travels over HTTPS, and browsers are told to never use an unencrypted connection. Our database provider encrypts stored data at rest.',
  },
  {
    icon: Eye,
    title: 'Only you (and your household) can see it',
    body: 'Every table is protected by row-level security in the database itself: your private data can only be read by your account, and the shared parts by the household members you invite. These rules are tested automatically every time the app changes.',
  },
  {
    icon: Smartphone,
    title: 'Zakat figures never leave your phone',
    body: 'The gold, silver, savings and debts you enter in the zakat calculator are calculated on your device and never sent to our servers. You choose whether this device remembers them, and can clear them any time.',
  },
  {
    icon: KeyRound,
    title: 'Strong sign-in',
    body: 'Passwords are stored as one-way hashes by our login provider — nobody at Firdam can read them. Turn on two-step verification in Settings to require a code from your phone on new devices.',
  },
  {
    icon: CreditCard,
    title: 'Card details never touch Firdam',
    body: 'Subscriptions are paid through Stripe, a certified payment provider. We only store your plan and renewal date.',
  },
  {
    icon: Sparkles,
    title: 'Careful with AI',
    body: 'AI features only receive what they need, only when you use them, and the AI provider doesn’t use it to train its models. Receipt photos aren’t kept.',
  },
  {
    icon: ShieldCheck,
    title: 'No ads, no trackers, no selling',
    body: 'We don’t sell or rent your information, show ads, or use analytics or advertising trackers. Strict browser security rules stop other websites from loading or framing Firdam.',
  },
  {
    icon: Trash2,
    title: 'You stay in control',
    body: 'Download all your data from Settings at any time, or delete your account and everything in it in one step.',
  },
  {
    icon: Server,
    title: 'Trusted infrastructure',
    body: 'Firdam runs on Supabase (database and login) and Vercel (hosting), which include protection against attacks and outages, with regular backups.',
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container flex-1 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-primary">Security</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
            Your family’s information is an amanah
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            You trust {SITE.name} with your family’s plans, health needs and money. Here is, in plain words, how we protect
            it.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {points.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 font-semibold text-foreground">{p.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-foreground">
            <p className="font-semibold">Found a security problem?</p>
            <p className="mt-1 text-muted-foreground">
              Please email <a className="text-primary hover:underline" href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>{' '}
              with the details. We’ll reply quickly and fix it as a priority. Please don’t access other people’s data while
              testing.
            </p>
            <p className="mt-3 text-muted-foreground">
              More detail is in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
