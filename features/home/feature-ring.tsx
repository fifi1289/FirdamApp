'use client';

import Link from 'next/link';
import { ChefHat, Compass, MapPin, Moon, ShoppingCart, Users, Utensils, Wallet, type LucideIcon } from 'lucide-react';

import { HOME_FEATURES, ringPoint, type HomeFeatureId } from '@/features/home/home-features';
import { cn } from '@/lib/utils';

const ICONS: Record<HomeFeatureId, LucideIcon> = {
  prayer: Moon,
  qibla: Compass,
  halal: MapPin,
  meals: Utensils,
  recipes: ChefHat,
  shopping: ShoppingCart,
  finance: Wallet,
  family: Users,
};

/** Radius of the ring, as a percentage of the box. */
const RADIUS = 38;

/** Every feature around a ring with Firdam in the middle, the same ring as the phone app. */
export function FeatureRing({ className }: { className?: string }) {
  return (
    <nav aria-label="Firdam features" className={cn('mx-auto w-full max-w-[420px] pb-6', className)}>
      <div className="relative aspect-square w-full">
        <div aria-hidden className="absolute inset-[12%] rounded-full border border-dashed border-brand-sand" />
        <div
          aria-hidden
          className="bg-girih absolute inset-[34%] flex items-center justify-center rounded-full border-[3px] border-brand-gold bg-brand-espresso"
        >
          <span className="font-display text-xl font-bold tracking-tight text-brand-linen sm:text-2xl">Firdam</span>
        </div>
        <ul>
          {HOME_FEATURES.map((f, i) => {
            const p = ringPoint(i, HOME_FEATURES.length);
            const Icon = ICONS[f.id];
            const finance = f.id === 'finance';
            return (
              <li
                key={f.id}
                className="absolute w-20 -translate-x-1/2 -translate-y-7 sm:w-24 sm:-translate-y-8"
                style={{ left: `${50 + p.x * RADIUS}%`, top: `${50 + p.y * RADIUS}%` }}
              >
                <Link href={f.web} className="group flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      'inline-flex h-14 w-14 items-center justify-center rounded-full border transition-all group-hover:-translate-y-0.5 group-hover:shadow-md sm:h-16 sm:w-16',
                      finance
                        ? 'border-brand-sage/30 bg-brand-sage/10 text-brand-sage'
                        : 'border-border bg-[#EFE4D8] text-brand-walnut'
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-foreground">{f.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
