import Link from 'next/link';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { SITE } from '@/lib/site';
import { getLang, tr, trn } from '@/lib/i18n';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared layout for the Privacy Policy and Terms: summary, contents and sections. */
export function LegalPage({
  title,
  intro,
  summary,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  summary: string[];
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container flex-1 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-primary">{tr('Last updated')} {trn(SITE.legalUpdated)}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">{trn(title)}</h1>
          {getLang() !== 'en' && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {tr('This document is available in English only. The English version is the one that applies.')}
            </p>
          )}
          <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">{trn(intro)}</div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-foreground">{tr('In short')}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
              {summary.map((s) => (
                <li key={s}>{trn(s)}</li>
              ))}
            </ul>
          </div>

          <nav className="mt-8 rounded-2xl border border-border p-5" aria-label={tr('Contents')}>
            <p className="text-sm font-semibold text-foreground">{tr('Contents')}</p>
            <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {tr(s.title)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {i + 1}. {tr(s.title)}
                </h2>
                <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {trn(s.body)}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            {tr('Questions? Email')} <a className="text-primary hover:underline" href={`mailto:${SITE.privacyEmail}`}>{trn(SITE.privacyEmail)}</a>{tr('. See also our')}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {tr('Privacy Policy')}
            </Link>{' '}
            {tr('and')}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {tr('Terms of Use')}
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
