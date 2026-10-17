# Firdam site check — 2026-10-17T16:25:36.454Z

- Test account qa.1792253836963@firdam.com created.

## Pages: 58/60 clean

### app-laptop /dashboard/halal-places → /dashboard/halal-places (HTTP null, 46501 ms)
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- load: page.goto: Timeout 45000ms exceeded.
- request failed: 503 GET https://firdam.com/dashboard/shopping?_rsc=gxeze
- request failed: 503 GET https://firdam.com/dashboard/prayer-times?_rsc=gxeze
- request failed: 503 GET https://firdam.com/dashboard/pantry?_rsc=gxeze
- request failed: 503 GET https://firdam.com/dashboard/family?_rsc=gxeze
### app-laptop /dashboard/pantry → /dashboard/pantry (HTTP null, 46500 ms)
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- console: Failed to load resource: the server responded with a status of 503 ()
- load: page.goto: Timeout 45000ms exceeded.
- request failed: 503 GET https://firdam.com/dashboard/shopping?_rsc=vdp9g
- request failed: 503 GET https://firdam.com/dashboard/quran?_rsc=vdp9g
- request failed: 503 GET https://firdam.com/dashboard/ramadan?_rsc=vdp9g
- request failed: 503 GET https://firdam.com/dashboard/family?_rsc=vdp9g

## Redirects
- app-laptop /dashboard/upgrade → /dashboard
- app-phone /dashboard/upgrade → /dashboard

## Actions
- ❌ Shopping: add an item: page.goto: Timeout 45000ms exceeded. (at /dashboard/shopping)
- ✅ Pantry: add an item: item appears in the pantry
- ✅ Recipes: open a recipe: /dashboard/recipes/c-504bf9f0-5b7a-4e9f-a26c-a8b7c302218f
- ❌ Meal planner: quick plan from the library: locator.click: Timeout 8000ms exceeded. (at /dashboard/meals)
- ✅ Prayer times: choose a city, times shown: all five prayers listed for Ottawa
- ✅ Quran: surah list: surah list shown
- ✅ Planner: new task form: form opens
- ✅ Family: add member form: form opens
- ❌ Finance: add transaction form: locator.click: Timeout 6000ms exceeded. (at /dashboard/finance)
- ✅ Travel: new trip form: form opens
- ❌ Community: new event form: locator.click: Timeout 6000ms exceeded. (at /dashboard/community)
- ✅ Directory: add business form: form opens
- ✅ Halal places: add place form: form opens
- ✅ Planner: add a task: task appears
- ✅ Family: add a member: member appears
- ✅ Companion: page answers: opened (no message sent, to save AI credit)
- ✅ Delete the test account: deleted

## Slowest pages
- app-laptop /dashboard/halal-places: 46501 ms
- app-laptop /dashboard/pantry: 46500 ms
- app-laptop /dashboard/upgrade: 32490 ms
- app-phone /dashboard/upgrade: 32482 ms
- app-laptop /dashboard/recipes: 11264 ms
- app-phone /dashboard/recipes: 10781 ms