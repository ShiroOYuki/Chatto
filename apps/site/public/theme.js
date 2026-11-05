/*
 * Light or dark: the site is light unless the visitor picked dark with the button in the header.
 * Loaded in <head> so the saved choice applies before the page is drawn (the CSP allows no
 * inline scripts). Storage can be unavailable, in which case the choice lasts for this page only.
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
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme === 'dark');
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      apply(dark);
      try {
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch {}
    });
  });
})();
