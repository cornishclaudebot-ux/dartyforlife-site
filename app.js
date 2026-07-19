/* ============================================================
   DARTYFORLIFE — shared app logic + data (all pages)
   Chrome (nav/footer/modal) is JS-mounted like the44.live.
   Events auto-refresh daily: a GitHub Action rewrites events.json
   from the Posh API; this file fetches it at runtime and merges it
   over the baked-in fallback below. window.DFL exports the beat
   clock for the canvas FX modules.
   ============================================================ */
'use strict';

const CONFIG = {
  posh:    "https://posh.vip/g/dartyforlife",
  ig:      "https://instagram.com/dartyforlife",
  tt:      "https://tiktok.com/@dartyforlife",
  fb:      "https://facebook.com/dartyforlife",
  email:   "contact@dartyforlife.com",
  stratus: "4344 W Indian School Rd, Phoenix, AZ 85031",
  the44:   "4494 W Peoria Ave, Glendale, AZ 85302"
};
CONFIG.mapStratus      = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CONFIG.stratus);
CONFIG.mapStratusApple = "https://maps.apple.com/?q=" + encodeURIComponent(CONFIG.stratus);
CONFIG.map44           = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CONFIG.the44);

/* ---- inline SVG icons (no emojis) ---- */
const IC = {
  ig:'<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 5 5 .06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.2 3.3-1.7 4.8-5 5-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.2-4.8-1.7-5-5C2.04 15.6 2 15.2 2 12s0-3.6.07-4.9c.2-3.3 1.7-4.8 5-5C8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-9.4a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>',
  tt:'<svg viewBox="0 0 24 24"><path d="M16.5 5.8a4.8 4.8 0 01-3-1.3v8.8a5.5 5.5 0 11-5.5-5.5c.3 0 .6 0 .8.07v2.8a2.7 2.7 0 102 2.6V2h2.7a4.8 4.8 0 003 4.2z"/></svg>',
  fb:'<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0022 12z"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><path d="M7 2v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2zm12 8v10H5V10z"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

/* ============================================================
   SERIES — the three lines of the brand
   major = monthly headliners · bar = Darty Bars weekly · tempe = DFL Tempe
   ============================================================ */
const SERIES = {
  major:{ label:"Headliner",  page:"majors.html" },
  bar:  { label:"Darty Bars", page:"bars.html"   },
  tempe:{ label:"Tempe",      page:"tempe.html"  }
};
function classify(ev){
  const hay = ((ev.venue||"") + " " + (ev.city||"") + " " + (ev.title||"")).toLowerCase();
  if(ev.series) return ev.series;                    // explicit wins
  if(hay.includes("stratus")) return "major";
  if(hay.includes("tempe"))   return "tempe";
  return "bar";
}

/* ============================================================
   FALLBACK EVENTS — used until events.json loads (and merged
   with it). Announced events not on Posh yet keep url:"" →
   ticket buttons open the storefront. Don't guess slugs.
   ============================================================ */
let EVENTS = [
  { date:"2026-07-25", time:"8:00 PM", title:"GOLDEN TEACHER", url:"golden-teacher",
    venue:"Stratus Event Center", city:"Phoenix, AZ", series:"major",
    flyer:"https://images.posh.vip/originals/6a3c81d0955f42fa57977681" },
  /* Posh drafts (visible in the dashboard) — Get Notified until they go live.
     Real events only, ever. Nothing goes in this list that isn't in Posh. */
  { date:"2026-09-05", time:"8:00 PM", title:"SOLAR SPUR", url:"",
    venue:"Stratus Event Center", city:"Phoenix, AZ", series:"major" },
  { date:"2026-10-29", time:"7:00 PM", title:"FEAR FOREST", url:"",
    venue:"Stratus Event Center", city:"Phoenix, AZ", series:"major" }
];

/* ============================================================
   HELPERS
   ============================================================ */
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const WK=["SUN","MON","TUE","WED","THU","FRI","SAT"];
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function parseDate(s){ if(!s) return null; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function isUpcoming(ev){ const d=parseDate(ev.date); return d && d>=startOfToday(); }
function esc(s){ return String(s==null?"":s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtGoing(n){ return Number(n).toLocaleString("en-US"); }  // big and drawn out, never a K

/* ============================================================
   CHROME — nav / footer / ticket modal (mounted on every page)
   ============================================================ */
const path = location.pathname.split('/').pop() || 'index.html';
const isHome = path === '' || path === 'index.html';
const home = isHome ? '' : 'index.html';

function buildNav(){
  const mount=document.getElementById('nav-mount'); if(!mount) return;
  const act=h=>(h===path)?' class="active"':'';
  mount.outerHTML = `
  <header class="site" id="header">
    <nav class="nav">
      <a href="index.html" class="brand" aria-label="DartyForLife home">
        <img src="media/brand/logo_real_h.png" alt="DartyForLife">
      </a>
      <div class="nav-links">
        <a href="majors.html"${act('majors.html')}>Headliners</a>
        <a href="bars.html" class="nl-bars"${act('bars.html')}>Darty Bars</a>
        <a href="tempe.html" class="nl-tempe"${act('tempe.html')}>Tempe</a>
        <a href="${home}#relive">Highlights</a>
        <a href="rentals.html"${act('rentals.html')}>Rentals</a>
      </div>
      <div class="nav-right">
        <div class="nav-social">
          <a href="${CONFIG.ig}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a>
          <a href="${CONFIG.tt}" target="_blank" rel="noopener" aria-label="TikTok">${IC.tt}</a>
        </div>
        <a class="btn btn-primary btn-sm" data-tickets="org" href="${CONFIG.posh}" target="_blank" rel="noopener">Get Tickets</a>
        <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </nav>
  </header>
  <div class="mobile-menu" id="mobileMenu">
    <a href="index.html">Home</a>
    <a href="majors.html" class="mm-majors">Headliners</a>
    <a href="bars.html" class="mm-bars">Darty Bars</a>
    <a href="tempe.html" class="mm-tempe">Tempe</a>
    <a href="${home}#relive">Highlights</a>
    <a href="rentals.html">Equipment Rentals</a>
    <a class="btn btn-primary" data-tickets="org" href="${CONFIG.posh}" target="_blank" rel="noopener">Get Tickets</a>
    <div class="mm-social">
      <a href="${CONFIG.ig}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a>
      <a href="${CONFIG.tt}" target="_blank" rel="noopener" aria-label="TikTok">${IC.tt}</a>
      <a href="${CONFIG.fb}" target="_blank" rel="noopener" aria-label="Facebook">${IC.fb}</a>
    </div>
  </div>`;
}

function buildFooter(){
  const mount=document.getElementById('footer-mount'); if(!mount) return;
  mount.outerHTML = `
  <footer class="site">
    <div class="foot-inner">
      <div class="foot-brand">
        <img src="media/brand/logo_real_stack_dd.png" alt="DartyForLife · Desert Drinkers">
        <p>Phoenix's biggest desert nights. Monthly headliners at Stratus, Darty Bars weekly, and DartyForLife Tempe.</p>
        <p class="motto">YOU WILL ALWAYS FEEL GOOD IF YOUR <b>INTENTIONS ARE GOOD</b>.</p>
        <div class="socials">
          <a href="${CONFIG.ig}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a>
          <a href="${CONFIG.tt}" target="_blank" rel="noopener" aria-label="TikTok">${IC.tt}</a>
          <a href="${CONFIG.fb}" target="_blank" rel="noopener" aria-label="Facebook">${IC.fb}</a>
        </div>
      </div>
      <div class="foot-col">
        <h5>The Nights</h5>
        <a href="majors.html">Monthly headliners</a>
        <a href="bars.html">Darty Bars · weekly</a>
        <a href="tempe.html">DartyForLife Tempe</a>
        <a href="${home}#relive">Highlight reels</a>
      </div>
      <div class="foot-col">
        <h5>Get In</h5>
        <a data-tickets="org" href="${CONFIG.posh}" target="_blank" rel="noopener">Tickets · Posh</a>
        <a href="rentals.html">Rent our gear</a>
        <a href="${CONFIG.ig}" target="_blank" rel="noopener">Instagram</a>
        <a href="${CONFIG.tt}" target="_blank" rel="noopener">TikTok</a>
        <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span id="year"></span> DartyForLife · Desert Drinkers · Phoenix, AZ · All rights reserved. Site design, content, and code are proprietary; copying or scraping is prohibited.</span>
      <span>Ages 18 &amp; over to enter · 21 &amp; over to drink · Please party responsibly.</span>
    </div>
  </footer>`;
  document.getElementById("year").textContent=new Date().getFullYear();
}

function buildModal(){
  if(document.getElementById('tkModal')) return;
  const d=document.createElement('div');
  d.innerHTML = `
  <div class="tk" id="tkModal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Buy tickets on Posh">
    <div class="tk-backdrop" data-close></div>
    <div class="tk-dialog" role="document">
      <div class="tk-head">
        <div class="tk-head-l">
          <span class="tk-kicker">Posh · secure checkout</span>
          <h3 id="tkTitle">Tickets</h3>
        </div>
        <a class="tk-open" id="tkOpen" href="${CONFIG.posh}" target="_blank" rel="noopener">Open ↗</a>
        <button class="tk-close" data-close aria-label="Close checkout">✕</button>
      </div>
      <div class="tk-body" id="tkBody"></div>
    </div>
  </div>`;
  document.body.appendChild(d.firstElementChild);
}

/* ============================================================
   EVENT CARDS — real Posh flyer art
   ============================================================ */
function eventCard(ev){
  const d=parseDate(ev.date);
  const s=classify(ev);
  const art=ev.flyer?`style="background-image:url('${esc(ev.flyer)}')"`:"";
  // bar-nights tab stays clean: no green free-entry pill there (his call)
  const pill = (ev.free && !document.body.classList.contains("theme-bars"))
    ? `<span class="pill pill-free">Free entry</span>`
    : `<span class="pill pill-${s}">${SERIES[s].label}</span>`;
  const going = (typeof ev.sold==="number" && ev.sold>0)
    ? `<span class="ev-going"><span class="dot"></span>${fmtGoing(ev.sold)} going</span>` : "";
  // Announced but not on sale yet (no Posh slug) → capture intent instead of a dead ticket link
  const cta = ev.url
    ? `<button class="ev-cta" data-tickets="ev" data-ev-url="${esc(ev.url)}" data-ev-title="${esc(ev.title)}" aria-label="Get tickets for ${esc(ev.title)}">${ev.free?"Free · RSVP":"Get Tickets"} ${IC.arrow}</button>`
    : `<button class="ev-cta" data-notify="${esc(ev.title)}" aria-label="Get notified about ${esc(ev.title)}">Get Notified ${IC.arrow}</button>`;
  // announced but not on sale -> a soft Coming Soon watermark in the middle of the card
  const soon = ev.url ? "" : `<div class="ev-soon" aria-hidden="true">Coming Soon</div>`;
  return `
  <article class="ev reveal${ev.flyer?"":" noart"}" data-series="${s}">
    <div class="ev-art" ${art}></div>
    <div class="ev-veil"></div>
    ${soon}
    <div class="ev-top">
      ${pill}
      ${d?`<div class="date-chip"><span class="mo">${MONTHS[d.getMonth()]}</span><span class="dy">${d.getDate()}</span><span class="wd">${WK[d.getDay()]}</span></div>`:""}
    </div>
    <div class="ev-info">
      <h3>${esc(ev.title)}</h3>
      <div class="ev-meta">
        <span class="loc">${IC.pin} ${esc(ev.venue||"")}</span>
        ${ev.time?`<span>Doors ${esc(ev.time)}</span>`:""}
      </div>
      ${going}
      <div>${cta}</div>
    </div>
  </article>`;
}

/* render any [data-events] grid: data-series="major|bar|tempe|all" data-limit="N" */
function renderGrids(){
  document.querySelectorAll("[data-events]").forEach(grid=>{
    const want=grid.dataset.series||"all";
    const limit=parseInt(grid.dataset.limit||"0",10);
    let list=EVENTS.filter(isUpcoming);
    if(want!=="all") list=list.filter(e=>classify(e)===want);
    list.sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(limit) list=list.slice(0,limit);
    // no mockups, ever: an empty calendar gets an honest note + a Get Notified path
    const label=want==="bar"?"Darty Bars":want==="tempe"?"DartyForLife Tempe":"DartyForLife";
    const btnClass=document.body.classList.contains("theme-bars")?"btn btn-bars"
      :document.body.classList.contains("theme-tempe")?"btn btn-asu":"btn btn-primary";
    grid.innerHTML=list.length?list.map(eventCard).join("")
      :`<div class="empty-note"><p style="margin:0 0 16px">Nothing on the calendar yet.</p>
         <button class="${btnClass}" data-notify="${label}">Get Notified when it drops</button></div>`;
    observeReveals();
  });
}

/* ============================================================
   NEXT MAJOR — hero line + countdown card + going counter
   ============================================================ */
function nextMajor(){
  return EVENTS.filter(e=>classify(e)==="major"&&isUpcoming(e))
               .sort((a,b)=>(a.date||"").localeCompare(b.date||""))[0]||null;
}
let cdTimer=null;
function renderNext(){
  const ev=nextMajor();
  const line=document.getElementById("nextline");
  const card=document.getElementById("nextCard");
  if(!ev){
    if(line) line.innerHTML="";
    if(card){ card.classList.add("in");
      card.innerHTML=`<div class="nm-body"><span class="eyebrow">Between headliners</span><div class="nm-name">Season loading</div><p class="nm-empty">The next one drops soon. Get on The List so you hear it first.</p><div class="nm-actions"><a class="btn btn-primary" href="${home}#list">Join The List</a></div></div>`;
    }
    return;
  }
  const d=parseDate(ev.date);
  if(line) line.innerHTML=`<a class="nl-tag" href="#next"><span class="k">Next headliner</span><span class="sep">·</span><b>${esc(ev.title)}</b><span class="sep">·</span><span class="nl-date">${WK[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}</span></a>`;
  if(card){
    const going=""; // his call: the countdown card doesn't need the head count (it lives on the event cards)
    card.innerHTML=`
      <div class="nm-flyer" ${ev.flyer?`style="background-image:url('${esc(ev.flyer)}')"`:""}></div>
      <div class="nm-body">
        <span class="eyebrow">Next headliner</span>
        <div class="nm-name">${esc(ev.title)}</div>
        <div class="nm-meta">
          <span class="mrow">${IC.cal}<b>${WK[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}</b></span>
          <span class="mrow">${IC.pin}${esc(ev.venue||"")}</span>
          ${ev.time?`<span class="mrow"><b>Doors ${esc(ev.time)}</b></span>`:""}
        </div>
        <div class="countdown">
          ${["Days","Hours","Mins","Secs"].map(l=>`<div class="cd-cell"><div class="num" data-k="${l}">--</div><div class="lab">${l}</div></div>`).join("")}
        </div>
        ${going}
        <div class="nm-actions">
          ${ev.url
            ? `<button class="btn btn-primary" data-tickets="ev" data-ev-url="${esc(ev.url)}" data-ev-title="${esc(ev.title)}">Get Tickets ${IC.arrow}</button>`
            : `<button class="btn btn-primary" data-notify="${esc(ev.title)}">Get Notified ${IC.arrow}</button>`}
        </div>
      </div>`;
    const target=new Date(d.getFullYear(),d.getMonth(),d.getDate(),21,0,0).getTime();
    const cells=card.querySelectorAll(".num");
    const set=(k,v)=>cells.forEach(c=>{ if(c.dataset.k===k) c.textContent=String(v).padStart(2,"0"); });
    function tick(){
      let diff=Math.max(0,target-Date.now());
      const day=864e5,hr=36e5,mn=6e4;
      const dd=Math.floor(diff/day);diff-=dd*day;
      const hh=Math.floor(diff/hr);diff-=hh*hr;
      const mm=Math.floor(diff/mn);diff-=mm*mn;
      set("Days",dd);set("Hours",hh);set("Mins",mm);set("Secs",Math.floor(diff/1e3));
    }
    tick();clearInterval(cdTimer);cdTimer=setInterval(tick,1000);
    card.querySelectorAll("[data-count]").forEach(countUp);
    card.classList.add("in");
  }
}

/* ============================================================
   LIVE DATA — events.json refreshed daily from Posh by GH Action
   ============================================================ */
fetch("events.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{
  if(!j||!Array.isArray(j.events)||!j.events.length) return;
  const fresh=j.events.filter(e=>e&&e.date&&e.title);
  if(!fresh.length) return;
  // live Posh data wins; keep announced fallback events Posh doesn't know yet
  const liveKeys=new Set(fresh.map(e=>(e.url||e.title).toLowerCase()));
  const keep=EVENTS.filter(e=>!liveKeys.has((e.url||e.title).toLowerCase())
    && !fresh.some(f=>f.title.toLowerCase()===e.title.toLowerCase()));
  EVENTS=fresh.concat(keep);
  renderGrids(); renderNext(); injectEventSchema();
}).catch(()=>{});

/* ============================================================
   LIVE GOING COUNTS — anchored to Posh's own number, per sale.
   The endpoint returns Posh's public totalTicketsSold per event
   (refunds/comps/transfers included), falling back to our
   webhook pipeline; polled every 60s. Numbers are authoritative
   in BOTH directions — a refund may lower a count. Zero/missing
   means "no data" and never wipes a shown number. Events match
   by Posh id (pid) first; name is the fallback.
   ============================================================ */
const LIVE_GOING_URL="https://social-command-center-lemon.vercel.app/api/public/going";
function applyLiveCounts(){
  fetch(LIVE_GOING_URL,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!Array.isArray(j.events)) return;
    const byPid=new Map(j.events.filter(e=>e.pid).map(e=>[String(e.pid),Number(e.going)||0]));
    const byName=new Map(j.events.map(e=>[String(e.name).trim().toLowerCase(),Number(e.going)||0]));
    let changed=false;
    EVENTS.forEach(ev=>{
      const live=byPid.get(String(ev.pid||""))??byName.get(String(ev.title).trim().toLowerCase());
      if(typeof live==="number"&&live>0&&live!==(ev.sold||0)){ ev.sold=live; changed=true; }
    });
    if(changed) renderGrids();
    // live lifetime totals -> stats row (always-accurate numbers, his rule)
    if(j.totals){
      const set=(id,v)=>{const el=document.getElementById(id);if(el&&typeof v==="number"&&v>0){el.dataset.count=v;if(el._done)el.textContent=Number(v).toLocaleString("en-US");}};
      set("statNights",j.totals.nights);
      set("statTickets",j.totals.tickets);
      set("statGoing",EVENTS.filter(isUpcoming).reduce((s,e)=>s+(Number(e.sold)||0),0));
    }
  }).catch(()=>{});
}
applyLiveCounts();
setInterval(applyLiveCounts,60000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) applyLiveCounts(); });

