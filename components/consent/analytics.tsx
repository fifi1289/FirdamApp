'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

import { Button } from '@/components/ui/button';

// Google Analytics 4 for firdam.com (account: Firdam, stream: firdam.com).
// The Measurement ID is public by design (it ships in the page source).
const GA_MEASUREMENT_ID = 'G-4NF423ZQLB';

const KEY = 'firdam.cookie-consent';
const EVENT = 'firdam-consent-changed';

type Consent = 'granted' | 'denied' | null;

function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function saveConsent(v: Consent) {
  try {
    if (v) window.localStorage.setItem(KEY, v);
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Stops Google Analytics on this page and removes its cookies. */
function stopAnalytics() {
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0]!.trim())) {
    if (!name.startsWith('_ga')) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

/**
 * Google Analytics, only after the visitor agrees (Quebec's Law 25 and the
 * GDPR ask for consent before analytics cookies). Shows the cookie banner
 * until a choice is made; the choice can be changed from the Privacy Policy.
 */
export function Analytics() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const sync = () => setConsent(readConsent());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  useEffect(() => {
    if (consent === 'denied') stopAnalytics();
    if (consent === 'granted') (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  }, [consent]);

  return (
    <>
      {consent === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
      {ready && consent === null && (
        <div
          role="dialog"
          aria-label="Cookie choice"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 shadow-lg sm:inset-x-6 sm:bottom-6 sm:p-5 print:hidden"
        >
          <p className="text-sm font-semibold text-foreground">Can we use analytics cookies?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            They help us see which pages are visited so we can improve Firdam. No ads, and we never sell your data. Firdam works the same
            either way.{' '}
            <Link href="/privacy#cookies" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => saveConsent('denied')}>
              Decline
            </Button>
            <Button className="flex-1" onClick={() => saveConsent('granted')}>
              Accept
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/** "Change my cookie choice": clears the saved choice so the banner shows again. */
export function CookieChoiceButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => saveConsent(null)}>
      Change my cookie choice
    </Button>
  );
}
