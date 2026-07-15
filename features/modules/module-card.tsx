import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { moduleIconMap } from '@/features/modules/module-config';
import type { LifeModule } from '@/types';

interface ModuleCardProps {
  module: LifeModule;
  className?: string;
}

export function ModuleCard({ module, className }: ModuleCardProps) {
  const Icon = moduleIconMap[module.icon];

  return (
    <Link
      href={module.href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20',
          module.accent
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 ease-out-expo group-hover:scale-105',
            module.accent
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        {module.status === 'beta' && (
          <Badge variant="secondary" className="text-[10px]">
            Beta
          </Badge>
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-foreground">
        {module.name}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {module.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open module
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
}