/* ============================================================
   SCROLL REVEAL + COUNT-UP
   ============================================================ */
const io=new IntersectionObserver(entries=>{
  entries.forEach(en=>{
    if(!en.isIntersecting) return;
    en.target.classList.add("in");io.unobserve(en.target);
    if(en.target.dataset&&en.target.dataset.count!==undefined) countUp(en.target);
    en.target.querySelectorAll&&en.target.querySelectorAll("[data-count]").forEach(countUp);
  });
},{threshold:.14,rootMargin:"0px 0px -6% 0px"});
function observeReveals(){ document.querySelectorAll(".reveal:not(.in)").forEach(el=>io.observe(el)); }
function countUp(el){
  if(el._done) return; el._done=true;
  const target=parseFloat(el.dataset.count),dec=parseInt(el.dataset.decimals||"0",10),suffix=el.dataset.suffix||"";
  const dur=1400,t0=performance.now();
  (function step(t){
    const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3),val=target*e;
    el.textContent=(dec?val.toFixed(dec):Math.round(val).toLocaleString("en-US"))+suffix;
    if(p<1) requestAnimationFrame(step);
    else el.textContent=(dec?target.toFixed(dec):Math.round(target).toLocaleString("en-US"))+suffix;
  })(t0);
}

/* ============================================================
   INIT CHROME + PAGE BEHAVIOUR
   ============================================================ */
