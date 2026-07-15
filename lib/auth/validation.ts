import { z } from 'zod';

/**
 * Password strength rules shared by registration and password reset.
 * Enforces minimum length + at least one letter and one number, matching
 * the "Password strength" requirement on the register screen.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-zA-Z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const emailSchema = z
  .string()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.');

/** Score 0–4 for a password, used by the strength meter. */
export function passwordStrength(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  return score;
}

export const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
