/**
 * Builds chattolive.com into dist/: the home page, privacy notice, terms and a 404 page, in
 * English (/) and Traditional Chinese (/zh-tw/). The legal texts come from `@chatto/share`
 * (`legalText.ts`, loaded as TypeScript by Node), so the site and the app say the same thing.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_DISCLAIMER, LEGAL_UPDATED, SHARE_TERMS_TEXT } from '../../../packages/share/src/legalText.ts';
import { CONTENT, DOWNLOAD_URL, GITHUB_URL, SUPPORT_EMAIL } from './content.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '..', '..');
const dist = join(root, 'dist');
const SITE = 'https://chattolive.com';

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/** `標籤：內容` / `Label: text` → the label in bold. */
function labelled(item) {
  const match = /^(.{1,40}?)(：|: )(.*)$/s.exec(item);
  return match ? `<strong>${escape(match[1])}</strong>${escape(match[2])}${escape(match[3])}` : escape(item);
}

const PAGES = { home: '/', privacy: '/privacy', terms: '/terms' };
const href = (locale, page) => (locale === 'en' ? PAGES[page] : `/zh-tw${page === 'home' ? '/' : PAGES[page]}`);

/** The wordmark, in its light-on-dark version when the page is dark. */
const logo = () =>
  `<picture><source srcset="/chatto-logo-dark.svg" media="(prefers-color-scheme: dark)"><img class="logo" src="/chatto-logo.svg" alt="Chatto" width="818" height="243"></picture>`;