buildNav(); buildFooter(); buildModal();

// resolve data-cfg links + inject social icons where empty
document.querySelectorAll("[data-cfg]").forEach(el=>{
  const k=el.getAttribute("data-cfg");
  const map={ig:CONFIG.ig,tt:CONFIG.tt,fb:CONFIG.fb,posh:CONFIG.posh,
    mapStratus:CONFIG.mapStratus,mapStratusApple:CONFIG.mapStratusApple,map44:CONFIG.map44};
  if(k in map) el.href=map[k];
  if((k==="ig"||k==="tt"||k==="fb")&&!el.innerHTML.trim()) el.innerHTML=IC[k];
});

const header=document.getElementById("header");
if(header) addEventListener("scroll",()=>header.classList.toggle("scrolled",scrollY>40),{passive:true});

const ham=document.getElementById("hamburger"),mm=document.getElementById("mobileMenu");
if(ham){ ham.addEventListener("click",()=>mm.classList.toggle("open"));
  mm.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>mm.classList.remove("open"))); }

const spot=document.querySelector(".spotlight");
if(spot&&matchMedia("(pointer:fine)").matches){
  addEventListener("mousemove",e=>{spot.classList.add("on");spot.style.transform=`translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;},{passive:true});
  addEventListener("mouseleave",()=>spot.classList.remove("on"));
}

// marquees
function fillMarquee(id,items){ const t=document.getElementById(id); if(!t) return; const set=items.map(x=>`<span>${x}</span>`).join(""); t.innerHTML=set+set; }
const MQ=["Darty Bars Weekly","Headliners Monthly","DartyForLife Tempe","Free Events Monthly","Phoenix AZ","Tickets on Posh","Good Intentions Only","Party For Life"];
fillMarquee("mq1",MQ); fillMarquee("mq2",MQ);

// equalizer scroll cue
document.querySelectorAll(".eq").forEach(eq=>{
  eq.innerHTML="";
  for(let i=0;i<26;i++){ const s=document.createElement("span");
    s.style.animationDelay=(-Math.random()*1.2).toFixed(2)+"s";
    s.style.animationDuration=(0.6+Math.random()*0.7).toFixed(2)+"s"; eq.appendChild(s); }
});

/* ============================================================
   POSH TICKETS — inline checkout modal (slug-aware)
   ============================================================ */
const tkModal=document.getElementById("tkModal"),tkBody=document.getElementById("tkBody"),
      tkTitle=document.getElementById("tkTitle"),tkOpen=document.getElementById("tkOpen");
let tkReturnTo=null;
function openTickets(title,slug){
  const url=slug?`https://posh.vip/e/${encodeURIComponent(slug)}`:CONFIG.posh;
  tkTitle.textContent=title||"All events";
  tkOpen.href=url;
  tkBody.innerHTML=`<div class="tk-load">Loading secure checkout…</div>`;
  const f=document.createElement("iframe");
  f.title="Posh checkout";
  f.setAttribute("allow","payment *; clipboard-write; web-share; accelerometer; encrypted-media");
  f.addEventListener("load",()=>{const l=tkBody.querySelector(".tk-load");if(l)l.remove();});
  f.src=url; tkBody.appendChild(f);
  tkModal.classList.add("open");tkModal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";tkReturnTo=document.activeElement;
  tkModal.querySelector(".tk-close").focus();
}
function closeTickets(){
  tkModal.classList.remove("open");tkModal.setAttribute("aria-hidden","true");
  tkBody.innerHTML="";document.body.style.overflow="";
  if(tkReturnTo&&tkReturnTo.focus)tkReturnTo.focus();
}
tkModal.addEventListener("click",e=>{ if(e.target.hasAttribute("data-close")) closeTickets(); });
addEventListener("keydown",e=>{ if(e.key==="Escape"&&tkModal.classList.contains("open")) closeTickets(); });

// one handler powers every ticket trigger.
// Slugged event → inline checkout modal. Storefront / unslugged → new tab.
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-tickets]"); if(!t) return;
  e.preventDefault();
  const slug=t.getAttribute("data-ev-url")||"";
  if(t.getAttribute("data-tickets")==="ev"&&slug) openTickets(t.getAttribute("data-ev-title")||"Tickets",slug);
  else window.open(CONFIG.posh,"_blank","noopener");
});

