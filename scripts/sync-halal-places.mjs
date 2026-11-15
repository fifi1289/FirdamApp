// Fetches places from OpenStreetMap for the map tiles people searched in and
// stores them in Firdam's database: halal places (halal-places function) and
// weekend outing places (weekend-plan function).
// Runs on GitHub Actions; needs SUPABASE_URL, SUPABASE_ANON_KEY, PLACES_SYNC_TOKEN.
const { SUPABASE_URL, SUPABASE_ANON_KEY, PLACES_SYNC_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PLACES_SYNC_TOKEN) {
  console.log('::notice::Skipping: PLACES_SYNC_TOKEN (and Supabase URL/key) are not set.');
  process.exit(0);
}
const FUNCTIONS = ['halal-places', 'weekend-plan'].map((f) => `${SUPABASE_URL}/functions/v1/${f}`);
const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'x-sync-token': PLACES_SYNC_TOKEN };
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  let last;
  for (let round = 0; round < 3; round++) {
    for (const server of SERVERS) {
      try {
        const res = await fetch(server, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Firdam/1.0 (https://firdam.com)' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(90_000),
        });
        if (!res.ok) throw new Error(`${res.status} from ${new URL(server).host}`);
        const data = await res.json();
        if (!data.elements?.length && data.remark && /timed out|runtime error/i.test(data.remark)) throw new Error(`busy: ${new URL(server).host}`);
        return data.elements ?? [];
      } catch (e) {
        last = e;
        console.log(`  ${e.message}`);
      }
    }
    await sleep(20_000 * (round + 1));
  }
  throw last;
}

let failed = 0, total = 0;
// GitHub runs scheduled jobs only every few hours, so each run keeps going for
// up to 25 minutes while areas are waiting.
const stopAt = Date.now() + 25 * 60_000;
for (let round = 0; Date.now() < stopAt; round++) {
let fetchedThisRound = 0;
for (const FN of FUNCTIONS) {
  const pending = await fetch(`${FN}?sync=pending`, { headers }).then((r) => r.json()).catch((e) => ({ error: e.message }));
  if (pending.error) {
    console.log(`${FN}: ${pending.error}`);
    continue;
  }
  console.log(`${FN.split('/').pop()}: ${pending.tiles.length} area(s) to fetch`);
  total += pending.tiles.length;
  for (const t of pending.tiles) {
    try {
      const elements = await overpass(t.query);
      const { query, ...tile } = t;
      const res = await fetch(`${FN}?sync=ingest`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tile, elements }),
      }).then((r) => r.json());
      console.log(`${t.tile}: ${res.stored ?? res.error} places`);
    } catch (e) {
      failed++;
      console.log(`${t.tile}: failed (${e.message})`);
    }
    fetchedThisRound++;
    await sleep(5_000); // be gentle with the public servers
    if (Date.now() > stopAt) break;
  }
}
if (!fetchedThisRound) break;
}
if (failed && failed === total) process.exit(1);
