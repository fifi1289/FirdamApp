import Link from 'next/link';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  /** Fixed height in px (used when `responsive` is false). */
  height?: number;
  /** When true, scales 44px on mobile and 64px on desktop. */
  responsive?: boolean;
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
  responsive = false,
  noLink = false,
}: LogoProps) {
  const img = (
    <Image
      src="/firdam-logo.png"
      alt="Firdam"
      width={200}
      height={64}
      className={cn(
        'w-auto object-contain',
        responsive ? 'h-[44px] md:h-16' : 'h-auto'
      )}
      style={responsive ? undefined : { height, width: 'auto' }}
      priority
      unoptimized
    />
  );

  if (noLink) {
    return <span className="inline-flex items-center">{img}</span>;
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
