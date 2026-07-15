'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  /** Pixel height rendered. Width auto-scales to preserve aspect ratio. */
  height?: number;
  /** Wrap in a <span> instead of a <Link> (e.g. when already inside an <a>). */
  noLink?: boolean;
}

/**
 * Official Firdam logo.
 * Uses /images/logo.png — the uploaded brand asset — without modification.
 */
export function Logo({ className, href = '/', height = 64, noLink = false }: LogoProps) {
  /* The source image is 1024×1024 (square, transparent RGBA). For a given
     height we derive the rendered width to keep the exact aspect ratio (1:1). */
  const renderedWidth = height;

  const img = (
    <Image
      src="/images/logo.png"
      alt="Firdam"
      width={renderedWidth}
      height={height}
      priority
      unoptimized
      style={{ height, width: 'auto', maxWidth: 'none', objectFit: 'contain' }}
    />
  );

  if (noLink) {
    return <span className={cn('inline-flex items-center', className)}>{img}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center rounded-sm transition-opacity duration-200 hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      aria-label="Firdam — home"
    >
      {img}
    </Link>
  );
}
