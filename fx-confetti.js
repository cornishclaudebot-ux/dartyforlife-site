/* ============================================================
   DARTYFORLIFE — fx-confetti.js
   iMessage-style confetti shower. Small rectangles that tumble
   in 3D on the way down, drift on air, and fade as they land.
   No emojis, no images: pure canvas, brand palette only.

   Standalone classic script. Self-guards. Creates and destroys
   its own canvas so nothing renders (and nothing costs a frame)
   until something is actually worth celebrating.

   Reduced motion: renders one static settled frame, then clears.

   API
     DFL_CONFETTI.fire()                  // default burst
     DFL_CONFETTI.fire({count:220})       // heavier
     DFL_CONFETTI.isRunning()             // bool

   Palette: laser #1f6bff, magenta #ff2bd6, bright #ff5fe0,
            deep #8f0f78, cream #f6efe4 (NIGHT palette).
   ============================================================ */
(function(){
  "use strict";

  if (window.DFL_CONFETTI) return;                 // never double-install

  var COLORS = ["#1f6bff","#ff2bd6","#ff5fe0","#8f0f78","#f6efe4"];

  var GRAVITY   = 0.22;    // px/frame^2 at 60fps
  var DRAG      = 0.992;   // air resistance per frame
  var TERMINAL  = 7.2;     // max fall speed, keeps it floaty not heavy
  var FADE_AT   = 0.82;    // fraction of life where fade-out begins

  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch(e){}

  var canvas = null, ctx = null, raf = 0, pieces = [], running = false, dprv = 1;

  function dpr(){ return Math.min(1.5, (window.devicePixelRatio || 1)); }
  function rand(a,b){ return a + Math.random()*(b-a); }

  function mount(){
    canvas = document.createElement('canvas');
    canvas.className = 'dfl-confetti';
    var s = canvas.style;
    s.position = 'fixed'; s.inset = '0'; s.width = '100%'; s.height = '100%';
    s.pointerEvents = 'none';                       // never eats a tap
    s.zIndex = '2147483000';                        // above the fold, below nothing
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, {passive:true});
  }

  function unmount(){
    window.removeEventListener('resize', resize);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null; pieces = []; running = false;
  }

  function resize(){
    if (!canvas) return;
    dprv = dpr();
    canvas.width  = Math.floor(window.innerWidth  * dprv);
    canvas.height = Math.floor(window.innerHeight * dprv);
    ctx.setTransform(dprv, 0, 0, dprv, 0, 0);
  }

  function spawn(count){
    var W = window.innerWidth, i, p;
    for (i = 0; i < count; i++){
      p = {
        x:  rand(-0.05, 1.05) * W,
        y:  rand(-window.innerHeight * 0.45, -20),   // staggered above the fold
        vx: rand(-1.1, 1.1),
        vy: rand(1.5, 4.0),
        w:  rand(6, 11),
        h:  rand(9, 15),
        // 3D tumble: two independent axes so pieces flash edge-on
        rot:   rand(0, Math.PI * 2),
        vrot:  rand(-0.16, 0.16),
        flip:  rand(0, Math.PI * 2),
        vflip: rand(0.07, 0.20),
        sway:  rand(0.010, 0.028),                    // air-drift frequency
        phase: rand(0, Math.PI * 2),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life:  0,
        maxLife: rand(230, 330)
      };
      pieces.push(p);
    }
  }

  function step(){
    var H = window.innerHeight, i, p, alpha, sx;
    ctx.clearRect(0, 0, window.innerWidth, H);

    for (i = pieces.length - 1; i >= 0; i--){
      p = pieces[i];
      p.life++;

      p.vy = Math.min(p.vy + GRAVITY, TERMINAL);
      p.vx *= DRAG;
      p.phase += p.sway;
      p.x += p.vx + Math.sin(p.phase) * 0.9;          // drift, not a straight drop
      p.y += p.vy;
      p.rot  += p.vrot;
      p.flip += p.vflip;

      // retire once it's well past the fold or out of life
      if (p.y - 40 > H || p.life > p.maxLife){ pieces.splice(i, 1); continue; }

      alpha = 1;
      if (p.life > p.maxLife * FADE_AT){
        alpha = 1 - (p.life - p.maxLife * FADE_AT) / (p.maxLife * (1 - FADE_AT));
      }

      sx = Math.cos(p.flip);                          // edge-on when this hits 0
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sx, 1);
      ctx.globalAlpha = alpha < 0 ? 0 : alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (pieces.length){ raf = requestAnimationFrame(step); }
    else { unmount(); }                               // gets out of the way
  }

  function staticFrame(){
    // reduced motion: show it happened, don't animate it
    var H = window.innerHeight, i, p;
    for (i = 0; i < pieces.length; i++){
      p = pieces[i];
      ctx.save();
      ctx.translate(p.x, H - rand(10, 90));
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    setTimeout(unmount, 1400);
  }

  function fire(opts){
    opts = opts || {};
    var count = opts.count || (Math.min(window.innerWidth, window.innerHeight) < 700 ? 110 : 170);

    if (!canvas) mount();
    spawn(count);

    if (reduce){ staticFrame(); return; }

    if (!running){
      running = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    }
  }

  window.DFL_CONFETTI = {
    fire: fire,
    isRunning: function(){ return running; }
  };
})();
