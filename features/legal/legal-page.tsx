import Link from 'next/link';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { SITE } from '@/lib/site';

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
          <p className="text-sm font-medium text-primary">Last updated {SITE.legalUpdated}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">{intro}</div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-foreground">In short</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
              {summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <nav className="mt-8 rounded-2xl border border-border p-5" aria-label="Contents">
            <p className="text-sm font-semibold text-foreground">Contents</p>
            <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {i + 1}. {s.title}
                </h2>
                <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            Questions? Email <a className="text-primary hover:underline" href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>. See also our{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Use
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
