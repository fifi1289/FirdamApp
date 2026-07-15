import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Hero } from '@/components/landing/hero';
import { ModulesShowcase } from '@/components/landing/modules-showcase';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { FAQ } from '@/components/landing/faq';
import { CTA } from '@/components/landing/cta';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ModulesShowcase />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
