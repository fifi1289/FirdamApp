/** Countries with a Newcomer plan. Canada first; more countries are added here. */
import { CANADA } from './newcomer-canada';
import type { NewcomerCountry } from './newcomer-core';

export const NEWCOMER_COUNTRIES: NewcomerCountry[] = [CANADA];

export const newcomerCountry = (code: string | null | undefined): NewcomerCountry =>
  NEWCOMER_COUNTRIES.find((c) => c.code === code) ?? CANADA;