// the whole event card is one big tap target — anywhere on it acts like its CTA
document.addEventListener("click",e=>{
  const card=e.target.closest(".ev"); if(!card) return;
  if(e.target.closest(".ev-cta")) return;          // the button handles itself
  const cta=card.querySelector(".ev-cta");
  if(cta) cta.click();
});

/* ============================================================
   THE LIST + RENTALS — lead capture straight into our own DB
   (SCC /api/public/leads on Vercel; replaced Netlify Forms when
   hosting moved to GitHub Pages). "Get Notified" buttons tag the
   signup with the event so the drop automation knows who to text.
   ============================================================ */
/* ============================================================
   LIGHT ANTI-SCRAPE — pairs with robots.txt + noai meta.
   Blocks casual save/drag/right-click on our media without
   touching text selection or accessibility.
   ============================================================ */
document.addEventListener("contextmenu",e=>{ if(e.target.closest("img,video")) e.preventDefault(); });
document.addEventListener("dragstart",e=>{ if(e.target.closest("img")) e.preventDefault(); });
console.log("%cDARTYFORLIFE","font-size:28px;font-weight:900;color:#ff2bd6",
  "\nThis site's design, content, and code are proprietary. Don't clone it. Want to build with us instead? contact@dartyforlife.com");

/* ============================================================
   GEAR CATALOG — every piece listed separately, real specs,
   real sourced review data, honest "unverified" gaps left out.
   Facts sourced from manufacturer + retailer pages (Jul 2026).
   ============================================================ */
