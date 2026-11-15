'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getLang, tr } from '@/lib/i18n';

/**
 * Google's own "Continue with Google" button (Google Identity Services). Google
 * then shows "to continue to firdam.com" instead of the Supabase address, and
 * the sign-in finishes on firdam.com with signInWithIdToken.
 * Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID (the web client ID used by the Supabase
 * Google provider); without it the pages keep their usual Google button.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface GoogleId {
  initialize(o: Record<string, unknown>): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not load.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function GoogleIdentityButton({ text, onSignedIn }: { text: 'continue_with' | 'signup_with'; onSignedIn: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadScript();
        if (cancelled || !box.current || !window.google) return;
        // A fresh nonce for each button: Google signs its hash, Supabase checks the original.
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: await sha256(nonce),
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
            if (error) toast.error(tr('Could not sign in with Google. Please try again.'));
            else onSignedIn();
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text, logo_alignment: 'center',
          width: Math.min(400, box.current.clientWidth || 360), locale: getLang(),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [text, onSignedIn]);

  if (failed) return <p className="text-center text-sm text-muted-foreground">{tr('Google sign-in could not load. Please use your email and password.')}</p>;
  return <div ref={box} className="flex w-full justify-center" />;
}
