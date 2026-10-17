/**
 * Firdam website check (runs on GitHub Actions, see .github/workflows/site-check.yml).
 *
 * 1. Public pages: load, no errors, no sideways scrolling on a phone.
 * 2. Makes a throwaway account through Supabase (the website's sign-in has a
 *    Cloudflare bot check, so the robot signs in the way the phone app does),
 *    puts the session in the browser, then opens every dashboard page on a
 *    laptop and a phone screen, collecting JavaScript errors, failed requests
 *    and screenshots.
 * 3. Tries the main actions (shopping item, pantry item, family member…).
 * 4. Deletes the account again.
 *
 * Writes qa/out/report.json, qa/out/report.md and screenshots.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const SITE = process.env.SITE_URL ?? 'https://firdam.com';
const SUPABASE_URL = 'https://psxwslmsjdtfzneoujea.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY;
const REF = 'psxwslmsjdtfzneoujea';
const OUT = 'qa/out';
mkdirSync(`${OUT}/shots`, { recursive: true });

const PUBLIC = ['/', '/privacy', '/terms', '/security', '/support', '/auth/login', '/auth/register', '/auth/forgot-password'];
const APP = [
  '/dashboard', '/dashboard/companion', '/dashboard/halal-places', '/dashboard/recipes', '/dashboard/meals',
  '/dashboard/shopping', '/dashboard/pantry', '/dashboard/prayer-times', '/dashboard/ramadan', '/dashboard/quran',
  '/dashboard/family', '/dashboard/calendar', '/dashboard/planner', '/dashboard/learning', '/dashboard/health',
  '/dashboard/community', '/dashboard/travel', '/dashboard/directory', '/dashboard/finance', '/dashboard/upgrade',
  '/settings', '/profile',
];

const results = { site: SITE, startedAt: new Date().toISOString(), pages: [], actions: [], notes: [] };
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-'));

// Third-party noise we don't own (analytics blockers, map tiles hiccups…).
const IGNORE = [/googletagmanager|google-analytics|doubleclick/i, /challenges\.cloudflare\.com/i, /favicon/i, /tile\.openstreetmap/i];
const ignored = (s) => IGNORE.some((r) => r.test(s));

async function api(path, init = {}, token) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: ANON, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

function sessionCookies(session) {
  const json = JSON.stringify(session);
  const value = 'base64-' + Buffer.from(json, 'utf8').toString('base64url');
  const name = `sb-${REF}-auth-token`;
  const host = new URL(SITE).hostname;
  const base = { domain: host, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' };
  if (value.length <= 3180) return [{ ...base, name, value }];
  const parts = [];
  for (let i = 0, n = 0; i < value.length; i += 3180, n++) parts.push({ ...base, name: `${name}.${n}`, value: value.slice(i, i + 3180) });
  return parts;
}

async function visit(context, path, label) {
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(`JS error: ${e.message}`.slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !ignored(m.text())) errors.push(`console: ${m.text()}`.slice(0, 400)); });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && !ignored(u)) failed.push(`${r.status()} ${r.request().method()} ${u.replace(SUPABASE_URL, 'supabase').slice(0, 200)}`);
  });
  const t0 = Date.now();
  let status = null;
  let finalUrl = null;
  try {
    const res = await page.goto(SITE + path, { waitUntil: 'networkidle', timeout: 45000 });
    status = res?.status() ?? null;
  } catch (e) {
    errors.push(`load: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(1500);
  finalUrl = page.url().replace(SITE, '');
  const ms = Date.now() - t0;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000);
  const errorScreen = /application error: a client-side exception|unhandled runtime error|this page could not be found|^404$/im.test(bodyText);
  const shot = `${OUT}/shots/${label}-${slug(path)}.png`;
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  results.pages.push({ label, path, status, finalUrl, ms, overflowPx: overflow > 2 ? overflow : 0, errorScreen, errors, failed, shot });
  await page.close();
}

let failPage = null;
async function action(name, fn) {
  try {
    const note = await fn();
    results.actions.push({ name, ok: true, note: note ?? '' });
  } catch (e) {
    const file = `${OUT}/shots/FAILED-${slug('/' + name)}.png`;
    if (failPage) await failPage.screenshot({ path: file }).catch(() => {});
    const url = failPage ? failPage.url().replace(SITE, '') : '';
    results.actions.push({ name, ok: false, note: `${String(e.message ?? e).split('\n')[0].slice(0, 300)} (at ${url})` });
  }
}

const browser = await chromium.launch();
const laptop = { viewport: { width: 1366, height: 860 } };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// 1. Public pages
for (const [label, opts] of [['laptop', laptop], ['phone', phone]]) {
  const ctx = await browser.newContext(opts);
  for (const p of PUBLIC) await visit(ctx, p, `public-${label}`);
  await ctx.close();
}

// 2. Test account
const email = `qa.${Date.now()}@firdam.com`;
const password = `Qa!${Math.random().toString(36).slice(2)}Aa9`;
let session = null;
const signup = await api('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password, data: { first_name: 'QA', last_name: 'Robot' } }) });
if (signup.body?.access_token) session = signup.body;
else {
  const login = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (login.body?.access_token) session = login.body;
  else results.notes.push(`Could not create a test account: signup ${signup.status} ${JSON.stringify(signup.body).slice(0, 300)}; login ${login.status} ${JSON.stringify(login.body).slice(0, 300)}`);
}

if (session) {
  session.expires_at ??= Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  results.notes.push(`Test account ${email} created.`);
  for (const [label, opts] of [['laptop', laptop], ['phone', phone]]) {
    const ctx = await browser.newContext(opts);
    await ctx.addCookies(sessionCookies(session));
    for (const p of APP) await visit(ctx, p, `app-${label}`);
    await ctx.close();
  }

  // 3. Main actions, through the website
  const ctx = await browser.newContext(laptop);
  await ctx.addCookies(sessionCookies(session));
  const page = await ctx.newPage();
  failPage = page;
  const slug2 = slug;
  // 'load', not 'networkidle': pages with live updates (shopping) keep a connection open.
  const go = async (p) => { await page.goto(SITE + p, { waitUntil: 'load', timeout: 45000 }); await page.waitForTimeout(3500); };
  const shot = (n) => page.screenshot({ path: `${OUT}/shots/action-${n}.png` }).catch(() => {});

  await action('Shopping: add an item', async () => {
    await go('/dashboard/shopping');
    const input = page.getByPlaceholder(/add|item|milk|eggs/i).first();
    await input.fill('QA test dates');
    await input.press('Enter');
    await page.waitForTimeout(2000);
    await shot('shopping-add');
    await page.getByText('QA test dates', { exact: false }).first().waitFor({ timeout: 8000 });
    return 'item appears in the list';
  });

  await action('Pantry: add an item', async () => {
    await go('/dashboard/pantry');
    const input = page.getByPlaceholder(/add|rice|eggs|item/i).first();
    await input.fill('2 kg QA rice');
    await input.press('Enter');
    await page.waitForTimeout(2500);
    await shot('pantry-add');
    await page.getByText(/QA rice/i).first().waitFor({ timeout: 8000 });
    return 'item appears in the pantry';
  });

  await action('Recipes: photo weight on the list page', async () => {
    let bytes = 0, count = 0;
    const onResp = async (r) => {
      if (r.request().resourceType() !== 'image') return;
      const len = Number(r.headers()['content-length'] ?? 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
      bytes += len; count += 1;
    };
    page.on('response', onResp);
    await page.goto(SITE + '/dashboard/recipes', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    page.off('response', onResp);
    const probe = await fetch(`${SUPABASE_URL}/storage/v1/render/image/public/recipe-images/does-not-exist.webp?width=400`);
    return `${count} images, ${(bytes / 1048576).toFixed(1)} MB; image resizing endpoint answers ${probe.status}`;
  });

  await action('Recipes: open a recipe', async () => {
    await go('/dashboard/recipes');
    const card = page.locator('a[href*="/dashboard/recipes/"]').first();
    await card.waitFor({ timeout: 10000 });
    await card.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await shot('recipe-open');
    await page.getByText(/ingredients/i).first().waitFor({ timeout: 8000 });
    return page.url().replace(SITE, '');
  });

  await action('Meal planner: plan a week from the recipe library', async () => {
    await go('/dashboard/meals');
    await page.getByRole('button', { name: /generate new meal plan/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await shot('meal-preferences');
    // Use the free recipe library, not the AI chef (saves AI credit).
    const ai = page.getByRole('switch').filter({ hasText: /ai/i }).first();
    const aiAny = (await ai.count()) ? ai : page.getByRole('switch', { name: /ai|chef/i }).first();
    if ((await aiAny.count()) && (await aiAny.getAttribute('aria-checked')) === 'true') await aiAny.click();
    const t0 = Date.now();
    await page.getByRole('button', { name: /generate|create (my )?plan|plan my week/i }).last().click({ timeout: 8000 });
    await page.getByText(/generating your meal plan/i).first().waitFor({ state: 'detached', timeout: 90000 }).catch(() => {});
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    await page.waitForTimeout(2000);
    await shot('meal-plan');
    const meals = await page.getByText(/breakfast|lunch|dinner/i).count();
    if (meals < 3) throw new Error(`only ${meals} meal labels after ${secs}s`);
    return `${meals} meal labels shown after ${secs}s`;
  });

  await action('Prayer times: choose a city, times shown', async () => {
    await go('/dashboard/prayer-times');
    const search = page.getByPlaceholder(/search a city/i).first();
    await search.fill('Ottawa');
    await page.waitForTimeout(2500);
    await page.getByRole('option').first().click({ timeout: 6000 }).catch(async () => {
      await page.getByText(/Ottawa,?\s/i).first().click({ timeout: 6000 });
    });
    await page.waitForTimeout(2500);
    await shot('prayer');
    for (const p of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) await page.getByText(p).first().waitFor({ timeout: 8000 });
    return 'all five prayers listed for Ottawa';
  });

  await action('Quran: surah list', async () => {
    await go('/dashboard/quran');
    await page.getByRole('tab', { name: /quran reading/i }).click({ timeout: 6000 }).catch(() => page.getByText(/quran reading/i).first().click());
    await page.waitForTimeout(3000);
    await shot('quran');
    await page.getByText(/fatiha/i).first().waitFor({ timeout: 8000 });
    return 'surah list shown';
  });

  // Each module's main "add" button should open a form without errors.
  const opens = [
    ['Planner: new task form', '/dashboard/planner', /new task|add task/i],
    ['Family: add member form', '/dashboard/family', /add (a )?(family )?member/i],
    ['Finance: add transaction form', '/dashboard/finance', /add entry|add (a )?transaction/i],
    ['Travel: new trip form', '/dashboard/travel', /new trip|plan a trip|add (a )?trip|create (a )?trip/i],
    ['Community: new event form', '/dashboard/community', /share an event|new event/i],
    ['Directory: add business form', '/dashboard/directory', /add (your |a )?business|list (your )?business/i],
    ['Halal places: add place form', '/dashboard/halal-places', /add (a )?(halal )?place|suggest/i],
  ];
  for (const [name, path, label] of opens) {
    await action(name, async () => {
      await go(path);
      const btn = page.getByRole('button', { name: label }).first();
      await btn.click({ timeout: 6000 });
      await page.getByRole('dialog').first().waitFor({ timeout: 6000 });
      await shot(slug(path) + '-form');
      await page.keyboard.press('Escape');
      return 'form opens';
    });
  }

  await action('Planner: add a task', async () => {
    await go('/dashboard/planner');
    await page.getByRole('button', { name: /new task|add task/i }).first().click({ timeout: 6000 });
    await page.getByPlaceholder(/what do you need to do/i).fill('QA robot task');
    await page.getByRole('dialog').getByRole('button', { name: /add|create|save/i }).last().click();
    await page.waitForTimeout(2500);
    await shot('planner-task');
    await page.getByText('QA robot task').first().waitFor({ timeout: 8000 });
    return 'task appears';
  });

  await action('Family: add a member', async () => {
    await go('/dashboard/family');
    await page.getByRole('button', { name: /add (a )?(family )?member/i }).first().click({ timeout: 6000 });
    await page.getByPlaceholder(/e\.g\. aisha/i).fill('Robot Kid');
    const rel = page.getByRole('combobox').first();
    if (await rel.count()) { await rel.click(); await page.getByRole('option').first().click(); }
    await page.getByRole('dialog').getByRole('button', { name: /add|save|create/i }).last().click();
    await page.waitForTimeout(2500);
    await shot('family-add');
    await page.getByText('Robot Kid').first().waitFor({ timeout: 8000 });
    return 'member appears';
  });

  await action('Companion: page answers', async () => {
    await go('/dashboard/companion');
    await shot('companion');
    return 'opened (no message sent, to save AI credit)';
  });

  await page.close();
  await ctx.close();

  // 4. Delete the test account (tests the deletion function too)
  await action('Delete the test account', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return 'deleted';
  });
}

await browser.close();

// Report
results.finishedAt = new Date().toISOString();
writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
const bad = results.pages.filter((p) => p.errors.length || p.failed.length || p.overflowPx || p.errorScreen || (p.status && p.status >= 400));
const lines = [
  `# Firdam site check — ${results.finishedAt}`,
  '',
  ...results.notes.map((n) => `- ${n}`),
  '',
  `## Pages: ${results.pages.length - bad.length}/${results.pages.length} clean`,
  '',
  ...bad.map((p) =>
    [
      `### ${p.label} ${p.path} → ${p.finalUrl} (HTTP ${p.status}, ${p.ms} ms)`,
      p.errorScreen ? '- shows an error screen' : '',
      p.overflowPx ? `- page is ${p.overflowPx}px wider than the screen (sideways scrolling)` : '',
      ...p.errors.map((e) => `- ${e}`),
      ...p.failed.map((f) => `- request failed: ${f}`),
    ].filter(Boolean).join('\n'),
  ),
  '',
  '## Redirects',
  ...results.pages.filter((p) => p.finalUrl && p.finalUrl.split('?')[0] !== p.path).map((p) => `- ${p.label} ${p.path} → ${p.finalUrl}`),
  '',
  '## Actions',
  ...results.actions.map((a) => `- ${a.ok ? '✅' : '❌'} ${a.name}: ${a.note}`),
  '',
  '## Slowest pages',
  ...[...results.pages].sort((a, b) => b.ms - a.ms).slice(0, 6).map((p) => `- ${p.label} ${p.path}: ${p.ms} ms`),
];
writeFileSync(`${OUT}/report.md`, lines.join('\n'));
console.log(lines.join('\n'));