const GEAR=[
 { id:"foam1", name:"HD Pro Stacker Foam Cannon", model:"Foam Daddy HD Pro Stacker", qty:1, img:"media/gallery/gear/foam1-lead.jpg", imgs:["media/gallery/gear/foam1-lead.jpg","media/gallery/gear/foam-o1.jpg?v=2","media/gallery/gear/foam-o6.jpg?v=2","media/gallery/gear/foam-o3.jpg?v=2","media/gallery/gear/foam-o5.jpg?v=2"], note:"Foam solution sold separately",
   tag:"Dense, stackable foam up to 30 feet out.",
   from:"FoamDaddy LLC · Phoenix, Arizona. The flagship cannon of the premier US foam party supplier, built in our own backyard.",
   desc:"FoamDaddy's flagship professional cannon, the machine behind commercial foam parties. It throws dense, stackable foam up to 30 feet and blankets roughly a 30 by 30 foot party zone.",
   works:"A submersible pump feeds water mixed with foam concentrate up the hose; a high-output blower forces air through a solution-soaked mesh at the barrel, jetting out a continuous stream of stacking foam.",
   use:["Mix the concentrate with water in a big reservoir per the dilution chart (2 gal of concentrate makes roughly 800 gallons of foam).","Drop the pump in, connect the 10-ft hose, and mount the cannon on its tripod.","Aim slightly upward over the pit and run it from the wireless remote. One batch runs about 4 hours.","Rinse the pump, hose, and mesh with clean water after the event."],
   specs:[["Throw distance","Up to 30 ft"],["Coverage","~30 x 30 ft zone"],["Power","110V · ~9A with pump"],["Weight","42 lb"],["Includes","Wireless remote, pump, 10-ft hose, tripod"],["Runtime","~4 hrs per solution batch"]],
   rev:{line:"550+ five-star reviews reported by Foam Daddy",src:"foamdaddy.com"} },
 { id:"foam2", name:"Large Foam Cannon", model:"Foam Daddy Large Foam Cannon", qty:1, img:"media/gallery/gear/foam2-lead.jpg", imgs:["media/gallery/gear/foam2-lead.jpg","media/gallery/gear/foam2-o1.jpg","media/gallery/gear/foam2-o2.jpg","media/gallery/gear/foam2-o3.jpg","media/gallery/gear/foam2-o4.jpg"], note:"Foam solution sold separately",
   tag:"Elevated foam volume, 20 to 24 feet out.",
   from:"FoamDaddy LLC · Phoenix, Arizona. Same hometown builder as our HD Pro Stacker.",
   desc:"FoamDaddy's Large Foam Cannon on its swivel tripod mount. It pumps out volumes of foam from an elevated position, throwing 20 to 24 feet and blanketing a 30 by 30 foot zone up to 4 feet deep. Run it solo or cross-fire with the HD Pro Stacker for full-lot coverage.",
   works:"A submersible pump feeds solution up the hose while the 5,500 CFM blower drives air through the foam mesh; the swivel mount lets you aim the stream anywhere over the pit.",
   use:["Mix the concentrate with water in your reservoir per the dilution chart.","Drop the pump in, connect the hose, and mount the cannon on its tripod.","Aim on the swivel and let it run; reposition as the pit builds.","Rinse the pump, hose, and mesh with clean water after the event."],
   specs:[["Throw distance","20 to 24 ft"],["Coverage","~30 x 30 ft zone, up to 4 ft deep"],["Output","5,500 CFM"],["Power","110V · 13A with pump"],["Size / weight","22 x 20 x 22 in · 39 lb"],["Includes","Submersible pump, tripod, hose, 22-ft cord"]],
   rev:{line:"550+ five-star reviews reported by Foam Daddy",src:"foamdaddy.com"} },
 { id:"kspk", name:"QSC K-Series Speaker", model:"QSC K-Series powered top", qty:4, img:"media/gallery/gear/kspk-lead.jpg", imgs:["media/gallery/gear/kspk-lead.jpg","media/gallery/gear/kspk-o1.jpg?v=2","media/gallery/gear/kspk-o2.jpg?v=2","media/gallery/gear/kspk-o4.jpg?v=2","media/gallery/gear/kspk-o3.jpg?v=2"],
   tag:"The industry-benchmark powered PA top.",
   from:"QSC · Costa Mesa, California. Building pro audio since 1968; the K Family is their global best-selling powered speaker line.",
   desc:"The powered speaker line you hear at pro events everywhere. A woofer and compression driver pushed by a built-in Class-D amplifier with onboard DSP, so one box on a pole delivers full club-level sound.",
   works:"Built-in Class-D amplification (the current K.2 line runs 2,000W peak) with internal DSP handling crossover, protection, and room presets automatically.",
   use:["Set it on a pole or tripod, or use the tilt-back angle as a floor monitor.","Run XLR from your mixer or DJ gear into the input.","Pick a DSP preset for the job: dance music, mic, monitor.","Set gain so the limit light only flicks on the loudest peaks. Pair with our KS subs for full-range dance floors."],
   specs:[["Amplifier","Class-D, up to 2,000W peak (K.2 line)"],["Design","Two-way: woofer + 1.4\" compression driver"],["DSP","Factory presets + savable scenes"],["Rigging","Pole mount + tilt-back angles"],["I/O","XLR combo in, XLR thru"]],
   rev:{stars:"4.5/5",count:"163 reviews",src:"Sweetwater (K12.2, flagship of the line)",line:"Reviewers report clear, powerful sound and years of reliability across bars, halls, and outdoor events."} },
 { id:"ksub", name:"QSC KS118 Subwoofer", model:"QSC KS118 · 18\" · 3,600W", qty:4, img:"media/gallery/gear/ksub-lead.jpg", imgs:["media/gallery/gear/ksub-lead.jpg","media/gallery/gear/ksub-c2.jpg?v=2","media/gallery/gear/ksub-c1.jpg?v=2","media/gallery/gear/ksub-c3.jpg?v=2"],
   tag:"Chest-punch low end on wheels.",
   from:"QSC · Costa Mesa, California. The matching sub line to the K Family, from a company building pro audio since 1968.",
   desc:"The QSC KS118: an 18-inch powered subwoofer with 3,600 watts of peak Class-D power in a rolling birch cabinet. It fills in everything the tops don't reach. Rent one for warmth or four for a real dance floor.",
   works:"A 3,600W peak Class-D module drives the long-excursion 18-inch woofer, with onboard DSP handling the crossover and a DEEP mode for extended lows.",
   use:["Roll it into place on its casters and connect power.","Run your mixer into the sub, then the sub's high-passed outputs up to the tops.","Thread a pole into the M20 socket to fly a K-Series top directly above.","Engage DEEP mode for extended lows when you have the headroom."],
   specs:[["Driver","18-inch long-excursion woofer"],["Amplifier","Class-D, 3,600W peak"],["Low end","Down to 35 Hz · 136 dB max SPL"],["Build","Birch cabinet, steel grille, casters"],["Rigging","M20 pole socket for a top"],["DSP","Crossover presets + savable scenes"]],
   rev:{stars:"5/5",count:"48 reviews",src:"Sweetwater (KS118)",line:"Reviewers describe tight, controlled, high-headroom bass that transformed their rigs."} },
 { id:"cdj", name:"Pioneer CDJ-3000", model:"Pioneer DJ CDJ-3000", qty:1, img:"media/gallery/gear/cdj-lead.jpg", imgs:["media/gallery/gear/cdj-lead.jpg","media/gallery/gear/cdj-o2.jpg?v=2","media/gallery/gear/cdj-o1.jpg?v=2","media/gallery/gear/cdj-o3.jpg?v=2","media/gallery/gear/cdj-o4.jpg?v=2"],
   tag:"The club-standard deck. Every festival booth has it.",
   from:"Pioneer DJ by AlphaTheta · Yokohama, Japan. The CDJ line has defined the professional DJ booth since 1994.",
   desc:"The global club-standard professional player and the deck our own headliners play on. A 9-inch HD touchscreen, low-latency jog wheel, and 8 hot cues, playing straight off USB or SD prepared in rekordbox.",
   works:"Tracks analyzed in rekordbox load from USB or SD (or over a Pro DJ Link network for up to 6 players), played through a 96 kHz / 32-bit float DAC.",
   use:["Export your library to USB with rekordbox so cues, loops, and grids travel with the drive.","Plug in, browse on the touchscreen, and load.","Link players over LAN for source sharing and beat sync.","Run the outputs into your mixer and only eject when the screen says it's safe."],
   specs:[["Display","9\" HD touchscreen"],["Audio","96 kHz / 32-bit float DAC"],["Sources","USB-A, SD, USB-B, gigabit Pro DJ Link"],["Performance","8 hot cue keys, beat jump, key sync"],["Weight","12.1 lb"]],
   rev:{stars:"4.5/5",count:"9 reviews",src:"Sweetwater",line:"Owners call it a clear step up in build, screen, and jog feel from every CDJ before it."} },
 { id:"xdj", name:"Pioneer XDJ-XZ", model:"Pioneer DJ XDJ-XZ", qty:1, img:"media/gallery/gear/xdj-lead.jpg", imgs:["media/gallery/gear/xdj-lead.jpg","media/gallery/gear/xdj-front-clean.jpg","media/gallery/gear/xdj-o2.jpg?v=2","media/gallery/gear/xdj-o4.jpg?v=2"],
   tag:"A full club booth in one console. No laptop needed.",
   from:"Pioneer DJ by AlphaTheta · Yokohama, Japan. The standard on touring DJ riders worldwide.",
   desc:"Pioneer's flagship all-in-one: two club-style decks and a 4-channel DJM-style mixer in a single console. Full-size jogs with displays, a 7-inch touchscreen, and 16 performance pads. Standalone playback runs two channels; channels 3 and 4 take external players.",
   works:"Plays rekordbox-exported USB drives standalone, or hooks to a laptop for rekordbox and Serato DJ Pro; Pro DJ Link adds CDJs on channels 3 and 4.",
   use:["Load a rekordbox USB into a top port and pick tracks from the 7\" touchscreen.","Mix on the club-layout mixer: 3-band EQs, 6 Color FX, 14 Beat FX.","Trigger hot cues from the 16 pads.","XLR master out to the PA, plus two mic inputs with their own EQ."],
   specs:[["Mixer","4-channel club layout (2 standalone)"],["Display","7\" touchscreen + on-jog displays"],["FX","6 Sound Color FX + 14 Beat FX, 16 pads"],["Software","rekordbox standalone · Serato DJ Pro"],["I/O","3 USB, XLR master, 2 mic inputs"],["Weight","28.7 lb"]],
   rev:{stars:"4.7/5",count:"106 ratings",src:"Amazon",line:"DJs praise it as a reliable, club-authentic workhorse; the two-channel standalone limit is the only common gripe."} },
 { id:"bubble", name:"Bubble Machine", model:"Foam Daddy triple-wheel LED bubble machine", qty:1, img:"media/gallery/gear/bubble-lead.jpg", imgs:["media/gallery/gear/bubble-lead.jpg","media/gallery/gear/bubble-machine.jpg?v=2"], note:"Bubble solution sold separately",
   tag:"Fills the floor with bubbles and lights them up.",
   from:"FoamDaddy LLC · Phoenix, Arizona. From the same hometown foam party supplier as our cannons.",
   desc:"A professional triple-wheel bubble machine ringed with LEDs. Three wands spin through solution while a fan streams bubbles across the floor, and the LED ring lights them as they fly.",
   works:"Three motorized bubble wheels rotate through the solution reservoir while a fan blows continuous streams of bubbles out the front.",
   use:["Fill the reservoir with bubble solution.","Aim it across the dance floor or entry, power on, and it runs continuously.","Indoors, put a mat under it: floors get slick.","Drain and wipe it down after the night."],
   specs:[["Output","Three rotating bubble wheels, continuous"],["Lighting","Built-in LED ring"],["Power","120V"]] },
 { id:"haze", name:"Haze Machine", model:"ADJ Entourage", qty:1, img:"media/gallery/gear/haze-lead.jpg", imgs:["media/gallery/gear/haze-lead.jpg","media/gallery/gear/haze-o1.jpg?v=2","media/gallery/gear/haze-o2.jpg?v=2","media/gallery/gear/haze-o3.jpg?v=2","media/gallery/gear/haze-o4.jpg?v=2"], note:"Haze fluid sold separately (water-based)",
   tag:"The mist that makes every light beam visible.",
   from:"ADJ · Los Angeles, California. Lighting and effects for DJs since 1985.",
   desc:"A touring-grade faze machine built permanently into its own flight case, so it rolls in show-ready. It fills the room with a fine, even mist that hangs in the air and turns every light into a visible beam. Thicker than a hazer, thinner than a fogger.",
   works:"A pump feeds water-based fluid onto a 1,400W heater block where it vaporizes; a fan disperses it as a fine continuous mist. Warm-up is 45 seconds.",
   use:["Open the case, connect the 5.6L fluid tank, and fill with water-based fluid.","Power up and give it its 45-second warm-up.","Set timer, continuous, or manual output on the LED panel, or run it from DMX.","Dial output from a subtle beam-enhancer to heavy atmosphere."],
   specs:[["Output","15,000 CFM"],["Heater","1,400W (~1,500W total draw)"],["Warm-up","45 seconds"],["Tank","External 5.6L"],["Control","LED panel + 3-pin and 5-pin DMX"],["Build","47 lb, integrated flight case"]],
   rev:{stars:"4.5/5",count:"15 ratings",src:"Amazon",line:"Buyers praise the continuous fine mist and the tour-ready flight-case build."} },
 { id:"fog", name:"Fog Machine", model:"CHAUVET DJ Hurricane 1800 Flex", qty:1, img:"media/gallery/gear/fog-lead.jpg", imgs:["media/gallery/gear/fog-lead.jpg","media/gallery/gear/fog-right.jpg?v=2","media/gallery/gear/fog-o4.jpg?v=2","media/gallery/gear/fog-left.jpg?v=2","media/gallery/gear/fog-back.jpg?v=2"], note:"Fog fluid sold separately (water-based)",
   tag:"25,000 CFM of fog, aimed anywhere from flat to straight up.",
   from:"CHAUVET DJ · Sunrise, Florida. Family-founded in 1990, now a global entertainment lighting group.",
   desc:"A high-output water-based fog machine whose nozzle pivots through 180 degrees: vertical bursts, angled stage cover, or floor-hugging fog. Built for clubs, big parties, and haunted-house-scale effects.",
   works:"An electric pump pushes water-based fog fluid onto a heat-exchanger block where it flash-vaporizes into dense fog. Always Ready tech keeps the heater in range so fog is available on demand instead of cycling offline to reheat.",
   use:["Fill the 1-gallon tank with water-based fog fluid only.","Power on and allow the ~5-minute heat-up.","Aim the nozzle anywhere in its 180-degree range and lock it.","Trigger from the included wired timer remote or DMX; it auto-shuts the pump when fluid runs low."],
   specs:[["Output","25,000 CFM"],["Tank","1 gal · 30 mL/min consumption"],["Power","1,190W @ 120V"],["Nozzle","180° adjustable angle"],["Control","1-ch DMX + wired timer remote"],["Weight","19.6 lb"]],
   rev:{stars:"5/5",count:"4 reviews",src:"Sweetwater",line:"Reviewers say it fills large venues, even outdoor streets, fast, while sipping fluid."} },
 { id:"gen", name:"Generator", model:"FIRMAN Tri Fuel 7850/6300W (T06373)", qty:1, img:"media/gallery/gear/gen-lead.jpg", imgs:["media/gallery/gear/gen-lead.jpg","media/gallery/gear/gen-o0.jpg?v=2","media/gallery/gear/gen-o2.jpg?v=2","media/gallery/gear/gen-o1.jpg?v=2","media/gallery/gear/gen-o3.jpg?v=2"],
   tag:"Tri-fuel power anywhere. Desert lots, backyards, raw venues.",
   from:"FIRMAN Power Equipment · Peoria, Arizona. One of the largest portable generator makers in the world, headquartered right here in the Valley.",
   desc:"A tri-fuel workhorse that runs on gasoline, propane, or natural gas, with 7,850 starting watts and push-button electric start. Enough clean power to run our full rig, speakers, subs, decks, fog, and lights, completely off-grid, with CO Alert safety built in.",
   works:"A 322cc engine drives the alternator on your choice of fuel: gasoline (6,300W running), propane (5,700W), or natural gas (5,000W). CO Alert monitors carbon monoxide and shuts the unit down automatically if levels build.",
   use:["Tell us what you're powering and we'll confirm it fits the wattage on your fuel of choice.","Place it outdoors on level ground, away from doors, windows, and vents. Never inside.","Push-button start, let it stabilize, then connect gear one piece at a time.","Refuel only while it's off and cool; on propane, swap tanks with the engine off."],
   specs:[["Output (gas)","7,850 starting / 6,300 running watts"],["Output (LPG / NG)","5,700W / 5,000W running"],["Engine","322cc, electric + recoil start"],["Runtime","Up to 10 hrs at 50% load, 6-gal tank"],["Outlets","120V 20A GFCI duplex, L14-30R twist-lock, TT-30R RV"],["Safety","CO Alert auto-shutdown, low-oil shutoff"],["Noise / weight","76 dB at 3/4 load · 151 lb with wheel kit"]],
   rev:{stars:"4.4/5",count:"700+ ratings",src:"Costco",line:"Owners report easy starts and enough output to run whole setups; the few gripes are noise and rare out-of-box defects Costco made right."} },
 { id:"truss", name:"30x40 ft Global Truss System", model:"Global Truss F34 box truss", qty:1, img:"media/gallery/gear/truss-lead.jpg", imgs:["media/gallery/gear/truss-lead.jpg","media/gallery/gear/truss-booth.jpg","media/gallery/gear/truss-corner.jpg"],
   tag:"Festival bones. The industry-standard box truss.",
   from:"Global Truss · Los Angeles, California and Karlsbad, Germany. Engineered to German TUV safety standards.",
   desc:"A full 30-by-40-foot ground-support structure in Global Truss F34, the TUV-approved box truss behind professional stage rigs worldwide. Four-point square section means it spans, towers, and takes load from any side.",
   works:"Precision aluminum segments join with conical couplers, pins, and R-clips into rigid beams; corner towers on base plates carry the horizontal spans, all rated by published load-span tables.",
   use:["Design the footprint and check every span against the F34 load tables.","Assemble segments on the ground: seat couplers, drive pins, clip them.","Raise the grid up the corner towers per your rigging plan.","Hang fixtures with rated clamps and steel safety cables, and inspect pins at every build."],
   specs:[["System","Global Truss F34, 290mm square section"],["Material","EN-AW 6082 T6 aluminum"],["Certification","TUV-approved system"],["Connections","Conical couplers, pins, R-clips"],["Rating","Published load-span tables, spans to 18m"]],
   rev:{line:"The TUV-approved industry standard for stage structures",src:"globaltruss.com"} }
];

