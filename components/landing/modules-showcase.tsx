import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { lifeModules, moduleIconMap } from '@/features/modules/module-config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ModulesShowcase() {
  return (
    <section id="modules" className="border-b border-border/60 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Modules
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Turn on the parts of life you care about
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Every module is independent and optional. Add what you need today,
            expand when life grows.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {lifeModules.map((mod) => {
            const Icon = moduleIconMap[mod.icon];
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div
                  className={cn(
                    'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                    mod.accent
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {mod.name}
                  </h3>
                  {mod.status === 'beta' && (
                    <Badge variant="secondary" className="text-[10px]">
                      Beta
                    </Badge>
                  )}
                </div>

                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {mod.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Explore module
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
