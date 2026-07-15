import Link from 'next/link';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  showWordmark?: boolean;
  /** icon-only size in px (the square icon mark); wordmark scales proportionally */
  size?: number;
  /** Force light variant (white mark) for use on the brand-coloured auth sidebar */
  variant?: 'default' | 'light';
}

/**
 * Official Firdam logo mark + wordmark.
 *
 * The mark is an inline SVG faithful to the brand identity:
 *   Dark   #7B4325 — outer F arc
 *   Mid    #A0622E — inner F arc
 *   Sandy  #C99A72 — accent block
 *
 * The wordmark "Firdam" matches the logo's near-black (#1E1E1E)
 * rounded-sans lettering in default mode; white in the light variant.
 */
export function Logo({
  className,
  href = '/',
  showWordmark = true,
  size = 36,
  variant = 'default',
}: LogoProps) {
  const wordmarkColor = variant === 'light' ? '#ffffff' : '#1E1E1E';

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer F — dark sienna */}
      <path
        d="
          M 28 20
          L 28 220
          Q 28 228 36 228
          L 56 228
          Q 64 228 64 220
          L 64 108
          L 120 108
          Q 168 108 168 62
          Q 168 18 120 18
          L 36 18
          Q 28 18 28 20
          Z
          M 64 44
          L 116 44
          Q 138 44 138 62
          Q 138 80 116 82
          L 64 82
          Z
        "
        fill="#7B4325"
        fillRule="evenodd"
      />

      {/* Inner F arc — warm brown */}
      <path
        d="
          M 64 108
          L 64 196
          Q 64 204 72 204
          L 90 204
          Q 98 204 98 196
          L 98 172
          L 106 172
          Q 140 172 140 148
          Q 140 124 106 124
          L 98 124
          L 98 108
          Z
          M 98 136
          L 108 136
          Q 122 136 122 148
          Q 122 160 108 160
          L 98 160
          Z
        "
        fill="#A0622E"
        fillRule="evenodd"
      />

      {/* Sandy accent block */}
      <rect x="64" y="210" width="34" height="18" rx="6" fill="#C99A72" />
    </svg>
  );

  const wordmark = showWordmark && (
    <svg
      height={size * 0.64}
      viewBox="0 0 200 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Firdam"
    >
      <text
        x="0"
        y="44"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="52"
        fontWeight="500"
        letterSpacing="-1"
        fill={wordmarkColor}
      >
        Firdam
      </text>
    </svg>
  );

  const content = (
    <span className="inline-flex items-center gap-2">
      {mark}
      {wordmark}
    </span>
  );

  if (!href) {
    return <span className={cn('inline-flex items-center', className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2 transition-opacity duration-200 hover:opacity-80',
        className
      )}
      aria-label="Firdam home"
    >
      {content}
    </Link>
  );
}
