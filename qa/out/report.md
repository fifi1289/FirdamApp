# Firdam site check — 2026-10-17T16:05:54.612Z

- Test account qa.1792252888015@firdam.com created.

## Pages: 58/60 clean

### public-laptop /terms → /terms (HTTP 200, 2767 ms)
- shows an error screen
### public-phone /terms → /terms (HTTP 200, 2258 ms)
- shows an error screen

## Redirects
- app-laptop /dashboard/upgrade → /dashboard
- app-phone /dashboard/upgrade → /dashboard

## Actions
- ✅ Shopping: add an item: item appears in the list
- ✅ Pantry: add an item: item appears in the pantry
- ✅ Recipes: open a recipe: /dashboard/recipes/c-504bf9f0-5b7a-4e9f-a26c-a8b7c302218f
- ❌ Meal planner: quick plan from the library: locator.click: Timeout 8000ms exceeded.
- ❌ Prayer times: times shown: locator.waitFor: Timeout 8000ms exceeded.
- ✅ Halal places: results load: page loaded
- ❌ Quran: open a surah: no surah list
- ✅ Companion: page answers: opened (no message sent, to save AI credit)
- ✅ Delete the test account: deleted

## Slowest pages
- app-laptop /dashboard/upgrade: 32555 ms
- app-phone /dashboard/upgrade: 32402 ms
- app-laptop /dashboard/recipes: 10612 ms
- app-phone /dashboard/recipes: 10443 ms
- app-laptop /dashboard: 4693 ms
- app-laptop /settings: 3684 ms