function layout(locale, page, { title, description, body }) {
  const t = CONTENT[locale];
  const other = locale === 'en' ? 'zh-TW' : 'en';
  const nav = ['home', 'privacy', 'terms']
    .map(
      (key) => `<a href="${href(locale, key)}"${key === page ? ' aria-current="page"' : ''}>${escape(t.nav[key])}</a>`,
    )
    .join('');
  const alternates = page
    ? `<link rel="alternate" hreflang="en" href="${SITE}${href('en', page)}">
<link rel="alternate" hreflang="zh-Hant-TW" href="${SITE}${href('zh-TW', page)}">
<link rel="alternate" hreflang="x-default" href="${SITE}${href('en', page)}">
<link rel="canonical" href="${SITE}${href(locale, page)}">`
    : '<meta name="robots" content="noindex">';
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="theme-color" content="#27500a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Chatto">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
${alternates}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="page-${page ?? 'missing'}">
<header class="top">
  <a class="brand" href="${href(locale, 'home')}" aria-label="Chatto">${logo()}</a>
  <nav aria-label="${escape(t.nav.home)}">${nav}<a class="lang" href="${href(other, page ?? 'home')}" hreflang="${CONTENT[other].lang}" lang="${CONTENT[other].lang}">${escape(t.otherLanguage)}</a></nav>
</header>
<main>
${body}
</main>
<footer class="bottom">
  <div>
    <p>${escape(t.footer.license)}${t.space}${escape(t.footer.unofficial)}</p>
    <p><a href="${href(locale, 'privacy')}">${escape(t.nav.privacy)}</a> · <a href="${href(locale, 'terms')}">${escape(t.nav.terms)}</a> · <a href="${GITHUB_URL}">GitHub</a> · ${escape(t.footer.contact)} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function home(locale) {
  const t = CONTENT[locale].home;
  const features = t.features
    .map((feature) => `<li><h3>${escape(feature.title)}</h3><p>${escape(feature.body)}</p></li>`)
    .join('\n');
  return layout(locale, 'home', {
    title: t.title,
    description: t.description,
    body: `<section class="hero">
  <div class="hero-text">
    <h1>${escape(t.tagline).replace(/\n/g, '<br>')}</h1>
    <p class="lead">${escape(t.lead)}</p>
    <p class="actions">
      <a class="button primary" href="${DOWNLOAD_URL}">${escape(t.download)}</a>
      <a class="button" href="${GITHUB_URL}">${escape(t.source)}</a>
    </p>
    <p class="note">${escape(t.note)}</p>
  </div>
  <figure class="hero-preview"><img src="/chat-preview.png" alt="${escape(t.previewAlt)}" width="600" height="640"></figure>
</section>
<section class="features" aria-labelledby="features-title">
  <h2 id="features-title">${escape(t.featuresTitle)}</h2>
  <ul>
${features}
  </ul>
</section>`,
  });
}

const updated = (locale) =>
  `<p class="updated">${escape(CONTENT[locale].updated)} <time datetime="${LEGAL_UPDATED}">${LEGAL_UPDATED}</time></p>`;

const list = (items) => `<ol>${items.map((item) => `<li>${labelled(item)}</li>`).join('\n')}</ol>`;
const paragraphs = (sections) =>
  sections.map((section) => `<h3>${escape(section.title)}</h3><p>${escape(section.body)}</p>`).join('\n');

function privacy(locale) {
  const t = CONTENT[locale].privacy;
  const sharing = SHARE_TERMS_TEXT[locale].privacy;
  const appData = APP_DISCLAIMER[locale].find((_, index) => index === 2);
  return layout(locale, 'privacy', {
    title: `${t.title} — Chatto`,
    description: sharing.title,
    body: `<article class="legal">
<h1>${escape(t.title)}</h1>
${updated(locale)}
<p>${escape(t.intro)} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>${locale === 'en' ? '.' : '。'}</p>
<h2>${escape(t.app)}</h2>
<p>${escape(appData.body)}</p>
<h2>${escape(t.sharing)}</h2>
${list(sharing.items)}
<h2>${escape(t.signIn.title)}</h2>
<p>${escape(t.signIn.body)}</p>
</article>`,
  });
}

function terms(locale) {
  const t = CONTENT[locale].terms;
  const sharing = SHARE_TERMS_TEXT[locale].terms;
  // No warranty, unofficial software and chat content; the data section is on the privacy page.
  const app = APP_DISCLAIMER[locale].filter((_, index) => index !== 2);
  return layout(locale, 'terms', {
    title: `${t.title} — Chatto`,
    description: sharing.title,
    body: `<article class="legal">
<h1>${escape(t.title)}</h1>
${updated(locale)}
<p>${escape(t.intro)} <a href="${GITHUB_URL}/blob/main/LICENSE">GPL-3.0-or-later</a>${locale === 'en' ? '.' : '。'}</p>
<h2>${escape(sharing.title)}</h2>
${list(sharing.items)}
<h2>${escape(t.app)}</h2>
${paragraphs(app)}
</article>`,
  });
}

function notFound() {
  const en = CONTENT.en.notFound;
  const zh = CONTENT['zh-TW'].notFound;
  return layout('en', null, {
    title: `${en.title} — Chatto`,
    description: en.body,
    body: `<article class="legal missing">
<h1>${escape(en.title)}</h1>
<p>${escape(en.body)} <a href="/">${escape(en.back)}</a></p>
<p lang="zh-Hant-TW">${escape(zh.body)} <a href="/zh-tw/">${escape(zh.back)}</a></p>
</article>`,
  });
}

/** Copies an SVG without the C2PA manifest the file transfer added. */
function copySvg(from, to) {
  const svg = readFileSync(from, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  writeFileSync(to, svg.replace(/\s+xmlns:c2pa="[^"]*"/, ''));
}

/** Huninn from @fontsource, woff2 only, served from /fonts/. */
function copyFonts() {
  const require = createRequire(import.meta.url);
  const dir = dirname(require.resolve('@fontsource/huninn/400.css'));
  mkdirSync(join(dist, 'fonts'), { recursive: true });
  for (const file of readdirSync(join(dir, 'files')))
    if (file.endsWith('-400-normal.woff2')) copyFileSync(join(dir, 'files', file), join(dist, 'fonts', file));
  return readFileSync(join(dir, '400.css'), 'utf8')
    .replace(
      /url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\([^)]+\) format\('woff'\)/g,
      "url(/fonts/$1) format('woff2')",
    )
    .replace(/\/\*[^*]*\*\/\n?/g, '');
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'zh-tw'), { recursive: true });
const write = (path, html) => writeFileSync(join(dist, path), html);
for (const [locale, dir] of [
  ['en', ''],
  ['zh-TW', 'zh-tw/'],
]) {
  write(`${dir}index.html`, home(locale));
  write(`${dir}privacy.html`, privacy(locale));
  write(`${dir}terms.html`, terms(locale));
}
write('404.html', notFound());

const fonts = copyFonts();
writeFileSync(join(dist, 'styles.css'), `${fonts}\n${readFileSync(join(root, 'src', 'styles.css'), 'utf8')}`);
for (const file of readdirSync(join(root, 'public'))) copyFileSync(join(root, 'public', file), join(dist, file));
copySvg(join(repo, 'assets', 'chatto-logo.svg'), join(dist, 'chatto-logo.svg'));
copySvg(join(repo, 'assets', 'chatto-logo-dark.svg'), join(dist, 'chatto-logo-dark.svg'));
copySvg(join(repo, 'assets', 'chatto-icon.svg'), join(dist, 'icon.svg'));
copyFileSync(join(repo, 'assets', 'chatto-cover-chat.png'), join(dist, 'og.png'));
console.log(`Built ${dist}`);
