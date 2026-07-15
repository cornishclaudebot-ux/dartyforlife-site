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
  { date:"2026-08-01", time:"", title:"MELTDOWN", url:"",
    venue:"Stratus Event Center", city:"Phoenix, AZ", series:"major" },
  { date:"2026-08-09", time:"", title:"POOL HOUSE Vol. 2", url:"",
    venue:"Revealed 14 days out", city:"Scottsdale, AZ", series:"bar", free:true },
  { date:"2026-08-22", time:"", title:"REUNION", url:"",
    venue:"Stratus Event Center", city:"Phoenix, AZ", series:"major" },
  /* Posh drafts (visible in the dashboard) — Get Notified until they go live */
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
        <a href="${home}#rentals">Rent our gear</a>
        <a href="${CONFIG.ig}" target="_blank" rel="noopener">Instagram</a>
        <a href="${CONFIG.tt}" target="_blank" rel="noopener">TikTok</a>
        <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span id="year"></span> DartyForLife · Desert Drinkers · Phoenix, AZ</span>
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
  return `
  <article class="ev reveal${ev.flyer?"":" noart"}" data-series="${s}">
    <div class="ev-art" ${art}></div>
    <div class="ev-veil"></div>
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
   LIVE GOING COUNTS — per-sale, straight from our own pipeline.
   Every Posh sale -> webhook -> fan-out -> Social Command Center DB;
   this polls the public aggregate every 60s. Shows the max of the
   live number and the baked one so the count never moves backwards.
   ============================================================ */
const LIVE_GOING_URL="https://social-command-center-lemon.vercel.app/api/public/going";
function applyLiveCounts(){
  fetch(LIVE_GOING_URL,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!Array.isArray(j.events)) return;
    const m=new Map(j.events.map(e=>[String(e.name).trim().toLowerCase(),Number(e.going)||0]));
    let changed=false;
    EVENTS.forEach(ev=>{
      const live=m.get(String(ev.title).trim().toLowerCase());
      if(typeof live==="number"&&live>(ev.sold||0)){ ev.sold=live; changed=true; }
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
   THE LIST — lead capture (Netlify Forms once deployed)
   "Get Notified" buttons tag the signup with the event so the
   drop-alert automation knows who to text about what.
   ============================================================ */
const listForm=document.getElementById("listForm");
if(listForm){
  listForm.addEventListener("submit",e=>{
    e.preventDefault();
    const body=new URLSearchParams(new FormData(listForm)).toString();
    fetch("/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}).catch(()=>{});
    listForm.querySelectorAll(".field, button[type=submit], .list-fine").forEach(el=>el.style.display="none");
    document.getElementById("listMsg").hidden=false;
  });
}
/* rentals — same Netlify pattern as The List */
const rentForm=document.getElementById("rentForm");
if(rentForm){
  rentForm.addEventListener("submit",e=>{
    e.preventDefault();
    if(!rentForm.querySelector('input[name="equipment"]:checked')){
      alert("Pick at least one piece of gear."); return;
    }
    const body=new URLSearchParams(new FormData(rentForm)).toString();
    fetch("/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}).catch(()=>{});
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
  const reels=document.querySelectorAll(".reel video, .acard video, .ccard video");
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
