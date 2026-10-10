import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/features/legal/legal-page';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Firdam collects, uses and protects your family’s information.',
};

const email = <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>;

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          {SITE.name} (“{SITE.name}”, “we”, “us”) is a web app that helps Muslim families with halal food, meals, prayer,
          family life and money. {SITE.name} is run by {SITE.operator}.
        </p>
        <p>
          We are responsible for the personal information we collect through {SITE.name}. Our privacy officer is the
          founder, who you can reach at {email}. We follow Canada’s federal privacy law, the{' '}
          <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA).
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>We only collect what the app needs to work. Most of it is information you choose to enter:</p>
        <ul>
          <li>
            <strong>Your account:</strong> your email address, name and password (the password is stored securely by our
            login provider and we can’t see it).
          </li>
          <li>
            <strong>Your family:</strong> names, relationships and dates of birth of family members you add (used to plan
            meals for the right portions and to remember birthdays), and the people you invite to share your household.
          </li>
          <li>
            <strong>Food and plans:</strong> your pantry, shopping lists, meal plans, recipes you write, what you cooked,
            dietary preferences and allergies, tasks, family calendar events and trips.
          </li>
          <li>
            <strong>Faith trackers:</strong> Quran reading, Ramadan fasting and other trackers you choose to use.
          </li>
          <li>
            <strong>Money:</strong> budgets, spending, sadaqah and zakat records and savings goals you enter. We never ask
            for bank or card details for these tools.
          </li>
          <li>
            <strong>Location:</strong> when you allow it, your device’s location (or a city you type) to show prayer
            times, the Qibla direction and halal places near you. Your saved location is kept on your device.
          </li>
          <li>
            <strong>Things you share with others:</strong> halal places, reviews, public recipes, community events,
            business listings and RSVPs.
          </li>
          <li>
            <strong>AI features:</strong> messages you send to the Family Companion and receipt photos you scan (see{' '}
            <a href="#ai">AI features</a>).
          </li>
          <li>
            <strong>Subscriptions:</strong> if you upgrade, your plan, its status and renewal dates. Payments are handled
            by Stripe; we never see or store your full card number.
          </li>
          <li>
            <strong>Technical information:</strong> the basic information your browser sends when you use any website
            (such as IP address and browser type), kept in our providers’ logs for security and troubleshooting.
          </li>
        </ul>
        <p>
          Some of this information can be sensitive — for example religious practice, health-related allergies and
          finances. We treat all of it as confidential and use it only to provide the features you use.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>run the app and show your own data back to you and to members of your household;</li>
          <li>suggest recipes, meal plans and shopping that fit your pantry, family size, allergies and diet;</li>
          <li>show prayer times, the Qibla and halal places for your location;</li>
          <li>provide the AI features when you choose to use them;</li>
          <li>manage your subscription and apply plan limits;</li>
          <li>reply when you contact us, keep the app secure and fix problems.</li>
        </ul>
        <p>
          We <strong>do not sell</strong> your information, we <strong>do not show ads</strong>, and we do not use
          advertising or tracking cookies. We will ask for your consent before using your information for any new purpose.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI features',
    body: (
      <>
        <p>
          Some features use OpenAI, an AI provider, to work. We only send what the feature needs, and only when you use it:
        </p>
        <ul>
          <li>
            <strong>Family Companion</strong> (paid plans): your message and a summary of the family information the
            Companion needs to answer (for example this week’s plans, pantry, family first names and ages, budget totals).
            Your chat history is kept on your own device, not on our servers.
          </li>
          <li>
            <strong>AI meal plans:</strong> your meal preferences, allergies, family size and (if you choose) pantry items.
          </li>
          <li>
            <strong>Receipt scanning</strong> (paid plans): the photo of your receipt. We don’t keep the photo — only the
            items you confirm are saved to your pantry.
          </li>
        </ul>
        <p>
          Under OpenAI’s policies for its API, information sent this way is not used to train its models, and may be kept
          by OpenAI for a limited time (up to 30 days) to detect abuse. Please don’t include information in AI requests
          that you don’t want processed this way.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We share information only in these cases:</p>
        <ul>
          <li>
            <strong>Your household:</strong> if you join or create a shared household, its members can see and edit the
            shared calendar, shopping lists, tasks, meal plans, pantry and family profiles. Budgets and personal trackers
            stay private.
          </li>
          <li>
            <strong>Other members:</strong> things you choose to share publicly — halal places, reviews, public recipes,
            community events and business listings — can be seen by other {SITE.name} members, together with the display
            name you chose.
          </li>
          <li>
            <strong>Service providers</strong> who help us run {SITE.name}, under agreements to protect your information
            and use it only to provide their service:
            <ul className="mt-1.5">
              <li>Supabase — database, login and file storage;</li>
              <li>Vercel — website hosting;</li>
              <li>OpenAI — the AI features described above;</li>
              <li>Stripe — payments and subscriptions;</li>
              <li>
                OpenStreetMap services (Overpass and Nominatim), Aladhan, Open-Meteo and CARTO map tiles — these receive
                the location or city you search for, to find places, prayer times and draw the map.
              </li>
            </ul>
          </li>
          <li>
            <strong>The law:</strong> if we are legally required to (for example a valid court order), or to protect
            someone’s safety.
          </li>
          <li>
            <strong>If {SITE.name} changes hands:</strong> if the app is transferred to a company (for example when
            {` ${SITE.name}`} is incorporated), your information would move with it under this policy, and we would tell
            you first.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'where',
    title: 'Where your information is stored',
    body: (
      <p>
        Our providers may store and process information in the United States or other countries outside Canada. When
        it’s there, it is protected by our providers’ security but may be accessible to authorities under those
        countries’ laws.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <>
        <p>
          {SITE.name} accounts are for adults (18 or older). Parents and guardians may add their children’s first names
          and dates of birth to plan family meals and events — this information is controlled by the parent and visible
          only to the parent’s account and household.
        </p>
        <p>
          We don’t knowingly let children create accounts. If you think a child has created an account, email {email} and
          we will delete it.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <p>
        Your information is sent over encrypted connections (HTTPS), stored encrypted by our database provider, and
        protected by access rules so that only you and your household can read your private data. You can turn on
        two-step verification in Settings, and the zakat calculator keeps your gold and savings figures on your device
        only. See our <Link href="/security">Security page</Link> for details. Our team’s access is limited to what’s needed to run and support the
        app. No system is perfectly secure; if a breach ever puts you at real risk of significant harm, we will notify
        you and the Privacy Commissioner of Canada as the law requires.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <p>
        We keep your information while your account is open. When you delete your account, your personal information and
        the content you created are deleted from our database, usually straight away, and from our providers’ backups
        within about 30 days. We may keep limited records longer where the law requires (for example payment records for
        tax purposes).
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <>
        <ul>
          <li>
            <strong>See and download</strong> your information any time: Settings → Account → Export my data.
          </li>
          <li>
            <strong>Correct</strong> it in the app, or ask us to.
          </li>
          <li>
            <strong>Delete</strong> your account and data: Settings → Account → Delete my account, or email {email}.
          </li>
          <li>
            <strong>Withdraw consent</strong> to optional features — for example turn off location, or stop using the
            AI features — at any time. Some features won’t work without the information they need.
          </li>
          <li>
            <strong>Ask questions or complain</strong> to us at {email}. We will reply within 30 days. If you’re not
            satisfied, you can contact the{' '}
            <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
              Office of the Privacy Commissioner of Canada
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage on your device',
    body: (
      <p>
        We use only the cookies needed to keep you signed in. The app also saves a few settings on your device — your
        location, prayer-time settings, reminders and Companion chat history — so they’re there next time. We don’t use
        analytics, advertising or tracking cookies.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We’ll update this page when our practices change and show the date at the top. If a change is important, we’ll
        tell you in the app or by email before it takes effect.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Privacy officer, {SITE.name} — {email}. For general help, see <Link href="/support">Support</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Your family’s information is an amanah (trust). This policy explains, in plain words, what {SITE.name} collects,
          why, who can see it and how you stay in control.
        </p>
      }
      summary={[
        'We collect only what the app needs, mostly what you choose to enter.',
        'We don’t sell your data, show ads or use tracking cookies.',
        'Your private data is visible only to you and the household you choose to share with.',
        'AI features send the minimum needed to OpenAI, only when you use them.',
        'You can export or delete everything at any time.',
      ]}
      sections={sections}
    />
  );
}
