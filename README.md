# Firdam

**One home for your Muslim life.** Firdam brings halal living, faith and family together in one
calm, trusted web app: find halal food anywhere, plan halal meals, keep the family calendar,
pray on time, prepare for Ramadan, and budget with barakah.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

## Modules

| Area | Module | What it does |
| --- | --- | --- |
| Assistant | **Family Companion** | AI assistant that knows your family's week, pantry, budget and prayer times, and can add tasks, events, shopping items and spending for you. |
| Halal living | **Halal Places** | Halal groceries, butchers, restaurants, cafés and mosques near you (OpenStreetMap + community). Map and list, filters, ratings, "confirmed halal" reviews, saved places, add a place. |
| | **Recipes** | Library of halal recipes with ingredients and steps, favourites, your own recipes; **What can I cook?** finds recipes from your pantry or what you type (no AI, free); add any recipe to the meal plan or shopping list. |
| | **Meal Planner** | AI-assisted halal meal plans built around your pantry and preferences. |
| | **Shopping** | Lists filled from the meal plan minus what's in the pantry, sorted by aisle; move bought items to the pantry; share as text. |
| | **Pantry** | Household food inventory with expiry tracking. |
| Faith | **Prayer Times** | Daily times by calculation method and Asr school, Qibla compass, printable monthly timetable. |
| | **Ramadan** | Countdown and prep checklist, suhoor/iftar countdown and timetable, 30-day fast/taraweeh/Quran/charity tracker. |
| | **Quran & Duas** | Everyday duas with sources, favourites and dua of the day; Quran reading log with goal, streak and khatm progress. |
| Family | **Family** | Member profiles and the **shared household** (Family+): invite family by email to share the calendar, shopping, tasks, meals and pantry. |
| | **Family Calendar** | Eid, Aqiqah, Nikah, Walima, birthdays, school events; Hijri dates and key Islamic days added automatically. |
| | **Planner** | Household tasks and goals. |
| Community & travel | **Travel** | Trips with halal food, mosques and travel agencies at the destination. |
| | **Directory** | Muslim-owned business listings (owners submit, admins approve; partner badges). |
| | **Community** | Local events (iftars, classes, Eid prayers) with RSVPs and reporting. |
| Money | **Finance** | Category budgets, income/expenses, sadaqah and zakat records, savings goals (Hajj, Umrah, Eid…), zakat calculator. |

Health and Learning are shown as "coming soon" and will follow the MVP.

Also: real-data home dashboard, prayer and family-event browser reminders, data export, profile and
password settings, support/FAQ page, and an admin page (`/admin`) for directory moderation.

### Plans

| | Free | Premium | Family+ |
| --- | --- | --- | --- |
| “What can I cook?” (pantry matching, no AI) | ✓ | ✓ | ✓ |
| Companion messages | — | 50 a day | 50 a day per person |
| Meal plans from the recipe library (no AI) | Unlimited | Unlimited | Unlimited |
| AI chef meal plans (3, 5 or 7 days) | 2 a month | 8 a month | 8 a month per person |
| Own recipes / trips / shopping lists | 3 / 1 / 2 | Unlimited | Unlimited |
| Receipt scanning into the pantry | — | 30 a month | 30 a month per person |
| Shared household (up to 8 people) | — | — | ✓ |

Paid AI caps are fair-use limits that keep OpenAI costs predictable. Limits are defined in `lib/plan/plan.ts` and enforced server-side for AI features
(`supabase/functions/_shared/plan.ts`) and for households (`create_household` RPC).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / hosting | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / hosting | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Admin client (never expose to the browser) |
| `OPENAI_API_KEY` | Supabase function secret | Companion and AI meal plans |
| `STRIPE_SECRET_KEY` | Supabase function secret | Checkout and billing portal (`billing`) |
| `STRIPE_WEBHOOK_SECRET` | Supabase function secret | Verifies Stripe events (`stripe-webhook`) |
| `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`, `STRIPE_PRICE_FAMILY_MONTHLY`, `STRIPE_PRICE_FAMILY_YEARLY` | Supabase function secrets | Stripe price IDs for each plan |
| `SITE_URL` | Supabase function secret | Where Stripe sends people back, e.g. `https://app.firdam.app` |

