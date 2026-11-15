// Builds Firdam's places library ahead of time: finds the cities of Firdam's
// countries on OpenStreetMap (capitals and every city of 100,000 people or more)
// and queues them, so weekend programs and the halal map are ready there
// before anyone asks. The "Places sync" job then fetches the queued areas.
// Runs on GitHub Actions; needs SUPABASE_URL, SUPABASE_ANON_KEY, PLACES_SYNC_TOKEN.
const { SUPABASE_URL, SUPABASE_ANON_KEY, PLACES_SYNC_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PLACES_SYNC_TOKEN) {
  console.log('::notice::Skipping: PLACES_SYNC_TOKEN (and Supabase URL/key) are not set.');
  process.exit(0);
}
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
async function overpass(query) {
  let last;
  for (const server of SERVERS) {
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Firdam/1.0 (https://firdam.com)' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(600_000),
      });
      if (!res.ok) throw new Error(`${res.status} from ${new URL(server).host}`);
      const data = await res.json();
      if (!data.elements?.length) throw new Error(`empty from ${new URL(server).host}: ${data.remark ?? ''}`);
      return data.elements;
    } catch (e) {
      last = e;
      console.log(`  ${e.message}`);
    }
  }
  throw last;
}

// Firdam's countries for now: Canada, the United States, Morocco and the Arab countries.
const COUNTRIES = 'CA|US|MA|DZ|TN|LY|EG|SD|MR|SA|AE|QA|KW|BH|OM|YE|JO|LB|SY|IQ|PS|SO|DJ|KM';
const area = `area["ISO3166-1"~"^(${COUNTRIES})$"][admin_level=2]->.c;`;
// Big cities (2 million or more) get their whole area; the others (100,000 or more) their centre.
const big = await overpass(`[out:json][timeout:900];${area}node(area.c)["place"="city"]["population"~"^([2-9][0-9]{6}|[0-9]{8,})$"];out skel qt;`);
const rest = await overpass(`[out:json][timeout:900];${area}(node(area.c)["place"~"^(city|town)$"]["population"~"^[1-9][0-9]{5,}$"];node(area.c)["place"]["capital"="yes"];);out skel qt;`);
const cities = [
  ...big.map((e) => ({ lat: e.lat, lng: e.lon, big: true })),
  ...rest.map((e) => ({ lat: e.lat, lng: e.lon })),
];
console.log(`${big.length} big cities, ${rest.length} cities and capitals`);

const FN = `${SUPABASE_URL}/functions/v1/weekend-plan?sync=seed`;
let queued = 0;
for (let i = 0; i < cities.length; i += 400) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'x-sync-token': PLACES_SYNC_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cities: cities.slice(i, i + 400) }),
  }).then((r) => r.json());
  if (res.error) throw new Error(res.error);
  queued += res.queued;
}
console.log(`${queued} map areas queued`);
