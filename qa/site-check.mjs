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
  const errorScreen = /something went wrong|application error|unhandled runtime error|404|this page could not be found/i.test(bodyText);
  const shot = `${OUT}/shots/${label}-${slug(path)}.png`;
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  results.pages.push({ label, path, status, finalUrl, ms, overflowPx: overflow > 2 ? overflow : 0, errorScreen, errors, failed, shot });
  await page.close();
}

async function action(name, fn) {
  try {
    const note = await fn();
    results.actions.push({ name, ok: true, note: note ?? '' });
  } catch (e) {
    results.actions.push({ name, ok: false, note: String(e.message ?? e).split('\n')[0].slice(0, 300) });
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
  const go = async (p) => { await page.goto(SITE + p, { waitUntil: 'networkidle', timeout: 45000 }); await page.waitForTimeout(1200); };
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

  await action('Meal planner: quick plan from the library', async () => {
    await go('/dashboard/meals');
    const btn = page.getByRole('button', { name: /library|quick plan|plan my week/i }).first();
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(6000);
    await shot('meal-plan');
    const meals = await page.getByText(/breakfast|lunch|dinner/i).count();
    if (!meals) throw new Error('no meals shown after planning');
    return `${meals} meal labels shown`;
  });

  await action('Prayer times: times shown', async () => {
    await go('/dashboard/prayer-times');
    await shot('prayer');
    for (const p of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) await page.getByText(p).first().waitFor({ timeout: 8000 });
    return 'all five prayers listed';
  });

  await action('Halal places: results load', async () => {
    await go('/dashboard/halal-places');
    await page.waitForTimeout(5000);
    await shot('halal-places');
    const text = await page.locator('main').innerText().catch(() => '');
    if (/no places|nothing near|could not/i.test(text)) return `shows: ${text.match(/(no places|nothing near|could not)[^\n]*/i)?.[0]}`;
    return 'page loaded';
  });

  await action('Quran: open a surah', async () => {
    await go('/dashboard/quran');
    await page.waitForTimeout(3000);
    await shot('quran');
    const text = await page.locator('main').innerText().catch(() => '');
    if (!/fatiha|al-baqarah|surah/i.test(text)) throw new Error('no surah list');
    return 'surah list shown';
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