### Database

Apply the migrations in `supabase/migrations` (in filename order) with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste each new file into the Supabase SQL editor. Every table has row-level security; private
data is scoped to its owner, household items are shared with members of the same household, and
Halal Places community places and reviews are shared with all signed-in users. The recipe library
(204 halal recipes from 60 cuisines, each tagged with allergens and diets) is seeded by
`20261008101000_seed_recipe_library.sql`. To add or change recipes, edit the JSON files in
`supabase/seed/recipes/` and run `node --experimental-strip-types supabase/seed/build-recipes.mts`
(Node 22+). The script rejects non-halal ingredients and bad units, works out allergens and diet
tags from the ingredients, and rewrites the seed.

Recipe photos: in **Admin → Recipe photos**, upload images named after each recipe (the page can copy
the list of file names), or generate them with your OpenAI key (`supabase functions deploy recipe-images`).

To make someone an admin (directory moderation), run in the SQL editor:

```sql
insert into public.app_admins (user_id) select id from auth.users where email = 'you@example.com';
```

### Edge functions

**From the Supabase dashboard:** each file in `supabase/dashboard-functions/` is a single-file copy of a
function (shared code included). In Edge Functions, open (or create) the function with the same name,
replace its code with the file's contents and click Deploy. For `stripe-webhook`, turn off
"Enforce JWT verification". Regenerate the copies with `node supabase/build-dashboard-functions.mjs`.

**With the Supabase CLI:**

```bash
supabase functions deploy prayer-times
supabase functions deploy halal-places
supabase functions deploy generate-meal-plan
supabase functions deploy meal-ai-planner
supabase functions deploy companion
supabase functions deploy billing
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set OPENAI_API_KEY=sk-... STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... SITE_URL=https://...
```

In Stripe, create the four prices and add a webhook endpoint pointing to
`https://<project>.supabase.co/functions/v1/stripe-webhook` for `checkout.session.completed` and
`customer.subscription.*` events.

- `prayer-times` — prayer times, monthly/Hijri timetables and city search (Aladhan, Open-Meteo, Nominatim)
- `halal-places` — halal places and travel agencies from OpenStreetMap (Overpass) and address search (Nominatim)
- `companion` — the AI Family Companion (OpenAI, tool calling; can update the pantry)
- `receipt-scan` — reads a receipt photo into pantry items (OpenAI vision, paid plans)
- `delete-account` — Settings → Delete my account (cancels Stripe, hands over a shared household, deletes the user)
- `billing` / `stripe-webhook` — Stripe Checkout, customer portal and subscription sync

Prayer and places use free public APIs; results are cached briefly in the function to stay within fair use.

## Checks

`npm run typecheck` and `npm run build` must pass. GitHub Actions (`.github/workflows/ci.yml`)
also applies every migration to a clean Postgres database and runs an RLS smoke test
(`supabase/tests/ci-smoke.sql`).

## Security

- Security headers and a Content Security Policy are set in `next.config.js` — add any new third-party script or API host there.
- Row-level security on every table; `supabase/tests/ci-smoke.sql` checks isolation on every push.
- Two-step verification (TOTP): Settings → Account. Enforced by the middleware and by a restrictive policy on every table
  (`20261010100000_require_2fa_when_enabled.sql`). **Re-run that migration after creating new tables** so they get the policy too.
- Bot protection with Cloudflare Turnstile (free): create a widget at dash.cloudflare.com → Turnstile, set
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel and redeploy, **then** paste the secret key in Supabase → Authentication →
  Attack Protection → Enable CAPTCHA (Turnstile). Doing it in the other order blocks every sign-in.
- The zakat calculator stores its inputs only in the browser.

## Before launch

- Privacy Policy (`/privacy`) and Terms (`/terms`) read their operator name, province and contact emails from `lib/site.ts`; update it when the business is registered or the email addresses change.

- Add the Stripe and OpenAI secrets above; without them the Upgrade and Companion pages explain
  that setup isn't finished.
- Reminders are browser notifications shown while the app is open; background push needs a
  service worker and a push provider.
