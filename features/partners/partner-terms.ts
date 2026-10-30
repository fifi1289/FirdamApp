/** Founding partners list free until this date (also the default in Admin → Partner shops). */
export const FOUNDING_FREE_UNTIL = '2027-11-01';
export const FOUNDING_FREE_UNTIL_LABEL = 'November 1, 2027';

/** Change this whenever the terms change: each application keeps the version and exact text it agreed to. */
export const PARTNER_TERMS_VERSION = '2026-10-30';

/** The partner terms a shop agrees to, shown on firdam.com/partners. */
export const PARTNER_TERMS = [
  'Firdam can show your business name, logo, photos, description, discount and link on firdam.com and in the Firdam app.',
  'Firdam can also feature your business (name, logo, photos and discount) in its own promotion, such as social media posts, ads, videos and emails, to bring families to you. Photos are shown without faces, and you can ask us to stop at any time.',
  'Your information is accurate, and you are responsible for your products, orders, payment, delivery and returns. Firdam doesn’t sell anything itself.',
  'Your business, products and services are halal and suitable for Muslim families, and you treat Firdam families honestly and respectfully.',
  `Free for founding partners until ${FOUNDING_FREE_UNTIL_LABEL}. After that, Firdam never charges anything unless you agree in writing first, with at least 3 days’ notice.`,
  'You can end your listing at any time. Firdam can remove your listing at any time, with 3 days’ notice by email, if it decides your business no longer fits Firdam or its rules, and doesn’t have to give a reason. For serious problems (for example products that aren’t halal, false information or harm to families), Firdam can remove it right away.',
  'You offer an ongoing discount for Firdam families while you’re listed (you choose the amount) and honour it.',
];

/** The terms as one numbered text, saved with each application. */
export function partnerTermsText(): string {
  return PARTNER_TERMS.map((t, i) => `${i + 1}. ${t}`).join('\n');
}
