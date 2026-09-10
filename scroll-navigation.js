/* Shared section navigation, including dynamically created mobile menus. */
(() => {
  const findTarget = hash => {
    try { return hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; }
    catch { return null; }
  };
  const scrollToSection = (target, updateHash = false) => {
    window.closeMobileMenu?.();
    document.querySelectorAll('.ros-mobile-nav[open]').forEach(menu => { menu.open = false; });
    const header = document.querySelector('#navbar, .ros-header, .privacy-header');
    const fixed = header && ['sticky', 'fixed'].includes(getComputedStyle(header).position);
    const offset = (fixed ? header.getBoundingClientRect().height : 0) + 24;
    if (updateHash && location.hash !== `#${target.id}`) {
      history.pushState(null, '', `#${encodeURIComponent(target.id)}`);
    }
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + scrollY - offset),
      behavior: 'smooth'
    });
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
  };
  window.recrutaeScrollToSection = scrollToSection;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    const target = findTarget(url.hash);
    if (!target || target.hidden) return;
    event.preventDefault();
    scrollToSection(target, true);
  });
  const followHash = () => {
    const target = findTarget(location.hash);
    if (target && !target.hidden) scrollToSection(target);
  };
  window.addEventListener('hashchange', followHash);
  window.addEventListener('load', () => requestAnimationFrame(followHash), { once: true });
})();
