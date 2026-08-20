#!/usr/bin/env node
/*  DARTYFORLIFE — pulls the live event list from Posh (group: dartyforlife)
    and rewrites events.json. Runs daily via .github/workflows/update-events.yml;
    every page loads events.json at runtime and falls back to the list baked
    into app.js if it's missing.

    Series classification (mirrors app.js):
      venue/name contains "stratus" → major (monthly headliners)
      venue is The Rack → tempe (the ASU lane's home bar, Old Town Scottsdale)
      venue/city/name contains "tempe" → tempe (DFL Tempe)
      everything else → bar (Darty Bars weekly, home base The 44)

    Ticket counter: counts.json (repo root) maps posh-slug → number going.
    Auto-refreshed each run from our own per-sale pipeline (Posh webhook →
    fan-out → Social Command Center → /api/public/going), merged into each
    event as `sold`. The site also polls that endpoint directly every 60s;
    this baked copy is the fallback so a dead endpoint never zeroes the count.

    Guards: exits non-zero WITHOUT touching events.json if the API is
    unreachable, the payload shape changes, or it returns zero events — a bad
    day at Posh must never wipe the calendar. */

import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://posh.vip/api/web/v2/util/group_url/dartyforlife';
const OUT = new URL('../events.json', import.meta.url);
const COUNTS = new URL('../counts.json', import.meta.url);

// Full browser fingerprint — Posh sits behind Cloudflare, which 403s bare
// datacenter requests (GitHub runners). A complete header set clears the
// basic managed check on this JSON endpoint without any third-party proxy.
const res = await fetch(API, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://posh.vip/g/dartyforlife',
    'Origin': 'https://posh.vip',
    'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  },
});
if (!res.ok) { console.error(`Posh API returned ${res.status}`); process.exit(1); }
const data = await res.json();
if (!Array.isArray(data.events)) { console.error('Payload has no events array. API shape changed?'); process.exit(1); }

let counts = {};
try { counts = JSON.parse(readFileSync(COUNTS, 'utf8')); } catch {}

/* ---- refresh counts.json from the going endpoint ----
   The endpoint anchors to Posh's own totalTicketsSold, so its numbers are
   authoritative in BOTH directions (refunds can lower a count). Matched by
   Posh event id, name as fallback. An unreachable endpoint or a zero keeps
   the last committed number (same never-wipe rule as the events guard). */
const GOING = 'https://social-command-center-lemon.vercel.app/api/public/going';
try {
  const g = await fetch(GOING, { headers: { Accept: 'application/json' } });
  const live = g.ok ? await g.json() : null;
  if (live && Array.isArray(live.events)) {
    const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const byPid = new Map(live.events.filter((e) => e.pid).map((e) => [String(e.pid), Number(e.going) || 0]));
    const byName = new Map(live.events.map((e) => [norm(e.name), Number(e.going) || 0]));
    for (const e of data.events) {
      if (!e || !e.url || !e.name) continue;
      const going = byPid.get(String(e.id || '')) ?? byName.get(norm(e.name));
      if (typeof going === 'number' && going > 0) counts[e.url] = going;
    }
    writeFileSync(COUNTS, JSON.stringify(counts, null, 2) + '\n');
  } else {
    console.warn(`going endpoint returned ${g.status}; keeping committed counts.json`);
  }
} catch (err) {
  console.warn(`going endpoint unreachable (${err.message}); keeping committed counts.json`);
}

function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/* Age policy, read from OUR OWN Posh copy — never assumed from the venue.
   Aiden writes "Ages 18 & over" / "Ages 21 & over" into every event
   description, so that text is the source of truth. It feeds the visible
   "Ages N & over" line and the typicalAgeRange in each Event JSON-LD, which
   is how a search engine learns an event is 18+. An event that states no
   age policy gets NO age claim anywhere: silence beats a wrong number. */
function readAge(e) {
  const hay = `${e.description || ''} ${e.shortDescription || ''}`;
  const m = hay.match(/\bages?\s*(18|21)\b/i) || hay.match(/\b(18|21)\s*\+/);
  return m ? Number(m[1]) : null;
}
// Venue-scoped with a word boundary: a loose "rack" also matches "track".
const TEMPE_VENUE = /\brack\b/;
function classify(e) {
  const hay = `${e.venue || ''} ${e.city || ''} ${e.title || ''}`.toLowerCase();
  if (hay.includes('stratus')) return 'major';
  if (TEMPE_VENUE.test((e.venue || '').toLowerCase())) return 'tempe';
  if (hay.includes('tempe')) return 'tempe';
  return 'bar';
}

