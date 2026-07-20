/* ============================================================
   DARTYFORLIFE — fx-sun.js
   Concentric rings rise and assemble into a glowing desert sun on
   #sun scroll progress: rays radiate, heat-rings shimmer, and the
   saguaro mark sits dead center. Continuous slow rotation + beat
   pulse once formed. Standalone classic script. Self-guards.
   Reduced-motion → static formed sun. Reads window.DFL beat clock. NIGHT palette: magenta orb, laser accents.
   ============================================================ */
(function(){
  'use strict';

  var canvas = document.getElementById('sunCanvas');
  if(!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if(!ctx) return;

  var stage = document.querySelector('#sun .sun-stage');
  var hasStage = !!stage;

  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch(e){}

  // palette
  var ORANGE = '#ff2bd6', LIGHT = '#ff5fe0', DEEP = '#8f0f78', GOLD = '#1f6bff', CREAM = '#f6efe4';

  function beat(){
    var T = window.DFL;
    if(T && typeof T.beatEnv === 'function') return T.beatEnv(performance.now());
    return 0;
  }

  var DPR=1, cw=0, ch=0;
  function resize(){
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    var rect = canvas.getBoundingClientRect();
    cw = rect.width || canvas.clientWidth || 560;
    ch = rect.height || canvas.clientHeight || 560;
    canvas.width  = Math.max(1, Math.round(cw*DPR));
    canvas.height = Math.max(1, Math.round(ch*DPR));
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  // scroll progress across the tall stage while the inner canvas is pinned
  function progress(){
    if(!hasStage) return 1;
    var r = stage.getBoundingClientRect();
    var total = stage.offsetHeight - (window.innerHeight || document.documentElement.clientHeight);
    if(total <= 0) return 1;
    var p = (-r.top)/total;
    return p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  var spin = 0, lastP = reduce ? 1 : 0;

  function clear(){ ctx.clearRect(0,0,cw,ch); }

  // PHASE A: concentric rings flipping edge-on -> flat as they settle
  function drawRings(cx, cy, R, flip, alphaMul){
    if(alphaMul == null) alphaMul = 1;
    var N = 7;
    var scaleY = Math.cos(flip * Math.PI/2); if(scaleY < 0.001) scaleY = 0.001;
    ctx.save(); ctx.translate(cx, cy);
    for(var i=0;i<N;i++){
      var t = i/(N-1);
      var rad = R*(1 - t*0.82);
      ctx.strokeStyle = (i%2===0) ? ORANGE : GOLD;
      ctx.lineWidth = Math.max(1.5, R*0.018*(1 - t*0.35));
      ctx.globalAlpha = (0.55 + 0.45*(1 - t)) * alphaMul;
      ctx.beginPath();
      ctx.ellipse(0,0,rad,rad*scaleY,0,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // PHASE B/C: the glowing desert sun with radiating rays + saguaro core
  function drawSun(cx, cy, R, angle, pulse, morph){
    ctx.save(); ctx.translate(cx, cy);
    var rScale = 0.84 + 0.16*morph;
    var rDisc = R*rScale;

    // outer corona rays (rotating, beat-pulsed length)
    ctx.save();
    ctx.rotate(angle*0.5);
    var rays = 28;
    var rayLen = rDisc*(0.30 + 0.12*pulse);
    ctx.globalAlpha = 0.5*morph;
    for(var i=0;i<rays;i++){
      var a = (i/rays)*Math.PI*2;
      var long = (i%2===0);
      var len = rayLen*(long?1:0.62);
      var w = rDisc*(long?0.028:0.016);
      ctx.save(); ctx.rotate(a);
      var rg = ctx.createLinearGradient(0, -rDisc, 0, -rDisc - len);
      rg.addColorStop(0, 'rgba(255,95,224,0.6)');
      rg.addColorStop(1, 'rgba(255,43,214,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(-w, -rDisc);
      ctx.lineTo(w, -rDisc);
      ctx.lineTo(0, -rDisc - len);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // soft glow halo behind disc
    var halo = ctx.createRadialGradient(0,0,rDisc*0.4,0,0,rDisc*1.5);
    halo.addColorStop(0, 'rgba(255,43,214,'+(0.28*morph).toFixed(3)+')');
    halo.addColorStop(1, 'rgba(255,43,214,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0,0,rDisc*1.5,0,Math.PI*2); ctx.fill();

    // sun disc body
    var g = ctx.createRadialGradient(0, -rDisc*0.2, rDisc*0.05, 0, 0, rDisc);
    g.addColorStop(0, LIGHT);
    g.addColorStop(0.55, ORANGE);
    g.addColorStop(1, DEEP);
    ctx.globalAlpha = morph;
    ctx.beginPath(); ctx.arc(0,0,rDisc,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();

    // soft inner-core brightening so the disc reads as a glowing sun (no rings/rim)
    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, rDisc*0.7);
    core.addColorStop(0, 'rgba(255,190,240,'+(0.35*morph).toFixed(3)+')');
    core.addColorStop(1, 'rgba(255,190,240,0)');
    ctx.globalAlpha = morph;
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0,0,rDisc*0.7,0,Math.PI*2); ctx.fill();

    ctx.globalAlpha = 1; ctx.restore();
  }

  function render(p, forceFinished){
    if(!cw || !ch) resize();
    clear();
    var cx = cw/2, cy = ch/2, R = Math.min(cw, ch)*0.40;

    if(forceFinished || reduce){ drawSun(cx, cy, R, 0, beat(), 1); return; }

    var RINGS_END = 0.55, MORPH_END = 0.78;
    if(p < RINGS_END){
      var a = p/RINGS_END, ease = a*a*(3-2*a);
      var scale = 0.10 + 0.90*ease;
      var yOff = (ch*0.42)*(1-ease);   // start low, rise to center like a sunrise
      var flip = 1 - ease;
      var alpha = 0.20 + 0.80*ease;
      drawRings(cx, cy + yOff, R*scale, flip, alpha);
      if(a > 0.82){ var pre=(a-0.82)/0.18; drawSun(cx, cy, R, spin, beat(), pre); }
    } else if(p < MORPH_END){
      var b = (p-RINGS_END)/(MORPH_END-RINGS_END);
      var morph = Math.min(1, b*1.7);
      if(b < 0.30) drawRings(cx, cy, R, 0, 1 - b*3);
      drawSun(cx, cy, R, spin, beat(), morph);
    } else {
      drawSun(cx, cy, R, spin, beat(), 1);
    }
  }

  var running=false, inView=!hasStage, rafId=0;
  function shouldRun(){ return !reduce && !document.hidden && inView; }
  function frame(){
    rafId=0;
    if(!shouldRun()){ running=false; return; }
    lastP = progress();
    if(lastP >= 1){ spin += 0.006; render(1); }
    else { spin += 0.006*(lastP>0.55?1:0); render(lastP); }
    running=true; rafId=requestAnimationFrame(frame);
  }
  function start(){ if(running || !shouldRun()) return; running=true; rafId=requestAnimationFrame(frame); }
  function stop(){ running=false; if(rafId){ cancelAnimationFrame(rafId); rafId=0; } }

  if(reduce || !hasStage){
    resize();
    var drawStatic=function(){ render(lastP, true); };
    drawStatic();
    window.addEventListener('resize', drawStatic, {passive:true});
    return;
  }

  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ inView=en.isIntersecting; if(inView) start(); else stop(); });
    },{ threshold:0.01 });
    io.observe(document.getElementById('sun') || stage);
  } else inView=true;

  document.addEventListener('visibilitychange', function(){ if(document.hidden) stop(); else start(); });
  window.addEventListener('resize', function(){ resize(); render(lastP); }, {passive:true});

  resize();
  render(progress());
  start();
})();
