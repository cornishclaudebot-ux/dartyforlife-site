/* Decorative hero: never expose a paused native video player. */
document.querySelectorAll('.hero-video').forEach(video => {
  const surface = video.parentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fallback = () => surface.classList.remove('hero-is-playing');
  const restricted = () => motion.matches || navigator.connection?.saveData;
  video.controls = false;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  const show = () => {
    if (!restricted() && !video.paused && !video.ended) surface.classList.add('hero-is-playing');
  };
  video.addEventListener('playing', show);
  ['pause', 'ended', 'error', 'emptied'].forEach(name => video.addEventListener(name, fallback));
  const start = () => {
    if (restricted()) { video.pause(); fallback(); return; }
    try { const attempt = video.play(); if (attempt?.then) attempt.then(show, fallback); }
    catch { fallback(); }
  };
  motion.addEventListener?.('change', start);
  window.addEventListener('pageshow', start);
  // A normal interaction may permit playback inside an in-app browser.
  document.addEventListener('pointerdown', () => { if (video.paused) start(); }, {once:true, passive:true});
  start();
});
