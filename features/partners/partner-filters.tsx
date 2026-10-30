'use client';

import { cn } from '@/lib/utils';
import { PartnerCountryPicker } from '@/features/partners/partner-country';
import type { PartnerShop } from '@/features/groceries/partners';

export type WorksFilter = 'online' | 'in_person' | null;

/** Country picker + All / Online / In person, for Services and Learning. */
export function PartnerFilters({ shops, works, onWorks }: { shops: PartnerShop[]; works: WorksFilter; onWorks: (w: WorksFilter) => void }) {
  const opts: { id: WorksFilter; label: string }[] = [
    { id: null, label: 'All' },
    { id: 'online', label: 'Online' },
    { id: 'in_person', label: 'In person' },
  ];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
      <PartnerCountryPicker shops={shops} />
      <div role="group" aria-label="How they work" className="flex gap-1.5">
        {opts.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onWorks(o.id)}
            aria-pressed={works === o.id}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
              works === o.id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/40'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
