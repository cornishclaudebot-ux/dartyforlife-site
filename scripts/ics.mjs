/* ============================================================
   ICS CALENDAR FILES

   Writes one .ics per upcoming event into /cal so the date on an event
   card can be a plain link. That matters on iPhone: tapping a link to a
   real .ics served as text/calendar opens the Calendar "Add Event" sheet
   in ONE tap. A blob/data URL does not — Safari routes those through the
   Files app instead, which is three taps and a confused visitor.

   Called by update-events.mjs on every Posh pull, so the files stay in
   step with the calendar without anyone regenerating them by hand.
   ============================================================ */
import { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

/* Phoenix does not observe DST, so the offset is -0700 all year and a
   single STANDARD block describes the zone completely. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Phoenix',
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0700',
  'TZNAME:MST',
  'END:STANDARD',
  'END:VTIMEZONE'
];

export function slugify(ev) {
  if (ev.url) return String(ev.url).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return String(ev.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* RFC 5545 §3.3.11: backslash, semicolon and comma are escaped, newlines
   become literal \n. Getting this wrong silently corrupts the whole file. */
const esc = s => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/* RFC 5545 §3.1: content lines fold at 75 OCTETS, not characters, with a
   single leading space on each continuation. */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0, limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // never split a multi-byte character: back off to a lead byte
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((start ? ' ' : '') + bytes.slice(start, end).toString('utf8'));
    start = end; limit = 74; // continuations lose one octet to the space
  }
  return out.join('\r\n');
}

/* "8:00 PM" -> "200000". Returns null when the time is absent or unparseable
   so the caller can fall back to an all-day entry rather than invent a time. */
function toIcsTime(t) {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 1 || h > 12 || min > 59) return null;
  const pm = m[3].toLowerCase() === 'p';
  if (h === 12) h = 0;
  if (pm) h += 12;
  return String(h).padStart(2, '0') + String(min).padStart(2, '0') + '00';
}

const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildIcs(ev, { site = 'https://dartyforlife.com' } = {}) {
  const date = String(ev.date || '').replace(/-/g, '');
  if (date.length !== 8) return null;
  const time = toIcsTime(ev.time);
  const uid = `${ev.pid || slugify(ev)}@dartyforlife.com`;
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const tickets = ev.url ? `https://posh.vip/e/${ev.url}` : site;

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//DartyForLife//Events//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`
  ];

  if (time) {
    lines.push(`DTSTART;TZID=America/Phoenix:${date}T${time}`);
    /* Doors time is published; a closing time is not. Four hours is a
       calendar BLOCK so the entry has sensible length — it is deliberately
       not shown anywhere on the site as an end time. */
    lines.push('DURATION:PT4H');
  } else {
    lines.push(`DTSTART;VALUE=DATE:${date}`);
  }

  lines.push(`SUMMARY:${esc(ev.title || 'DartyForLife')}`);
  if (where) lines.push(`LOCATION:${esc(where)}`);
  if (ev.lat != null && ev.lng != null) lines.push(`GEO:${ev.lat};${ev.lng}`);
  lines.push(`DESCRIPTION:${esc(ev.time ? `Doors ${ev.time}. Tickets: ${tickets}` : `Tickets: ${tickets}`)}`);
  lines.push(`URL:${esc(tickets)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(fold).join('\r\n') + '\r\n';
}

/* DTSTAMP is "when this object was built", so it moves every run. Comparing
   without it lets us leave a file alone when nothing REAL changed — otherwise
   the hourly pull rewrites all four files, commits, and triggers a rebuild
   every hour forever. DTSTAMP then means what it should: last actual change. */
const withoutStamp = s => s.replace(/^DTSTAMP:.*\r?\n/m, '');

export function writeIcsFiles(events, dir) {
  mkdirSync(dir, { recursive: true });
  const written = new Set();
  for (const ev of events) {
    const body = buildIcs(ev);
    if (!body) continue;
    const name = `${slugify(ev)}.ics`;
    const target = new URL(name, dir);
    let prev = null;
    try { prev = readFileSync(target, 'utf8'); } catch {}
    if (!prev || withoutStamp(prev) !== withoutStamp(body)) writeFileSync(target, body);
    written.add(name);
  }
  // drop files for events that have rolled off, so /cal never serves a stale date
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.ics') && !written.has(f)) unlinkSync(new URL(f, dir));
    }
  } catch {}
  return [...written];
}
