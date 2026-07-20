/* ============================================================
   DARTYFORLIFE — fx-dotfield.js
   Slow radial dot-field background. Animates every
   <canvas class="dotfield"> (inset:0 inside a section, behind
   content). Concentric rings of dots breathe outward from center.
   Standalone classic script. Self-guards. Reduced-motion static frame.
   Reads the shared clock from window.DFL. Desert palette:
   laser #1f6bff, magenta #ff2bd6 (NIGHT palette).
   ============================================================ */
(function(){
  "use strict";

  var canvases = [].slice.call(document.querySelectorAll('canvas.dotfield'));
  if(!canvases.length) return;

  var DIM   = { r:0x0f, g:0x3a, b:0x99 };  // #0f3a99 deep laser (dim)
  var PEAK  = { r:0x1f, g:0x6b, b:0xff };  // #1f6bff laser blue (peak)
  var GOLD  = { r:0xff, g:0x2b, b:0xd6 };  // #ff2bd6 magenta (every 4th ring)
  var CENTER= { r:0xff, g:0x5f, b:0xe0 };  // #ff5fe0 bright magenta center

  var MAX_ALPHA = 0.42;
  var RING_STEP_DESKTOP = 26, RING_STEP_MOBILE = 34, DOT_SPACING = 30;

  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch(e){}

  function dpr(){ return Math.min(1.5, (window.devicePixelRatio || 1)); }
  function isMobile(){ return Math.min(window.innerWidth, window.innerHeight) < 700; }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function mix(c1,c2,t){ return { r:Math.round(lerp(c1.r,c2.r,t)), g:Math.round(lerp(c1.g,c2.g,t)), b:Math.round(lerp(c1.b,c2.b,t)) }; }

  function Field(canvas){
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.dots=[]; this.maxR=1; this.cx=0; this.cy=0; this.w=0; this.h=0; this.visible=false; this.built=false;
  }
  Field.prototype.resize=function(){
    var c=this.canvas, rect=c.getBoundingClientRect();
    var w=Math.max(1,Math.round(rect.width)), h=Math.max(1,Math.round(rect.height)), d=dpr();
    c.width=Math.round(w*d); c.height=Math.round(h*d);
    this.w=w; this.h=h; this.ctx.setTransform(d,0,0,d,0,0);
    this.cx=w/2; this.cy=h/2; this.maxR=Math.sqrt(this.cx*this.cx+this.cy*this.cy);
    this.build();
  };
  Field.prototype.build=function(){
    var dots=[], step=isMobile()?RING_STEP_MOBILE:RING_STEP_DESKTOP, maxR=this.maxR, ringIndex=0;
    dots.push({ x:this.cx, y:this.cy, ring:0, gold:false, center:true });
    for(var r=step; r<=maxR; r+=step){
      ringIndex++;
      var isGold=(ringIndex%4===0);
      var dotsPerRing=Math.round(2*Math.PI*r/DOT_SPACING); if(dotsPerRing<1) dotsPerRing=1;
      var phase0=ringIndex*0.6;
      for(var k=0;k<dotsPerRing;k++){
        var a=phase0+(k/dotsPerRing)*Math.PI*2;
        dots.push({ x:this.cx+Math.cos(a)*r, y:this.cy+Math.sin(a)*r, ring:r, gold:isGold, center:false });
      }
    }
    this.dots=dots; this.built=true;
  };
  Field.prototype.draw=function(env, snareEnv, calm){
    var ctx=this.ctx; ctx.clearRect(0,0,this.w,this.h);
    if(!this.built) return;
    var prev=ctx.globalCompositeOperation; ctx.globalCompositeOperation='lighter';
    var maxR=this.maxR, kickWave=env*maxR, snareWave=snareEnv*maxR;
    var sigma=Math.max(34,maxR*0.10), twoS2=2*sigma*sigma;
    var sigmaS=Math.max(26,maxR*0.085), twoS2S=2*sigmaS*sigmaS;
    var dots=this.dots;
    for(var i=0;i<dots.length;i++){
      var dt=dots[i], ring=dt.ring;
      var dk=ring-kickWave, kick=Math.exp(-(dk*dk)/twoS2);
      var ds=ring-snareWave, snare=0.6*Math.exp(-(ds*ds)/twoS2S);
      var pulse=kick+snare; if(pulse>1) pulse=1;
      if(dt.center) pulse=Math.max(pulse,0.55);
      var bright=0.18+0.82*pulse;
      var col;
      if(dt.center) col=CENTER;
      else if(dt.gold) col=mix(DIM,GOLD,Math.min(1,pulse));
      else col=mix(DIM,PEAK,Math.min(1,pulse));
      var alpha=MAX_ALPHA*bright;
      var baseR=dt.center?2.6:1.4;
      var rad=baseR+pulse*(dt.center?4.5:2.6);
      if(calm){
        var falloff=1-Math.min(1,ring/maxR);
        alpha=MAX_ALPHA*(0.22+0.30*falloff); rad=baseR+0.6;
        col=dt.center?CENTER:(dt.gold?mix(DIM,GOLD,0.25):DIM);
      }
      ctx.globalAlpha=alpha;
      ctx.fillStyle='rgb('+col.r+','+col.g+','+col.b+')';
      ctx.beginPath(); ctx.arc(dt.x,dt.y,rad,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation=prev;
  };

  var fields=canvases.map(function(c){ return new Field(c); });
  fields.forEach(function(f){ f.resize(); });

  if(reduce){
    fields.forEach(function(f){ f.draw(0,0,true); });
    window.addEventListener('resize',function(){ fields.forEach(function(f){ f.resize(); f.draw(0,0,true); }); },{passive:true});
    return;
  }

  if('IntersectionObserver' in window){
    var iox=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var f=fields.filter(function(x){ return x.canvas===en.target; })[0];
        if(f) f.visible=en.isIntersecting && en.intersectionRatio>0;
      });
    },{ threshold:[0,0.01,0.5] });
    fields.forEach(function(f){ iox.observe(f.canvas); });
  } else { fields.forEach(function(f){ f.visible=true; }); }

  var resizePending=false;
  window.addEventListener('resize',function(){
    if(resizePending) return; resizePending=true;
    requestAnimationFrame(function(){ resizePending=false; fields.forEach(function(f){ f.resize(); }); });
  },{passive:true});

  var raf=0;
  function slowWave(now,period,offset){ var phase=((now+(offset||0))%period)/period; return 0.5-0.5*Math.cos(phase*Math.PI*2); }
  function frame(){
    raf=0;
    if(!document.hidden){
      var now=performance.now();
      var env=slowWave(now,7600,0), snare=slowWave(now,7600,3800)*0.5;
      for(var i=0;i<fields.length;i++){ if(fields[i].visible) fields[i].draw(env,snare,false); }
    }
    schedule();
  }
  function schedule(){ if(!raf) raf=requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){ if(raf){ cancelAnimationFrame(raf); raf=0; } } else schedule();
  });
  schedule();
})();
