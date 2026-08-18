#!/usr/bin/env node
/*  DARTYFORLIFE, bakes the live event list into the STATIC HTML.

    WHY THIS EXISTS
    Every event on this site used to exist only inside app.js. The served
    HTML shipped an empty `<div data-events>`, so a crawler that does not run
    JavaScript saw a page with a headline and no events on it. Google indexed
    4 URLs of this site and NONE of the three event pages (majors, bars,
    tempe) - verified with a site:dartyforlife.com query on 2026-08-15. An
    engine cannot recommend an event it never saw.

    So this script writes, at build time, into each page:
      1. real event cards inside the [data-events] container, and
      2. one Event JSON-LD node per event, with the age policy in
         typicalAgeRange and the address split into the fields Google wants.

    app.js still overwrites [data-events] on load (grid.innerHTML = ...), so
    a human with JS sees the exact same interactive page as before. The baked
    copy is purely what crawlers and AI assistants read. Nothing visual changes.

    Both edits sit between HTML comment markers and are rewritten in place, so
    running this repeatedly is idempotent. Run it after update-events.mjs.  */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const SITE = 'https://dartyforlife.com';

const { events = [], updated } = JSON.parse(readFileSync(new URL('events.json', ROOT), 'utf8'));

/* which grid each page shows, mirroring the data-series attributes in the HTML */
const PAGES = [
  { file: 'index.html', series: 'all' },
  { file: 'majors.html', series: 'major' },
  { file: 'bars.html', series: 'bar' },
  { file: 'tempe.html', series: 'tempe' },
  // the 18+ landing page: same age rule app.js applies, so the baked copy a
  // crawler reads and the live copy a person sees can never disagree
  { file: '18-and-over-events-phoenix.html', series: 'all', maxAge: 18 },
  // no event grid on these, they are here purely for the crawlable link block
  { file: 'rentals.html', series: 'none' },
  { file: 'texts.html', series: 'none' },
  // privacy.html is deliberately absent: it is a standalone page with no
  // nav-mount or footer-mount, so there is nothing here for it to bake.
];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* HTML back to plain text, for copying visible FAQ copy into JSON-LD */
const unesc = (s) => String(s ?? '').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* "2026-10-29" -> "Thursday, October 29, 2026". Built from the parts, never
   Date-parsed: a bare YYYY-MM-DD parses as UTC and can roll back a day here. */
function longDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  const wk = WK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${wk}, ${MONTHS[m - 1]} ${day}, ${y}`;
}

/* "4494 W Peoria Ave, Glendale, AZ 85302, USA" -> PostalAddress parts.
   Posh's own JSON-LD leaves locality, region and postalCode EMPTY and dumps
   everything into streetAddress, so a city-scoped query cannot place the
   event. Splitting it here is the whole point of hosting our own schema. */
function postalAddress(addr, city) {
  const parts = String(addr || '').split(',').map((s) => s.trim()).filter(Boolean);
  const out = { '@type': 'PostalAddress', addressCountry: 'US' };
  if (parts.length >= 3) {
    out.streetAddress = parts[0];
    out.addressLocality = parts[1];
    const sz = (parts[2].match(/([A-Z]{2})\s*(\d{5})?/) || []);
    if (sz[1]) out.addressRegion = sz[1];
    if (sz[2]) out.postalCode = sz[2];
  } else if (city) {
    // fall back to the "Glendale, AZ 85302" city string events.json already carries
    const m = city.match(/^(.*?),?\s*([A-Z]{2})\s*(\d{5})?$/);
    if (m) { out.addressLocality = m[1].trim(); out.addressRegion = m[2]; if (m[3]) out.postalCode = m[3]; }
  }
  return out;
}

function eventNode(ev) {
  const node = {
    '@type': 'Event',
    name: ev.title,
    startDate: `${ev.date}T${to24(ev.time)}:00-07:00`, // Arizona does not observe DST
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `https://posh.vip/e/${ev.url}`,
    location: {
      '@type': 'Place',
      name: ev.venue || undefined,
      address: postalAddress(ev.addr, ev.city),
    },
    organizer: { '@type': 'Organization', name: 'DartyForLife', url: SITE },
  };
  if (ev.lat && ev.lng) {
    node.location.geo = { '@type': 'GeoCoordinates', latitude: ev.lat, longitude: ev.lng };
  }
  if (ev.end) node.endDate = `${ev.end}:00-07:00`;
  if (ev.desc) node.description = ev.desc;
  if (ev.flyer) node.image = ev.flyer;
  /* No `offers` node. The Posh group endpoint returns ticket groups without
     prices, and a made-up price in schema is worse than no price at all.
     Real prices live on each Posh event page's own JSON-LD if this is ever
     worth a per-event fetch. */
  // ONLY stated from our own Posh copy. No age on the event = no claim here.
  if (ev.age) node.typicalAgeRange = `${ev.age}+`;
  return node;
}

