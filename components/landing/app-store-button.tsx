import { Smartphone } from 'lucide-react';

import { SITE } from '@/lib/site';
import { tr } from '@/lib/i18n';

/**
 * Off while the app is removed from sale (until it's published under Firdam Inc.).
 * To bring it back: set this to true, and add `itunes: { appId: SITE.appStoreId }` to the
 * metadata in app/layout.tsx and the 'iPhone app' link to the site footer.
 */
export const SHOW_APP_STORE = false;

/** "Download on the App Store" for the Firdam iPhone app. Android follows when Google Play approves it. */
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
      <span className="text-xs text-muted-foreground">{tr('Android app coming soon')}</span>
    </div>
  );
}
