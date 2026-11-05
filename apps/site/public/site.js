/*
 * The site's only script.
 *
 * Light or dark: the site is light unless the visitor picked dark with the button in the header.
 * Loaded in <head> so the saved choice applies before the page is drawn (the CSP allows no
 * inline scripts). Storage can be unavailable, in which case the choice lasts for this page only.
 * Where the browser has view transitions, the new colors spread out from the button.
 *
 * The Features link (`data-section`) scrolls to that section of the home page without adding
 * `#features` to the address. From another page it goes home first and scrolls once there.
 */
(() => {
  const KEY = 'chatto-theme';
  const root = document.documentElement;
  const apply = (dark) => {
    if (dark) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
    document.querySelector('.theme-toggle')?.setAttribute('aria-pressed', String(dark));
  };
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {}
  apply(saved === 'dark');
  const SECTION = 'chatto-section';
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme === 'dark');

    for (const link of document.querySelectorAll('a[data-section]')) {
      link.addEventListener('click', (event) => {
        const id = link.dataset.section;
        if (document.getElementById(id)) {
          event.preventDefault();
          scrollTo(id);
          return;
        }
        try {
          sessionStorage.setItem(SECTION, id);
        } catch {}
      });
    }
    let pending = null;
    try {
      pending = sessionStorage.getItem(SECTION);
      sessionStorage.removeItem(SECTION);
    } catch {}
    if (pending) requestAnimationFrame(() => scrollTo(pending));

    const button = document.querySelector('.theme-toggle');
    button?.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      try {
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch {}
      if (!document.startViewTransition || still()) {
        apply(dark);
        return;
      }
      // The new colors spread in a circle from the button.
      const box = button.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      root.style.setProperty('--spread-x', `${x}px`);
      root.style.setProperty('--spread-y', `${y}px`);
      root.style.setProperty(
        '--spread-r',
        `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`,
      );
      root.classList.add('theming');
      const transition = document.startViewTransition(() => apply(dark));
      transition.finished.finally(() => root.classList.remove('theming'));
    });
  });
})();
