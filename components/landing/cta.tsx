import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-brand-light/10 to-transparent px-6 py-16 text-center md:px-16 md:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-40" />
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            One home for your Muslim life.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground md:text-lg">
            Join Firdam today — halal living, faith and family, organised in one
            trusted place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/register">
                Create your free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">Open the app</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
