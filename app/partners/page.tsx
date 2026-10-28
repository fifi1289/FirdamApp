import { BadgeCheck, BarChart3, HeartHandshake, Store } from 'lucide-react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PartnerApplyForm } from '@/features/partners/partner-apply-form';
import { PARTNER_TERMS, FOUNDING_FREE_UNTIL_LABEL } from '@/features/partners/partner-terms';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Become a partner',
  description: `List your Muslim-owned shop on Firdam, free for founding partners until ${FOUNDING_FREE_UNTIL_LABEL}.`,
};

const BENEFITS = [
  {
    icon: Store,
    title: 'Your shop in front of Muslim families',
    text: 'Families find you in Firdam’s Shopping, right where they plan meals, Eid and the school year.',
  },
  {
    icon: BadgeCheck,
    title: 'A Partner badge',
    text: 'Your logo, photos, a discount code if you like, and a button straight to your website, Facebook, Instagram or WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'See what Firdam brings you',
    text: 'Every month we send you how many families tapped through to your shop.',
  },
  {
    icon: HeartHandshake,
    title: 'Free, no commission',
    text: `Free for founding partners until ${FOUNDING_FREE_UNTIL_LABEL}. Never a charge without your written agreement.`,
  },
];

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 py-14 md:py-20">
          <div className="container max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">For Muslim-owned shops</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-foreground md:text-5xl">
              Bring your shop to Muslim families on {SITE.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Modest clothing, halal groceries, kids’ books, Eid gifts, home essentials… If you run a Muslim-owned
              business, list it on Firdam for free as one of our founding partners.
            </p>
            <a
              href="#apply"
              className="mt-7 inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply in 2 minutes
            </a>
          </div>
        </section>

        <section className="border-b border-border/60 py-14">
          <div className="container grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-3 font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-border/60 py-14">
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl font-semibold text-foreground">How it works</h2>
            <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                ['Apply', 'Tell us about your shop with the form below.'],
                ['We set it up', 'We message you within a few days, add your logo and photos, and send you a preview.'],
                ['Families find you', 'Your shop appears in Shopping on firdam.com and in the Firdam app.'],
              ].map(([t, d], i) => (
                <li key={t} className="rounded-2xl border border-border p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                  <p className="mt-3 font-semibold text-foreground">{t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>

            <div id="terms" className="mt-10 scroll-mt-24 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="font-semibold text-foreground">Partner terms</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
                {PARTNER_TERMS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-24 py-14">
          <div className="container max-w-2xl">
            <h2 className="font-display text-2xl font-semibold text-foreground">Apply to become a partner</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Questions first? Email <a className="font-medium text-primary underline-offset-2 hover:underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
            </p>
            <div className="mt-6">
              <PartnerApplyForm />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
