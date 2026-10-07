/**
 * Who runs Firdam and how to reach them. Used by the Privacy Policy, Terms,
 * Support page and footer — change it here once (e.g. after registering the
 * business or setting up email on your domain) and every page updates.
 */
export const SITE = {
  name: 'Firdam',
  url: 'https://firdamapp.vercel.app',
  /**
   * Who is legally responsible. Firdam isn't incorporated yet, so it's run by
   * its founder as an individual. After registering, change this to the
   * business name, e.g. "Firdam Inc., an Ontario corporation".
   */
  operator: 'the founder of Firdam, an individual based in Ontario, Canada (Firdam is not yet a registered business)',
  operatorShort: 'Firdam',
  province: 'Ontario',
  country: 'Canada',
  supportEmail: 'support@firdam.app',
  privacyEmail: 'privacy@firdam.app',
  /** Last time the Privacy Policy or Terms changed (shown on the pages). */
  legalUpdated: 'October 7, 2026',
} as const;