/* "9:00 PM" -> "21:00" */
function to24(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '20:00';
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function card(ev) {
  const age = ev.age ? `<span class="seo-ev-age">Ages ${ev.age} &amp; over</span>` : '';
  const where = [ev.venue, ev.city].filter(Boolean).map(esc).join(', ');
  return `<article class="ev" data-series="${esc(ev.series)}">
      <h3><a href="https://posh.vip/e/${esc(ev.url)}">${esc(ev.title)}</a></h3>
      <p><time datetime="${esc(ev.date)}">${esc(longDate(ev.date))}</time>${ev.time ? `, ${esc(ev.time)}` : ''}</p>
      <p>${where}</p>
      ${age ? `<p>${age}</p>` : ''}
    </article>`;
}

const upcoming = events.filter((e) => e && e.date && e.url && e.title);

let touched = 0;
for (const { file, series, maxAge } of PAGES) {
  const path = new URL(file, ROOT);
  let html;
  try { html = readFileSync(path, 'utf8'); } catch { console.warn(`skip ${file} (missing)`); continue; }

  let list = series === 'all' ? upcoming
    : series === 'none' ? []
      : upcoming.filter((e) => e.series === series);
  if (maxAge) list = list.filter((e) => typeof e.age === 'number' && e.age <= maxAge);

  /* ---- 1. bake the cards into every [data-events] grid on the page ---- */
  const body = list.length
    ? list.map(card).join('\n')
    : '<p class="seo-ev-empty">Nothing on the calendar right now. New dates drop on Instagram first.</p>';
  const block = `<!--SEO:EVENTS-->\n${body}\n<!--/SEO:EVENTS-->`;

  const before = html;
  html = html.replace(
    /(<div[^>]*\bdata-events\b[^>]*>)(?:\s*<!--SEO:EVENTS-->[\s\S]*?<!--\/SEO:EVENTS-->\s*)?(<\/div>)/g,
    (_m, open, close) => `${open}${block}${close}`,
  );

  /* ---- 1a. crawlable internal links ----
     nav and footer are both injected by app.js (mount.outerHTML = ...), so
     the served HTML of every page except index.html contained NO internal
     links at all. Crawlers reached these pages through the homepage hero
     tabs or not at all. Baking the same links inside #footer-mount gives
     every page a real link graph; app.js replaces the whole element on load,
     so a human never sees this copy. */
  const NAVLINKS = [
    ['index.html', 'DartyForLife Phoenix'],
    ['majors.html', 'Headliner events'],
    ['bars.html', 'Darty Bars weekly nights'],
    ['tempe.html', 'DartyForLife Tempe'],
    ['18-and-over-events-phoenix.html', '18+ events in Phoenix'],
    ['rentals.html', 'Equipment rentals'],
    ['texts.html', 'Text alerts'],
  ];
  const navHtml = NAVLINKS.filter(([h]) => h !== file)
    .map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('\n      ');
  html = html.replace(
    /(<div id="footer-mount">)(?:[\s\S]*?)(<\/div>)|<div id="footer-mount"\s*\/?>/,
    `<div id="footer-mount"><nav aria-label="DartyForLife">\n      ${navHtml}\n    </nav></div>`,
  );

  /* ---- 1b. stamp the real rebuild date wherever the page asks for it ---- */
  const stamp = String(updated || '').slice(0, 10);
  if (stamp) {
    html = html.replace(
      /(<time id="seoUpdated"[^>]*datetime=")[^"]*("[^>]*>)[\s\S]*?(<\/time>)/,
      (_m, a, b, c) => `${a}${stamp}${b}${longDate(stamp)}${c}`,
    );
  }

  /* ---- 2. bake one JSON-LD graph of Events into <head> ----
     The FAQ nodes are read back OUT of the page's own markup rather than
     kept in a second list here. Google penalises FAQ schema that does not
     match the visible text, and two hand-maintained copies always drift. */
  const graph = list.map(eventNode);

  /* The pages that own these queries (Eventbrite's and Insomniac's faceted
     "18 and over" listings) all pair Event nodes with an ItemList that states
     the collection IS the list. Mirroring that on the 18+ page tells an
     engine this page is the answer, not just a page mentioning events. */
  if (maxAge && list.length) {
    graph.unshift({
      '@type': 'ItemList',
      name: `18+ events in Phoenix, ${list.length} upcoming`,
      numberOfItems: list.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: list.map((ev, i) => ({
        '@type': 'ListItem', position: i + 1, url: `https://posh.vip/e/${ev.url}`, name: ev.title,
      })),
    });
  }

  const faqs = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p><\/details>/g)]
    .map(([, q, a]) => ({
      '@type': 'Question',
      name: unesc(q),
      acceptedAnswer: { '@type': 'Answer', text: unesc(a) },
    }));
  if (faqs.length) graph.push({ '@type': 'FAQPage', mainEntity: faqs });
  const ld = graph.length
    ? `<!--SEO:LD-->\n<script type="application/ld+json">\n${JSON.stringify(
        { '@context': 'https://schema.org', '@graph': graph }, null, 1)}\n</script>\n<!--/SEO:LD-->\n`
    : '<!--SEO:LD--><!--/SEO:LD-->\n';

  html = /<!--SEO:LD-->[\s\S]*?<!--\/SEO:LD-->\n?/.test(html)
    ? html.replace(/<!--SEO:LD-->[\s\S]*?<!--\/SEO:LD-->\n?/, ld)
    : html.replace('</head>', `${ld}</head>`);

  if (html !== before) { writeFileSync(path, html); touched++; console.log(`baked ${list.length} events into ${file}`); }
  else console.log(`no change: ${file}`);
}

/* ---- 3. sitemap, generated so a new page can never be left out of it ----
   lastmod tracks the event feed for the pages whose content is the event
   list, because those genuinely change when the calendar changes. */
const eventsDay = String(updated || '').slice(0, 10);
const SITEMAP = [
  ['', 1.0, eventsDay],
  ['18-and-over-events-phoenix.html', 0.9, eventsDay],
  ['majors.html', 0.9, eventsDay],
  ['bars.html', 0.8, eventsDay],
  ['tempe.html', 0.8, eventsDay],
  ['rentals.html', 0.7, '2026-07-18'],
  ['texts.html', 0.5, '2026-08-03'],
  ['privacy.html', 0.2, '2026-08-03'],
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP.map(([p, pri, mod]) => `  <url>
    <loc>${SITE}/${p}</loc>
    <lastmod>${mod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${pri.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;
const smPath = new URL('sitemap.xml', ROOT);
let prevXml = ''; try { prevXml = readFileSync(smPath, 'utf8'); } catch {}
if (prevXml !== xml) { writeFileSync(smPath, xml); console.log(`sitemap.xml rewritten (${SITEMAP.length} urls)`); }

console.log(`render-seo: ${touched} file(s) updated from events.json (${updated}).`);
