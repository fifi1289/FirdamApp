import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/features/legal/legal-page';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Terms of Use',
  description: 'The rules for using Firdam, including subscriptions, halal information and AI features.',
};

const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'About these Terms',
    body: (
      <>
        <p>
          These Terms are an agreement between you and {SITE.operator} (“{SITE.name}”, “we”, “us”). By creating an account
          or using {SITE.name} you agree to them and to our <Link href="/privacy">Privacy Policy</Link>. If you don’t
          agree, please don’t use the app.
        </p>
        <p>
          If {SITE.name} becomes a registered business, that business will take over these Terms and we will update this
          page.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>Give accurate information and keep your password private. You’re responsible for activity on your account.</li>
        <li>
          If you share a household, the people you invite can see and change the shared parts of it. Only invite people
          you trust; you can remove them at any time.
        </li>
        <li>Tell us at {email} if you think someone else has used your account.</li>
      </ul>
    ),
  },
  {
    id: 'plans',
    title: 'Plans, trials and payments',
    body: (
      <>
        <ul>
          <li>
            {SITE.name} has a Free plan and a paid plan, Firdam Family. What each plan includes, and its price, is
            shown on the Upgrade page when you subscribe.
          </li>
          <li>
            Paid plans may start with a free trial. Unless you cancel before the trial ends, your subscription starts
            and you are charged automatically.
          </li>
          <li>
            Subscriptions <strong>renew automatically</strong> each month or year until you cancel. You can cancel any
            time from Settings (Manage subscription); you keep access until the end of the period you’ve paid for.
          </li>
          <li>
            Payments are processed by Stripe. Prices may include or exclude taxes depending on where you live, as shown at
            checkout.
          </li>
          <li>
            Except where the law requires otherwise, payments are non-refundable and we don’t give refunds for partly used
            periods. If something went wrong, email {email} — we’ll always look at it fairly.
          </li>
          <li>
            If we change a price, we’ll tell you at least 30 days before your next renewal, and you can cancel before it
            applies.
          </li>
          <li>
            AI features have monthly or daily limits (for example AI meal plans, Companion messages and receipt scans) so
            the service stays affordable for everyone. Current limits are shown in the app.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'halal',
    title: 'Halal information — please read',
    body: (
      <>
        <p>
          {SITE.name} helps you find halal food, but <strong>we are not a halal certification body</strong> and we don’t
          inspect any business.
        </p>
        <ul>
          <li>
            Halal places come from OpenStreetMap and from members, and reviews and “confirmed halal” votes are members’
            own opinions. Information can be out of date or wrong.
          </li>
          <li>
            Recipes are written to use halal ingredients, but you are responsible for choosing halal-certified products
            (meat, gelatin, cheese, stock, flavourings and so on) where it matters to you.
          </li>
          <li>When in doubt, ask the business for its certification or ask a trusted local authority.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'faith',
    title: 'Prayer times and religious content',
    body: (
      <ul>
        <li>
          Prayer times, the Qibla direction and Ramadan dates are calculated using standard methods and your location.
          They can differ from your local mosque’s timetable or moon-sighting decision — please follow your local mosque
          or scholar where they differ.
        </li>
        <li>
          Duas and religious content are provided for convenience with their sources. The Family Companion is an AI
          assistant, not a scholar: it does not give fatwas. Ask a qualified scholar for personal religious rulings.
        </li>
      </ul>
    ),
  },
  {
    id: 'food-health',
    title: 'Food, allergies and health',
    body: (
      <ul>
        <li>
          Allergen and diet labels on recipes are worked out automatically from the ingredient names and may miss
          something. <strong>Always read the labels on the products you use</strong>, especially for serious allergies.
        </li>
        <li>
          Nutrition figures are estimates. {SITE.name} doesn’t give medical or dietary advice — talk to a doctor or
          dietitian about your health needs.
        </li>
        <li>Follow normal food-safety practice when cooking and storing food.</li>
      </ul>
    ),
  },
  {
    id: 'money',
    title: 'Budget and zakat tools',
    body: (
      <p>
        The budget, savings and zakat tools are for your own planning. The zakat calculator uses common methods and the
        values you enter; it isn’t a religious ruling or financial advice. For your specific situation, ask a qualified
        scholar or financial adviser.
      </p>
    ),
  },
  {
    id: 'ai',
    title: 'AI features',
    body: (
      <ul>
        <li>
          AI features (the Family Companion, AI meal plans and receipt scanning) can make mistakes. Check what they
          produce before relying on it — for example, review scanned receipt items before adding them to your pantry.
        </li>
        <li>
          When the Companion adds tasks, events, shopping items or pantry changes for you, it does so because you asked;
          you can change or undo them in the app.
        </li>
        <li>Don’t use the AI features to create anything unlawful, harmful or misleading.</li>
      </ul>
    ),
  },
  {
    id: 'content',
    title: 'Your content and the community',
    body: (
      <>
        <p>
          You own what you add to {SITE.name}. To run the app, you give us permission to store, process and display your
          content — privately to you and your household, or to other members when you choose to share it (public
          recipes, halal places, reviews, community events and business listings). This permission ends when you delete
          the content or your account, except for copies other members already saved for their own use.
        </p>
        <p>When you share with the community:</p>
        <ul>
          <li>Be honest — reviews and “confirmed halal” votes should reflect your real experience.</li>
          <li>Business listings must be accurate and submitted by the business or with its permission.</li>
          <li>Only share content you have the right to share (don’t copy recipes or photos you don’t own).</li>
          <li>Be respectful. No hate, harassment, spam or misleading content.</li>
        </ul>
        <p>We may review, refuse or remove shared content that breaks these Terms.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Things you must not do',
    body: (
      <ul>
        <li>break the law, or use {SITE.name} to harm, harass or deceive others;</li>
        <li>try to access other people’s accounts or data, or get around plan limits or security;</li>
        <li>copy, scrape or resell the app or its recipe library, or use automated tools to overload it;</li>
        <li>upload viruses or anything designed to damage the service.</li>
      </ul>
    ),
  },
  {
    id: 'third-parties',
    title: 'Businesses, travel agencies and other services',
    body: (
      <p>
        {SITE.name} shows businesses, travel agencies and places run by other people, and links to other websites and
        apps (such as maps and directions). We don’t endorse them, and we aren’t part of any deal you make with them —
        check them yourself before you book or buy. A “partner” badge means the business works with {SITE.name}, not that
        we guarantee its service.
      </p>
    ),
  },
  {
    id: 'ours',
    title: 'Our app',
    body: (
      <p>
        The {SITE.name} name, logo, design, software and our recipe library belong to us. You may use them only to use the
        app for yourself and your family. We may improve, change or stop features over time; if we stop a paid feature
        you rely on, we’ll tell you in advance.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your account',
    body: (
      <p>
        You can delete your account at any time in Settings. We may suspend or close an account that seriously or
        repeatedly breaks these Terms; where reasonable we’ll warn you first. If we close a paid account without good
        reason, we’ll refund the unused part of your subscription.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        We work hard to keep {SITE.name} useful and accurate, but it’s provided “as is”. To the extent the law allows, we
        don’t promise that it will always be available, error-free, or that its information (including halal status,
        prayer times, allergens, nutrition and AI answers) is complete or correct. Nothing in these Terms limits rights you
        have under consumer protection laws that can’t be waived, including Ontario’s <em>Consumer Protection Act</em>.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits on our responsibility',
    body: (
      <p>
        To the extent the law allows, we aren’t responsible for indirect or unforeseeable losses, or for losses caused by
        relying on halal, religious, allergen, health or financial information in the app, or by businesses and services
        run by others. Our total responsibility to you for any claim is limited to the amount you paid {SITE.name} in the
        12 months before the claim, or CA$50 if you haven’t paid anything. These limits don’t apply where the law doesn’t
        allow them (for example for losses caused by our gross negligence or wilful misconduct).
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms as {SITE.name} grows. We’ll show the date at the top and, for important changes, tell
        you in the app or by email at least 30 days before they apply. If you don’t agree, you can cancel and delete your
        account before then.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of the Province of {SITE.province} and the federal laws of {SITE.country}
        that apply there. Disputes will be handled by the courts of {SITE.province}, unless the consumer protection law
        where you live gives you the right to go to your local courts. Please contact us first — most problems can be
        solved quickly by talking.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        {SITE.name} — {email}. Privacy questions: <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          These Terms explain the rules for using {SITE.name}. We’ve tried to keep them short and clear. Please read the
          sections on halal information, prayer times, allergies and AI — they matter.
        </p>
      }
      summary={[
        'You must be 18 or older to have an account.',
        'Paid plans renew automatically; cancel any time in Settings and keep access until the period ends.',
        'Firdam is not a halal certifier — always check certification and product labels yourself.',
        'Prayer times, allergen labels and AI answers can be wrong; follow your local mosque, labels and professionals.',
        'You own your content; share honestly and respectfully.',
      ]}
      sections={sections}
    />
  );
}
