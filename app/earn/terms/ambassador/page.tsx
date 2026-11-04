import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/features/legal/legal-page';
import { AMBASSADOR_TERMS_VERSION } from '@/features/earn/earn-terms';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Ambassador Terms',
  description: 'The rules for inviting families to Firdam and earning free months.',
};

const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

/*
 * DRAFT written from the Earn with Firdam spec (§3). The owner will replace it
 * with the final legal text: when the text changes, change
 * AMBASSADOR_TERMS_VERSION here and in the admin settings, and everyone is
 * asked to accept again.
 */
const sections: LegalSection[] = [
  {
    id: 'about',
    title: 'About the programme',
    body: (
      <>
        <p>
          Every {SITE.name} account has a personal invite link and code. When a new family joins {SITE.name} with your
          link or code and starts using it, you can earn free months of Firdam Family. These Ambassador Terms add to our{' '}
          <Link href="/terms">Terms of Use</Link>; if they disagree, these terms apply to the programme.
        </p>
        <p>The programme is run by {SITE.operator}. We may pause, change or end it; earned free months stay valid until they expire.</p>
      </>
    ),
  },
  {
    id: 'attribution',
    title: 'Which families count',
    body: (
      <ul>
        <li>The family must create a <strong>new</strong> {SITE.name} account within 30 days of opening your link, or type your code when signing up.</li>
        <li>The first ambassador wins: once a family is linked to an ambassador, later links never change that.</li>
        <li>Your own account, your own household and your own other accounts never count.</li>
        <li>Admin, staff and test accounts never earn.</li>
      </ul>
    ),
  },
  {
    id: 'free-month',
    title: 'Earning a free month',
    body: (
      <>
        <p>You earn <strong>1 free month of Firdam Family</strong> for each family you invited that:</p>
        <ul>
          <li>verifies its email address,</li>
          <li>completes its family profile (a first name and at least one family member), and</li>
          <li>uses {SITE.name} on at least <strong>7 different days within its first 30 days</strong>.</li>
        </ul>
        <p>
          You can hold up to <strong>12 free months</strong> at a time. Each free month expires <strong>12 months</strong> after
          you earn it. Free months are used automatically when Firdam Family launches and your own subscription would
          renew. They have no cash value and can’t be transferred, sold or exchanged.
        </p>
      </>
    ),
  },
  {
    id: 'fair-play',
    title: 'Fair play',
    body: (
      <ul>
        <li>Share your link honestly: no spam, no fake accounts, no paying people to sign up, and no pretending to be {SITE.name}.</li>
        <li>
          We check for self-referrals (for example the same email written another way, or the same household). Those
          referrals are held for review; we may cancel rewards that break these terms.
        </li>
        <li>We never show you who the families you invited are: you only see numbers and anonymous progress.</li>
      </ul>
    ),
  },
  {
    id: 'cash',
    title: 'Cash rewards later',
    body: (
      <p>
        Cash rewards are not part of the programme yet. If we add them, we will publish new terms first and ask you to
        accept them before anything is paid.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Questions',
    body: <p>Email {email}. Terms version: {AMBASSADOR_TERMS_VERSION}.</p>,
  },
];

export default function AmbassadorTermsPage() {
  return (
    <LegalPage
      title="Ambassador Terms"
      updated="November 4, 2026"
      intro={
        <p>
          <strong>Draft.</strong> These terms explain how inviting families to {SITE.name} works and how you earn free months.
        </p>
      }
      summary={[
        'Invite new families with your personal link or code.',
        'Earn 1 free month for each family that is active on 7 different days in its first 30 days.',
        'Up to 12 free months at a time, each valid for 12 months. No cash value.',
        'Your own account and household never count.',
      ]}
      sections={sections}
    />
  );
}
