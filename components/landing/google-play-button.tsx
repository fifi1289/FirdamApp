import { Play } from 'lucide-react';

import { SITE } from '@/lib/site';
import { tr } from '@/lib/i18n';

/** "Get it on Google Play" for the Firdam Android app. */
export function GooglePlayButton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <a
        href={SITE.playStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2 text-white transition-opacity hover:opacity-85"
      >
        <Play className="h-6 w-6 fill-current" aria-hidden />
        <span className="text-start leading-tight">
          <span className="block text-[11px] opacity-80">{tr('Get it on')}</span>
          <span className="block text-base font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}

/** A small "New" announcement above the hero title. */
export function GooglePlayAnnouncement() {
  return (
    <a
      href={SITE.playStoreUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
    >
      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{tr('New')}</span>
      {tr('Firdam is now on Google Play')}
    </a>
  );
}