function gearCard(g){
  const media = g.img
    ? `<div class="g-media"><span class="g-qty">${g.qty} available</span><img src="${g.img}" alt="${esc(g.model||g.name)}" /></div>`
    : `<div class="g-media g-soon"><span class="g-qty">${g.qty} available</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 5 13h5l-1 9 8-11h-5z"/></svg><span>Photo coming soon</span></div>`;
  return `<button class="gear gear-btn" data-gear="${g.id}" aria-label="Details and specs for ${esc(g.name)}">
    ${media}
    <h3>${esc(g.name)}</h3>
    ${g.model?`<div class="g-model">${esc(g.model)}</div>`:""}
    <p>${esc(g.tag)}</p>
    ${g.note?`<span class="g-note">${esc(g.note)}</span>`:""}
    <span class="g-more">Specs + details</span>
  </button>`;
}
function renderGear(){
  const grid=document.getElementById("gearGrid"); if(!grid) return;
  grid.innerHTML=GEAR.map(gearCard).join("");
  const checks=document.getElementById("gearChecks");
  if(checks) checks.insertAdjacentHTML("beforeend",
    GEAR.map(g=>`<label class="check"><input type="checkbox" name="equipment" value="${esc(g.name)}" /><span>${esc(g.name)}</span></label>`).join(""));
}
function buildGearModal(){
  if(document.getElementById("gmModal")) return;
  const d=document.createElement("div");
  d.innerHTML=`<div class="gm" id="gmModal" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="gm-backdrop" data-gm-close></div>
    <div class="gm-dialog"><button class="gm-close" data-gm-close aria-label="Close">✕</button><div class="gm-body" id="gmBody"></div></div>
  </div>`;
  document.body.appendChild(d.firstElementChild);
}
function gearImgs(g){ return g.imgs || (g.img ? [g.img] : []); }
function openGear(id){
  const g=GEAR.find(x=>x.id===id); if(!g) return;
  const m=document.getElementById("gmModal"),b=document.getElementById("gmBody");
  const imgs=gearImgs(g);
  const gallery = imgs.length
    ? `<div class="gm-photo"><img id="gmMain" src="${imgs[0]}" alt="${esc(g.model||g.name)}" /></div>`+
      (imgs.length>1?`<div class="gm-thumbs">${imgs.map((s,i)=>`<img src="${s}" data-gm-thumb="${i}" class="${i===0?"on":""}" alt="${esc(g.name)} view ${i+1}" />`).join("")}</div>`:"")
    : "";
  b.innerHTML=`
    ${gallery}
    <div class="gm-head"><h3>${esc(g.name)}</h3>${g.model?`<div class="g-model">${esc(g.model)}</div>`:""}<span class="g-qty gm-qty">${g.qty} available</span></div>
    ${g.from?`<p class="gm-from">${esc(g.from)}</p>`:""}
    <p class="gm-desc">${esc(g.desc)}</p>
    <h4>How it works</h4><p>${esc(g.works)}</p>
    <h4>How to use it</h4><ol>${g.use.map(u=>`<li>${esc(u)}</li>`).join("")}</ol>
    <h4>Specs</h4><dl class="gm-specs">${g.specs.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${g.rev?`<div class="gm-rev">${g.rev.stars?`<span class="gm-stars">${esc(g.rev.stars)}</span><span class="gm-count">${esc(g.rev.count)} · ${esc(g.rev.src)}</span><p>${esc(g.rev.line)}</p>`:`<p>${esc(g.rev.line)} <span class="gm-count">· ${esc(g.rev.src)}</span></p>`}</div>`:""}
    ${g.note?`<span class="g-note">${esc(g.note)}</span>`:""}
    <button class="btn btn-primary gm-request" data-gm-request="${esc(g.name)}">Request this item</button>`;
  m.classList.add("open");m.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}
