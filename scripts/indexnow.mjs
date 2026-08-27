#!/usr/bin/env node
/*  DARTYFORLIFE, push URLs to IndexNow.

    Why: Google will not take a URL submission without Search Console, but
    IndexNow is open. One POST tells Bing (and therefore Copilot and the Bing
    side of ChatGPT search), DuckDuckGo, Yandex, Seznam and Naver that these
    pages changed. No account, no login, no key exchange beyond hosting the
    key file at the site root, which this repo does.

    HTTP 200 or 202 means accepted. 403 means the key file is not reachable
    at https://dartyforlife.com/<key>.txt, which is the only real failure
    mode here, so it is reported loudly rather than swallowed.

    Run after a deploy:  node scripts/indexnow.mjs                */

const KEY = '7a8788517a1530a382a5a05761135297';
const HOST = 'dartyforlife.com';

const URLS = [
  `https://${HOST}/`,
  `https://${HOST}/18-and-over-events-phoenix.html`,
  `https://${HOST}/majors.html`,
  `https://${HOST}/bars.html`,
  `https://${HOST}/tempe.html`,
  `https://${HOST}/best-places-to-go-out-tempe.html`,
  `https://${HOST}/rentals.html`,
];

// the key file must be live and match before any endpoint will accept the list
const probe = await fetch(`https://${HOST}/${KEY}.txt`).catch(() => null);
const probeBody = probe && probe.ok ? (await probe.text()).trim() : '';
if (probeBody !== KEY) {
  console.error(`Key file not live yet at https://${HOST}/${KEY}.txt (got ${probe ? probe.status : 'no response'}).`);
  console.error('Deploy first, then re-run. IndexNow will 403 until that file serves the key.');
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: URLS }),
});

console.log(`IndexNow responded ${res.status} ${res.statusText} for ${URLS.length} urls`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text().catch(() => ''));
  process.exit(1);
}
console.log('Accepted. Bing, DuckDuckGo, Yandex, Seznam and Naver have the list.');
