/* One navigation capsule, available on every public page. No network or animation loop. */
(() => {
  const bar = document.getElementById('heroTabs');
  if (!bar) return;
  const pill = bar.querySelector('.gtabs-pill');
  const tabs = [...bar.querySelectorAll('.gtab')];
  if (!pill || !tabs.length) return;
  const page = location.pathname.split('/').pop() || 'index.html';
  const current = tabs.findIndex(tab => tab.getAttribute('href') === page);
  // The pill only ever rests on the page you are actually on. Home has its own
  // tab, so the landing page no longer rests on Headliners. Pages outside the
  // dock (privacy, rentals, guides) rest with no pill until a tab is pressed.
  const restIndex = current;
  tabs.forEach((tab, index) => {
    if (index === current) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  let highlighted = restIndex;
  const moveTo = index => {
    const tab = tabs[index];
    highlighted = index;
    bar.classList.toggle('no-pill', !tab);
    if (!tab) { tabs.forEach(item => item.classList.remove('is-active')); return; }
    pill.style.width = tab.offsetWidth + 'px';
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    tabs.forEach((item, position) => item.classList.toggle('is-active', position === index));
  };
  moveTo(restIndex);
  requestAnimationFrame(() => bar.classList.add('ready'));
  tabs.forEach((tab, index) => {
    tab.addEventListener('focus', () => moveTo(index));
    tab.addEventListener('pointerdown', () => moveTo(index));
    // Leave link navigation native: no artificial delay before changing page.
  });
  bar.addEventListener('focusout', event => {
    if (!bar.contains(event.relatedTarget)) moveTo(restIndex);
  });
  bar.addEventListener('pointercancel', () => moveTo(restIndex));
  addEventListener('pageshow', () => moveTo(restIndex));
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => moveTo(highlighted));
    observer.observe(bar);
  } else addEventListener('resize', () => moveTo(highlighted));
  if (document.fonts?.ready) document.fonts.ready.then(() => moveTo(highlighted));
})();