function closeGear(){
  const m=document.getElementById("gmModal"); if(!m) return;
  m.classList.remove("open");m.setAttribute("aria-hidden","true");document.body.style.overflow="";
}
renderGear();buildGearModal();
document.addEventListener("click",e=>{
  const card=e.target.closest("[data-gear]"); if(card){ openGear(card.getAttribute("data-gear")); return; }
  if(e.target.closest("[data-gm-close]")){ closeGear(); return; }
  const th=e.target.closest("[data-gm-thumb]");
  if(th){
    const main=document.getElementById("gmMain");
    if(main){ main.src=th.src;
      document.querySelectorAll(".gm-thumbs img").forEach(t=>t.classList.toggle("on",t===th)); }
    return;
  }
  const req=e.target.closest("[data-gm-request]");
  if(req){
    const val=req.getAttribute("data-gm-request");
    const box=document.querySelector(`#gearChecks input[value="${CSS.escape(val)}"]`);
    if(box) box.checked=true;
    closeGear();
    const f=document.getElementById("rentForm");
    if(f) f.scrollIntoView({behavior:"smooth",block:"center"});
  }
});
addEventListener("keydown",e=>{ if(e.key==="Escape") closeGear(); });

const LEADS_URL="https://social-command-center-lemon.vercel.app/api/public/leads";
function sendLead(kind,form){
  const fd=new FormData(form), data={kind};
  for(const k of new Set(fd.keys())){
    const all=fd.getAll(k);
    data[k]=all.length>1?all:all[0];
  }
  return fetch(LEADS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
}
const listForm=document.getElementById("listForm");
if(listForm){
  listForm.addEventListener("submit",e=>{
    e.preventDefault();
    sendLead("list",listForm).catch(()=>{});
    listForm.querySelectorAll(".field, button[type=submit], .list-fine").forEach(el=>el.style.display="none");
    document.getElementById("listMsg").hidden=false;
  });
}
const rentForm=document.getElementById("rentForm");
if(rentForm){
  rentForm.addEventListener("submit",e=>{
    e.preventDefault();
    if(!rentForm.querySelector('input[name="equipment"]:checked')){
      alert("Pick at least one piece of gear."); return;
    }
    // always send equipment as an array, even when only one box is ticked
    const fd=new FormData(rentForm), data={kind:"rental",equipment:fd.getAll("equipment")};
    for(const k of new Set(fd.keys())){ if(k!=="equipment"){ const all=fd.getAll(k); data[k]=all.length>1?all:all[0]; } }
    fetch(LEADS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(()=>{});
    rentForm.querySelectorAll(".field, .gf-set, button[type=submit]").forEach(el=>el.style.display="none");
    document.getElementById("rentMsg").hidden=false;
  });
}

function applyInterest(){
  const t=sessionStorage.getItem("dfl-interest");
  const f=document.getElementById("interestField"), n=document.getElementById("listInterest");
  if(!t||!f) return;
  f.value=t;
  if(n){ n.innerHTML=`You'll be the first to know when <b>${esc(t)}</b> drops.`; n.hidden=false; }
}
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-notify]"); if(!t) return;
  e.preventDefault();
  sessionStorage.setItem("dfl-interest",t.getAttribute("data-notify")||"");
  if(document.getElementById("listForm")){ applyInterest(); document.getElementById("list").scrollIntoView({behavior:"smooth"}); }
  else location.href="index.html#list";
});
applyInterest();

/* ============================================================
   RELIVE THE NIGHTS — lazy muted loops (mobile-safe)
   ============================================================ */
(function(){
  const reels=document.querySelectorAll(".reel video, .acard video");
  if(!reels.length) return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const tryPlay=v=>{ const p=v.play(); if(p&&p.catch)p.catch(()=>{}); };
  const vio=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const v=en.target;
      if(en.isIntersecting){
        if(!v.dataset.loaded){
          v.dataset.loaded="1";
          v.addEventListener("canplay",()=>{ if(v.dataset.inview==="1") tryPlay(v); },{once:true});
          v.src=v.dataset.src;
        }
        v.dataset.inview="1"; tryPlay(v);
      } else { v.dataset.inview="0"; v.pause(); }
    });
  },{threshold:.25});
  reels.forEach(v=>vio.observe(v));
})();

/* ============================================================
   VISIT MAP — touring fly-over of every upcoming venue.
   Starts at the NEXT event's venue, then Leaflet flyTo (which
   zooms out and back in) to each other upcoming venue in date
   order, looping. The map card follows the current stop.
   Coords come from events.json (geocoded daily by the updater)
   with hardcoded fallbacks for the home venues.
   ============================================================ */
