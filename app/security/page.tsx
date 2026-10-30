import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/features/legal/legal-page';
import { SITE } from '@/lib/site';
import { tr, trn } from '@/lib/i18n';

export const metadata = {
  title: 'Security',
  description: 'How Firdam keeps your family’s information safe.',
};

const sections: LegalSection[] = [
  {
    id: 'encryption',
    title: 'Encrypted on the way and at rest',
    body: (
      <p>
        {tr('Everything between your device and {0} travels over HTTPS (TLS encryption), and browsers are told to always use the secure connection. Your data is stored with our database provider, Supabase, which encrypts stored data (AES-256) and keeps backups.', [SITE.name])}
      </p>
    ),
  },
  {
    id: 'walls',
    title: 'Each family’s data is walled off',
    body: (
      <>
        <p>
          {tr('The database itself checks every request: you can only read and change your own information, and the shared parts of a household you’ve joined. This is enforced by the database (“row-level security”), not just by the app’s screens, so it holds even if someone tries to call our servers directly.')}
        </p>
        <p>
          {tr('Every change we make to {0} is automatically tested to confirm that one family can’t see another family’s pantry, budget, plans or trackers.', [SITE.name])}
        </p>
      </>
    ),
  },
  {
    id: 'two-step',
    title: 'Two-step verification',
    body: (
      <p>
        {tr('Turn it on in Settings → Account. After your password, you’ll enter a 6-digit code from an authenticator app on your phone, so a stolen password alone isn’t enough. When it’s on, the database refuses to share any of your data with a session that hasn’t entered the code.')}
      </p>
    ),
  },
  {
    id: 'zakat',
    title: 'Your gold and zakat figures stay on your device',
    body: (
      <p>
        {tr('The zakat calculator works entirely in your browser: the gold, silver, cash and savings amounts you enter are saved only on your device and never sent to {0}. Only a zakat or sadaqah payment you choose to record in your budget is saved to your account.', [SITE.name])}
      </p>
    ),
  },
  {
    id: 'bots',
    title: 'Protection from bots and attacks',
    body: (
      <p>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
          ? tr('Sign-in, sign-up and password reset are protected by Cloudflare Turnstile, which stops automated password-guessing without annoying puzzles. ')
          : ''}
        {tr('The app runs on Cloudflare’s global network, which absorbs traffic floods (DDoS), and our login provider limits repeated attempts. Pages send strict browser security rules that block other sites from framing {0} and stop injected scripts from talking to unknown servers.', [SITE.name])}
      </p>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    body: (
      <p>
        {tr('Subscriptions are handled by Stripe, a certified payment processor. Your card details go straight to Stripe — they never touch {0}’s servers.', [SITE.name])}
      </p>
    ),
  },
  {
    id: 'ai',
    title: 'AI features',
    body: (
      <p>
        {tr('When you use an AI feature, we send only what that feature needs, and the AI provider doesn’t use it to train its models. Companion chat history is kept on your device. Receipt photos aren’t stored. Read more in our')}{' '}
        <Link href="/privacy#ai">{tr('Privacy Policy')}</Link>.
      </p>
    ),
  },
  {
    id: 'control',
    title: 'You stay in control',
    body: (
      <ul>
        <li>{tr('We don’t sell your data, show ads or use tracking cookies.')}</li>
        <li>{tr('Download everything any time: Settings → Account → Export my data.')}</li>
        <li>{tr('Delete your account and data any time: Settings → Account → Delete my account.')}</li>
      </ul>
    ),
  },
  {
    id: 'tips',
    title: 'What you can do',
    body: (
      <ul>
        <li>{tr('Use a strong password you don’t use anywhere else (a password manager helps).')}</li>
        <li>{tr('Turn on two-step verification, especially if you track savings or zakat.')}</li>
        <li>{tr('Only invite people you trust into your shared household.')}</li>
        <li>{tr('Sign out on shared or public computers.')}</li>
        <li>{trn(SITE.name)} {tr('will never ask for your password by email or message.')}</li>
      </ul>
    ),
  },
  {
    id: 'report',
    title: 'Found a problem?',
    body: (
      <p>
        {tr('If you think you’ve found a security issue, please email')}{' '}
        <a href={`mailto:${SITE.privacyEmail}`}>{trn(SITE.privacyEmail)}</a> {tr('with the details. We’ll reply quickly and fix it. Please don’t access other people’s data or disrupt the service while testing.')}
      </p>
    ),
  },
];

export default function SecurityPage() {
  return (
    <LegalPage
      title={tr('How we keep your data safe')}
      intro={
        <p>
          {tr('Families trust {0} with their plans, money and faith — an amanah we take seriously. Here’s what protects your information, in plain words.', [SITE.name])}
        </p>
      }
      summary={[
        'Encrypted in transit (HTTPS) and at rest.',
        'The database itself keeps each family’s data private — tested automatically on every change.',
        'Optional two-step verification, enforced by the database.',
        'Your gold and zakat figures never leave your device.',
        'Protection from attacks, and card details handled only by Stripe.',
      ]}
      sections={sections}
    />
  );
}
