/**
 * Public connection details for Firdam's Supabase project. These are designed
 * to be public (every browser that opens firdam.com receives them); the data is
 * protected by row-level security and two-step verification, not by hiding them.
 * They can be overridden with EXPO_PUBLIC_* environment variables.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://psxwslmsjdtfzneoujea.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzeHdzbG1zamR0ZnpuZW91amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDI2NTgsImV4cCI6MjA5OTcxODY1OH0.PwBjPd9BcHll38hjGaCMR6JVdwPulpApFsPokx0IpCQ';

/** The website, used for links such as password reset and the Privacy Policy. */
export const WEBSITE = 'https://firdam.com';
