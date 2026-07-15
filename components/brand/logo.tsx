import Link from 'next/link';
import { Hexagon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}

export function Logo({ className, href = '/', showWordmark = true }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 font-semibold tracking-tight',
        className
      )}
    >
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground shadow-sm transition-transform duration-300 ease-out-expo group-hover:scale-105">
        <Hexagon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {showWordmark && (
        <span className="text-lg text-foreground">Firdam</span>
      )}
    </Link>
  );
}
