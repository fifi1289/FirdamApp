import { Smartphone } from 'lucide-react';

import { SITE } from '@/lib/site';
import { tr } from '@/lib/i18n';

/** The iPhone app is on sale again: set to false to hide the App Store button if it's ever removed. */
export const SHOW_APP_STORE = true;

/** "Download on the App Store" for the Firdam iPhone app. */
export function AppStoreButton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <a
        href={SITE.appStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2 text-white transition-opacity hover:opacity-85"
      >
        <Smartphone className="h-6 w-6" aria-hidden />
        <span className="text-start leading-tight">
          <span className="block text-[11px] opacity-80">{tr('Download on the')}</span>
          <span className="block text-base font-semibold">App Store</span>
        </span>
      </a>
    </div>
  );
}
