# DARTYFORLIFE — events site

A single-file website for your upcoming events, **integrated with Posh** for ticketing.
Everything lives in **`index.html`** (no build step, no dependencies). Open it in any
browser to view it.

---

## 🎟️ Posh integration (how it works)

Tickets are powered by your live Posh account. Two layers:

1. **Org storefront** — the nav / hero "Get Tickets" buttons open your full Posh
   storefront **`https://posh.vip/g/dartyforlife`** inside an on-site popup, so people
   browse + buy without leaving the site.
2. **Per-event checkout** — give an event its Posh **slug** and that event's "Get
   tickets" button opens *that event's* Posh page right inside the popup.

> ⚠️ Your old note said `posh.vip/dartyforlife` — that URL is dead. The real one is
> **`posh.vip/g/dartyforlife`** (with `/g/`). The site already uses the correct one.

### Wiring an event to Posh (10 seconds)
1. In Posh, open the event → **Share**, and copy its link, e.g.
   `https://posh.vip/e/`**`painttheworld`**
2. In `index.html`, find that event in the `EVENTS` list and set the **`posh`** field to
   the part after `/e/`:
   ```js
   { id:"mirage", name:"MIRAGE", tier:"major", date:"2026-06-20", posh:"your-slug-here", ... }
   ```
3. Done — its button now opens that event's checkout inline. Leave `posh:""` and it
   falls back to your storefront. **Don't guess slugs** — copy the real one.

### Want the exact Posh checkout widget instead?
In Posh: **Event → Settings → Embed**, copy the `<iframe …>` code, and paste it into
that event's **`poshEmbed`** field (as a backtick string). It overrides the slug.

---

## ✏️ Editing your events

Open `index.html`, scroll to the **`EVENTS`** array near the bottom (inside `<script>`).
Each event is one block:

```js
{ id:"meltdown", name:"MELTDOWN", tier:"major", date:"2026-08-01", kind:"Mid-summer major",
  venue:"Stratus Event Center", city:"Phoenix, AZ", posh:"", cta:{label:"Get tickets"} },
```

- **`id`** → any unique short word (no spaces).
- **`tier`** → `"major"` (headlining/paid), `"free"` (free/RSVP), or `"bar"` (The 44).
- **`date`** → `"YYYY-MM-DD"`. Past dates **auto-hide** from "Upcoming events."
- **`kind`** → the small line under the title.
- **`venue` / `city`** → use `"Revealed soon"` if it's still secret.
- **`posh`** → the event's Posh slug (see above). Empty = storefront fallback.

The hero **countdown** auto-targets your next `tier:"major"` event — no edits needed.

### Bar nights @ The 44
The two `tier:"bar"` entries are marked **`SAMPLE · EDIT`** on the page. Replace their
`name`/`date`/`kind` with your real weekly theme, **or delete both** to show only the
"theme drops 24h out — follow @dartyforlife" state.

---

## 🔢 Highlight numbers & photos
In **Highlights** (search `data-count`) edit the numbers. Drop real recap photos into the
gallery tiles (search `gtile`) by swapping each `<div class="gtile">…</div>` for
`<img src="your-photo.jpg" class="gtile">`.

---

## 🌐 Putting it online (pick one)
- **Easiest:** [app.netlify.com/drop](https://app.netlify.com/drop) → drag this folder in →
  live URL in seconds.
- **GitHub Pages / Vercel / Cloudflare Pages** also work — it's just static files.

> Posh checkout loads inside an iframe. That works on any normal `https://` host
> (Netlify, Vercel, etc.). It will **not** load if you just double-click the file
> (`file://`) — use the local server below or deploy it.

## 👀 Previewing locally
```
cd ~/dartyforlife-site
python3 -m http.server 4317
```
Then open <http://localhost:4317>.

---
*Built from your Summer 2026 calendar + brand notes. No invented event details or ticket
slugs — anything not yet confirmed is left as an editable placeholder.*


## Google Search Console

`google7b61c438c5a2dad6.html` at the site root verifies https://dartyforlife.com/ for cornishclaudebot@gmail.com. Never delete it; Google re-checks it.