// keep history light: only today onward (site hides past dates anyway)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });

// Hand-set overrides, keyed by Posh event id. They win over the feed so a
// call he makes (like a sold-out flyer) survives every hourly rebuild.
const LOCAL_OVERRIDES = {
  // BAR OCHO THURSDAY 2026-08-20: sold out, custom flyer served from our media
  '6a70d5305680fe48141212f0': { flyer: 'https://dartyforlife.com/media/flyers/bar-ocho-thursday-sold-out.jpg' },
};

const seen = new Set();
const events = data.events
  .filter(e => e && e.status === 'live' && e.url && e.name && typeof e.start === 'string')
  // `start` is venue-local wall clock with a fake Z suffix. Slice it, never Date-parse it.
  .map(e => {
    const venue = (e.venue && e.venue.name) ? String(e.venue.name) : '';
    const addr = (e.venue && e.venue.address) ? String(e.venue.address) : '';
    const ev = {
      sort: e.start,
      date: e.start.slice(0, 10),
      time: to12h(e.start.slice(11, 16)),
      // titles are injected via innerHTML on the site; strip anything tag-shaped
      title: e.name.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(),
      url: String(e.url),
      pid: String(e.id || ''), // Posh event id — exact live-count matching (same-name events collide)
      venue: venue.replace(/[<>]/g, ''),
      city: addr.split(',').slice(1, 3).join(',').replace(/[<>]/g, '').trim(),
      flyer: typeof e.flyer === 'string' && e.flyer.startsWith('https://images.posh.vip/') ? e.flyer : '',
      // full street address, kept whole so the schema builder can split it into
      // the streetAddress / locality / region / postalCode that Google wants
      addr,
      // Google lists endDate and description as recommended Event properties.
      // Both come straight from the Posh record, same as everything else here.
      end: typeof e.end === 'string' ? e.end.slice(0, 16) : '',
      desc: String(e.shortDescription || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(),
    };
    const age = readAge(e);
    if (age) ev.age = age;
    ev.series = classify(ev);
    const sold = counts[ev.url];
    if (typeof sold === 'number' && sold > 0) ev.sold = sold;
    Object.assign(ev, LOCAL_OVERRIDES[ev.pid] || {});
    return ev;
  })
  .filter(e => e.date >= today)
  .filter(e => (seen.has(e.url) ? false : seen.add(e.url)))
  .sort((a, b) => a.sort.localeCompare(b.sort))
  .map(({ sort, ...e }) => e);

if (events.length < 1) { console.error('Zero upcoming events from Posh. Refusing to overwrite.'); process.exit(1); }

/* ---- geocode venues (for the touring map) ----
   Nominatim, 1 req/sec, cached in scripts/geocache.json (committed) so each
   address is only ever looked up once. Failures are non-fatal: the site has
   hardcoded fallbacks for the home venues. */
const CACHE = new URL('./geocache.json', import.meta.url);
let geocache = {};
try { geocache = JSON.parse(readFileSync(CACHE, 'utf8')); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const ev of events) {
  const q = `${ev.venue}, ${ev.city}`.trim();
  if (!ev.venue || q.length < 8) continue;
  if (!(q in geocache)) {
    try {
      const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'dartyforlife-site-events/1.0 (contact@dartyforlife.com)' } });
      const j = g.ok ? await g.json() : [];
      geocache[q] = (Array.isArray(j) && j[0]) ? { lat: +j[0].lat, lng: +j[0].lon } : null;
    } catch { geocache[q] = null; }
    await sleep(1100);
  }
  if (geocache[q]) { ev.lat = geocache[q].lat; ev.lng = geocache[q].lng; }
}
try { writeFileSync(CACHE, JSON.stringify(geocache, null, 1) + '\n'); } catch {}

let previous = null;
try { previous = JSON.stringify(JSON.parse(readFileSync(OUT, 'utf8')).events); } catch {}
/* One .ics per event so the date on a card is a one-tap add-to-calendar.
   Runs BEFORE the no-change guard below: events.json can be identical while
   /cal is missing or stale (first run, a deleted file, a changed template),
   and these must never drift apart. Rewriting identical bytes is a no-op to git. */
const cal = await import('./ics.mjs');
const files = cal.writeIcsFiles(events, new URL('../cal/', import.meta.url));
console.log(`Wrote ${files.length} calendar files.`);

if (previous === JSON.stringify(events)) { console.log(`No changes (${events.length} events).`); process.exit(0); }

writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), source: API, events }, null, 1) + '\n');
console.log(`Wrote ${events.length} upcoming events.`);
