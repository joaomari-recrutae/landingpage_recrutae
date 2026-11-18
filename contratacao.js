/* Optional reading and printing controls. Legal text, download and links work without it. */
(() => {
  const index = document.getElementById('termsIndex');
  const progress = document.getElementById('termsProgress');
  const links = [...document.querySelectorAll('.terms-index a')];
  const sections = [...document.querySelectorAll('.terms-content section')];
  const compact = matchMedia('(max-width: 700px)');
  const applyIndex = () => { index.open = !compact.matches; };
  applyIndex();
  compact.addEventListener('change', applyIndex);
  let scheduled = false;
  function updateReading() {
    scheduled = false;
    const height = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${height > 0 ? Math.min(1, Math.max(0, scrollY / height)) : 1})`;
    let current = sections[0];
    for (const section of sections) if (section.getBoundingClientRect().top <= 160) current = section;
    links.forEach(link => {
      if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); } }, { passive: true });
  addEventListener('resize', updateReading);
  addEventListener('pageshow', updateReading);
  document.fonts?.ready.then(updateReading);
  updateReading();
  const print = document.getElementById('printTerms');
  print.hidden = false;
  print.addEventListener('click', () => window.print());
})();
