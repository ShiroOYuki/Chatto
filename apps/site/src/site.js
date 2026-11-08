/*
 * The site's only script.
 *
 * Light or dark: the site is light unless the visitor picked dark with the button in the header.
 * Loaded in <head> so the saved choice applies before the page is drawn (the CSP allows no
 * inline scripts). Storage can be unavailable, in which case the choice lasts for this page only.
 * Where the browser has view transitions, the new colors spread out from the button.
 *
 * Language menu: a <details> in the header, so it opens without this script; with it, a click
 * outside or Escape closes the menu.
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
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme === 'dark');

    const menu = document.querySelector('.lang-menu');
    if (menu) {
      document.addEventListener('click', (event) => {
        if (menu.open && !menu.contains(event.target)) menu.open = false;
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !menu.open) return;
        menu.open = false;
        menu.querySelector('summary')?.focus();
      });
    }

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
