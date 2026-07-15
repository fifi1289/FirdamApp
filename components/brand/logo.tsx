import Link from 'next/link';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  /** Height of the logo image in px. Width scales automatically. */
  height?: number;
  /** When true, wraps in a <span> instead of a <Link>. */
  noLink?: boolean;
}

/**
 * Official Firdam logo — uses the uploaded brand PNG exactly as provided.
 * No recreation, no icon substitution, no simplification.
 */
export function Logo({
  className,
  href = '/',
  height = 48,
  noLink = false,
}: LogoProps) {
  const img = (
    <Image
      src="/firdam-logo.png"
      alt="Firdam"
      height={height}
      width={height}          /* next/image requires both; aspect ratio enforced below */
      style={{ height, width: 'auto', objectFit: 'contain' }}
      priority
      unoptimized            /* keeps the PNG bit-perfect with no server-side transforms */
    />
  );

  if (noLink) {
    return (
      <span className={cn('inline-flex items-center', className)}>{img}</span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm',
        className
      )}
      aria-label="Firdam home"
    >
      {img}
    </Link>
  );
}
