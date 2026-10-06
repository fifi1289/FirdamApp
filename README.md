# Firdam

**One home for your Muslim life.** Firdam brings halal living, faith and family together in one
calm, trusted web app: find halal food anywhere, plan halal meals, keep the family calendar,
pray on time, prepare for Ramadan, and budget with barakah.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

## Modules

| Area | Module | What it does |
| --- | --- | --- |
| Halal living | **Halal Places** | Halal groceries, butchers, restaurants, cafés and mosques near you (OpenStreetMap + community). Map and list, filters, ratings, "confirmed halal" reviews, saved places, add a place. |
| | **Meal Planner** | AI-assisted halal meal plans built around your pantry and preferences. |
| | **Groceries** | Lists filled from the meal plan minus what's in the pantry, sorted by aisle; move bought items to the pantry; share as text. |
| | **Pantry** | Household food inventory with expiry tracking. |
| Faith | **Prayer Times** | Daily times by calculation method and Asr school, Qibla compass, printable monthly timetable. |
| | **Ramadan** | Countdown and prep checklist, suhoor/iftar countdown and timetable, 30-day fast/taraweeh/Quran/charity tracker. |
| | **Quran & Duas** | Everyday duas with sources, favourites and dua of the day; Quran reading log with goal, streak and khatm progress. |
| Family | **Family** | Household member profiles. |
| | **Family Calendar** | Eid, Aqiqah, Nikah, birthdays, school events; Hijri dates and key Islamic days added automatically. |
| | **Planner** | Household tasks and goals. |
| Money | **Budget** | Category budgets, income/expenses, sadaqah and zakat records, savings goals (Hajj, Umrah, Eid…), zakat calculator. |

Also: real-data home dashboard, prayer and family-event browser reminders, data export, profile and
password settings, and a support/FAQ page.

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
| `OPENAI_API_KEY` | Supabase function secret | Used by `generate-meal-plan` and `meal-ai-planner` |

### Database

Apply the migrations in `supabase/migrations` (in filename order) with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste each new file into the Supabase SQL editor. Every table has row-level security; private
data is scoped to its owner, while Halal Places community places and reviews are shared with all
signed-in users.

> The recipe tables (`recipes`, `ingredients`, `cuisines`…) used by the Meal Planner live in the
> Supabase project and are not created by these migrations.

### Edge functions

```bash
supabase functions deploy prayer-times
supabase functions deploy halal-places
supabase functions deploy generate-meal-plan
supabase functions deploy meal-ai-planner
supabase secrets set OPENAI_API_KEY=sk-...
```

- `prayer-times` — prayer times, monthly/Hijri timetables and city search (Aladhan, Open-Meteo, Nominatim)
- `halal-places` — halal places from OpenStreetMap (Overpass) and address search (Nominatim)

Both use free public APIs; results are cached briefly in the function to stay within fair use.

## Checks

`npm run typecheck` and `npm run build` must pass. GitHub Actions (`.github/workflows/ci.yml`)
also applies every migration to a clean Postgres database and runs an RLS smoke test
(`supabase/tests/ci-smoke.sql`).

## Before launch

- Replace `support@firdam.app` in `app/support/page.tsx` and the footer with the real inbox.
- Add Privacy Policy and Terms pages (the footer has no legal links yet).
- Billing for the Premium / Family+ plans shown on the landing page is not implemented.
- Reminders are browser notifications shown while the app is open; background push needs a
  service worker and a push provider.