(function(){
  const VENUE_COORDS=[
    { match:"stratus", c:[33.4976074,-112.1528054] },
    { match:"the 44",  c:[33.5831282,-112.1552594] }
  ];
  function coordsFor(ev){
    if(typeof ev.lat==="number"&&typeof ev.lng==="number") return [ev.lat,ev.lng];
    const v=((ev.venue||"")+" "+(ev.city||"")).toLowerCase();
    const hit=VENUE_COORDS.find(k=>v.includes(k.match));
    return hit?hit.c:null;
  }
  function initMap(){
    if(typeof L==="undefined") return;
    const el=document.getElementById("themap"); if(!el) return;

    // tour stops: upcoming events with known coords, date order, unique venues
    const ups=EVENTS.filter(isUpcoming).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const stops=[], seenV=new Set();
    ups.forEach(ev=>{
      const c=coordsFor(ev); if(!c) return;
      const key=(ev.venue||"").toLowerCase(); if(!key||seenV.has(key)) return;
      seenV.add(key);
      stops.push({ c, venue:ev.venue, city:ev.city||"", ev });
    });
    // The 44 is the Darty Bars home base — keep it on the tour even before
    // the week's bar night hits Posh
    if(![...seenV].some(v=>v.includes("44")))
      stops.push({ c:VENUE_COORDS[1].c, venue:"The 44", city:"Glendale, AZ 85302", ev:null, label:"Darty Bars · every week" });
    if(!stops.length) stops.push({ c:VENUE_COORDS[0].c, venue:"Stratus Event Center", city:"Phoenix, AZ 85031", ev:null });

    const map=L.map(el,{zoomControl:false,attributionControl:false,scrollWheelZoom:false,dragging:false,
      doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false}).setView([33.52,-112.10],10);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd"}).addTo(map);
    const icon=L.divIcon({className:"dfl-marker",html:'<span class="bm-ping"></span><svg viewBox="0 0 24 34" width="30" height="42"><path d="M12 0C5.9 0 1 4.9 1 11c0 7.7 9.6 21.3 10 21.9.2.3.6.3.8 0C12.4 32.3 23 18.7 23 11 23 4.9 18.1 0 12 0z" fill="#ff2bd6" stroke="#14040f" stroke-width="1.4"/><circle cx="12" cy="11" r="4" fill="#14040f"/></svg>',iconSize:[30,42],iconAnchor:[15,40]});
    stops.forEach(s=>L.marker(s.c,{icon}).addTo(map));

    // past host venues — dim pins that show the footprint without joining the tour
    const PAST_VENUES=[
      { name:"The Duce",                c:[33.4423306,-112.0736119] },
      { name:"The Pemberton",           c:[33.4608259,-112.0708149] },
      { name:"Dink & Dine Pickle Park", c:[33.4353888,-111.8661161] }
    ];
    const pastIcon=L.divIcon({className:"dfl-marker-past",html:'<svg viewBox="0 0 24 34" width="20" height="28"><path d="M12 0C5.9 0 1 4.9 1 11c0 7.7 9.6 21.3 10 21.9.2.3.6.3.8 0C12.4 32.3 23 18.7 23 11 23 4.9 18.1 0 12 0z" fill="rgba(255,43,214,.4)" stroke="#14040f" stroke-width="1.4"/><circle cx="12" cy="11" r="4" fill="#14040f"/></svg>',iconSize:[20,28],iconAnchor:[10,26]});
    PAST_VENUES.forEach(v=>{
      if(!stops.some(s=>(s.venue||"").toLowerCase().includes(v.name.toLowerCase().slice(0,8))))
        L.marker(v.c,{icon:pastIcon,title:v.name}).addTo(map);
    });

    const nameEl=document.querySelector(".map-card .mc-name");
    const addrEl=document.querySelector(".map-card .mc-addr");
    // one tap = directions in whatever maps app fits the device. No buttons.
    const prefersApple=/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    let mapsUrl=CONFIG.mapStratus;
    function setCard(s){
      if(nameEl) nameEl.textContent=s.venue;
      if(addrEl){
        const d=s.ev?parseDate(s.ev.date):null;
        addrEl.textContent=(s.ev&&d)
          ? `${s.ev.title} · ${WK[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} · ${s.city}`
          : (s.label ? `${s.label} · ${s.city}` : s.city);
      }
      const q=encodeURIComponent(`${s.venue}, ${s.city}`);
      mapsUrl=prefersApple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    const mapWrap=document.getElementById("visit-map");
    if(mapWrap) mapWrap.addEventListener("click",()=>window.open(mapsUrl,"_blank","noopener"));

    let idx=-1, timer=null, started=false;
    function goTo(i){
      idx=((i%stops.length)+stops.length)%stops.length;
      const s=stops[idx];
      setCard(s);
      // flyTo naturally zooms out and back in between distant points
      map.flyTo(s.c,15,{duration:3.4,easeLinearity:.2});
    }
    function startTour(){
      if(started) return; started=true;
      setTimeout(()=>{
        map.invalidateSize();
        goTo(0);                                        // next event's venue first
        if(stops.length>1) timer=setInterval(()=>goTo(idx+1),9500);
      },140);
    }
    if("IntersectionObserver" in window){
      const ob=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){startTour();ob.disconnect();}}),{threshold:.3});
      ob.observe(document.getElementById("visit-map"));
    } else setTimeout(startTour,800);
    document.addEventListener("visibilitychange",()=>{ // don't burn the battery in a background tab
      if(document.hidden){ if(timer){clearInterval(timer);timer=null;} }
      else if(started&&stops.length>1&&!timer) timer=setInterval(()=>goTo(idx+1),9500);
    });
    setTimeout(()=>map.invalidateSize(),400);
    addEventListener("resize",()=>map.invalidateSize());
  }
  if(document.readyState==="complete") initMap();
  else addEventListener("load",initMap);
})();

/* ============================================================
   SHARED BEAT CLOCK + GLOBAL EXPORT
   ============================================================ */
const BEAT_MS=600;
function beatEnv(tMs){ const phase=(tMs%BEAT_MS)/BEAT_MS; return Math.pow(1-phase,2.2); }
(function(){
  const v=document.querySelector(".hero-video"); if(!v) return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){ v.removeAttribute("autoplay"); v.pause(); v.style.display="none"; return; }
  // desktop gets the HQ cut straight from the 4K master; phones keep the light file
  if(matchMedia("(min-width:860px)").matches){
    const s=v.querySelector("source");
    if(s){
      const tryPlay=()=>{ const p=v.play(); if(p&&p.catch)p.catch(()=>{}); };
      v.addEventListener("canplay",tryPlay,{once:true});   // play() can race load(); retry when decodable
      s.setAttribute("src","media/hero/hero-hq.mp4?v=2");
      v.load(); tryPlay();
    }
  }
})();
window.DFL={CONFIG,get EVENTS(){return EVENTS;},IC,beatEnv,BEAT_MS};

/* ============================================================
   GOOGLE EVENT SCHEMA — structured data so events surface in
   Google Search / "things to do in Phoenix". Rebuilt from the
   live EVENTS list (real data only; skips undated entries).
   ============================================================ */
function injectEventSchema(){
  const old=document.getElementById("evschema"); if(old) old.remove();
  const VENUES={
    "stratus event center":{address:"4344 W Indian School Rd, Phoenix, AZ 85031",city:"Phoenix"},
    "the 44":{address:"4494 W Peoria Ave, Glendale, AZ 85302",city:"Glendale"}
  };
  const items=EVENTS.filter(isUpcoming).filter(e=>e.date).map(ev=>{
    const v=VENUES[(ev.venue||"").toLowerCase()];
    const o={
      "@type":"Event","name":ev.title,
      "startDate":ev.date+(ev.time?("T"+(function(t){const m=t.match(/(\d+):(\d+)\s*(AM|PM)/i);if(!m)return"21:00";let h=+m[1]%12;if(/pm/i.test(m[3]))h+=12;return String(h).padStart(2,"0")+":"+m[2];})(ev.time)+":00-07:00"):""),
      "eventStatus":"https://schema.org/EventScheduled",
      "eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
      "organizer":{"@type":"Organization","name":"DartyForLife","url":"https://dartyforlife.com"},
      "offers":{"@type":"Offer","url":ev.url?("https://posh.vip/e/"+ev.url):CONFIG.posh,"availability":"https://schema.org/InStock"}
    };
    if(ev.flyer) o.image=[ev.flyer];
    if(v) o.location={"@type":"Place","name":ev.venue,"address":{"@type":"PostalAddress","streetAddress":v.address.split(",")[0],"addressLocality":v.city,"addressRegion":"AZ","addressCountry":"US"}};
    else if(ev.venue) o.location={"@type":"Place","name":ev.venue,"address":{"@type":"PostalAddress","addressLocality":(ev.city||"Phoenix").split(",")[0],"addressRegion":"AZ","addressCountry":"US"}};
    return o;
  });
  if(!items.length) return;
  const s=document.createElement("script");
  s.type="application/ld+json"; s.id="evschema";
  s.textContent=JSON.stringify({"@context":"https://schema.org","@graph":items});
  document.head.appendChild(s);
}

/* boot */
renderGrids();
renderNext();
injectEventSchema();
observeReveals();
