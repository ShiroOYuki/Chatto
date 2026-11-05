/**
 * Builds chattolive.com into dist/, in English (/) and Traditional Chinese (/zh-tw/):
 * home, themes, guide, FAQ, the changelog of each product, privacy notice, terms and a 404 page.
 * The legal texts come from `@chatto/share` (`legalText.ts`, loaded as TypeScript by Node), so
 * the site and the app say the same thing. The site is light unless the visitor switches it to
 * dark with the button in the header (`src/site.js` remembers the choice).
 *
 * Clicks should not wait: styles and script are written under /static/ with a content hash in
 * their names and cached for good (see public/_headers), and speculation rules fetch a page
 * before it is clicked: the header's links right away, other links when the pointer rests on them.
 *
 * The look is a streamer's notebook: grid paper, real pieces of the app taped on like photos,
 * the built-in themes as a sheet of stickers, steps as a to-do list and questions on sticky notes.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_DISCLAIMER, LEGAL_UPDATED, SHARE_TERMS_TEXT } from '../../../packages/share/src/legalText.ts';
import { CHANGELOG } from './changelog.mjs';
import { CONTENT, DOWNLOAD_URL, GITHUB_URL, ISSUES_URL, SUPPORT_EMAIL, THEME_IDS } from './content.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '..', '..');
const dist = join(root, 'dist');
const SITE = 'https://chattolive.com';
const GITHUB_API = 'https://api.github.com/repos/ShiroOYuki/Chatto';
const LOCALES = ['en', 'zh-TW'];
const PRODUCTS = ['app', 'themes', 'obs'];

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
/** Escapes text and keeps its line breaks. */
const lines = (text) => escape(text).replace(/\n/g, '<br>');

/** `標籤：內容` / `Label: text` → the label in bold. */
function labelled(item) {
  const match = /^(.{1,40}?)(：|: )(.*)$/s.exec(item);
  return match ? `<strong>${escape(match[1])}</strong>${escape(match[2])}${escape(match[3])}` : escape(item);
}

/* ---------- routes ---------- */

const PAGES = {
  home: '/',
  themes: '/themes',
  guide: '/guide',
  faq: '/faq',
  'changelog-app': '/changelog',
  'changelog-themes': '/changelog/themes',
  'changelog-obs': '/changelog/obs',
  privacy: '/privacy',
  terms: '/terms',
};
const href = (locale, page, hash = '') => {
  const path = PAGES[page];
  const full = locale === 'en' ? path : `/zh-tw${path === '/' ? '/' : path}`;
  return `${full}${hash}`;
};
/** The file a page is written to, relative to dist/. */
const fileOf = (locale, page) => {
  const dir = locale === 'en' ? '' : 'zh-tw/';
  return page === 'home' ? `${dir}index.html` : `${dir}${PAGES[page].slice(1)}.html`;
};

/* ---------- icons (lucide, ISC) ---------- */

const svg = (paths, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  github:
    '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};
const icon = (name, size) => svg(ICONS[name], size);
/** The Windows logo, filled, for the download buttons. */
const windows = (size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M3 5.6 10.4 4.6v7H3z"/><path d="M11.4 4.4 21 3v8.6h-9.6z"/><path d="M3 12.6h7.4v7L3 18.6z"/><path d="M11.4 12.6H21V21l-9.6-1.4z"/></svg>`;

/* ---------- chat previews of the built-in themes ---------- */

/** A few messages drawn with each theme's own colors and shapes (see packages/chat-ui/src/themes.ts). */
function chatPreview(id, locale, { count = 3, raid = false, short = false } = {}) {
  const s = CONTENT[locale].sample;
  const messages = [
    { name: 'Yuki', badge: 'sub', text: short ? s.hello : s.greeting },
    { name: 'TeaTime', badge: 'mod', text: s.chest, mention: '@Shiro' },
    { name: 'kuma_kuma', text: s.boss },
  ].slice(0, count);
  const body = messages
    .map((m) => {
      const avatar = id === 'bubble' ? `<span class="av av-${m.badge ?? 'none'}">${escape(m.name[0])}</span>` : '';
      const time = id === 'terminal' ? '<time>21:04</time>' : '';
      const badge = m.badge ? `<i class="badge badge-${m.badge}"></i>` : '';
      const name = `${id === 'terminal' ? '@' : ''}${escape(m.name)}`;
      const text = `${m.mention ? `<span class="at">${m.mention}</span> ` : ''}${escape(m.text)}`;
      return `<p class="m">${avatar}${time}<span class="head">${badge}<b class="n">${name}</b><span class="sep">:</span></span><span class="t">${text}</span></p>`;
    })
    .join('');
  const event = raid
    ? `<p class="m event"><span class="t">${escape(s.raid)}</span>${id === 'bubble' ? `<span class="sticker">${escape(s.raidTag)}</span>` : ''}</p>`
    : '';
  return `<div class="tp tp-${id}" aria-hidden="true">${body}${event}</div>`;
}

/* ---------- notebook pieces ---------- */

/** A strip of washi tape. `at` is one of `l`, `r`, `c` (left, right, centre of the top edge). */
const tape = (color, at = 'c') => `<span class="tape tape-${color} tape-${at}" aria-hidden="true"></span>`;

/** A photo taped to the page: a white frame around `body`, tilted a little. */
const photo = ({ body, tapes = [], caption = '', tilt = 0, cls = '', label = '' }) =>
  `<figure class="photo tilt-${tilt}${cls ? ` ${cls}` : ''}"${label ? ` role="img" aria-label="${escape(label)}"` : ''}>${tapes.join('')}${body}${
    caption ? `<figcaption>${escape(caption)}</figcaption>` : ''
  }</figure>`;

/** The app's sticker of the teacup, used once or twice per page. */
const teacup = (cls) => `<img class="die-cut teacup ${cls}" src="/icon.svg" alt="" width="72" height="72">`;

/** A hand-drawn checkbox, ticked or not. */
const checkbox = (ticked) =>
  `<svg class="check" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path class="box" d="M4 5 C9 3.6 18 4.2 24 4.6 C24.6 11 24.2 18 23.6 24 C17 24.6 10 24.2 4.4 23.8 C3.8 17 4 10 4 5Z"/>${
    ticked ? '<path class="tick" pathLength="1" d="M8 14 L12.5 19 L25 5"/>' : ''
  }</svg>`;

/* ---------- product specimens: real pieces of the app on a see-through sheet ---------- */

const SPECIMENS = {
  /** The desktop overlay, unlocked so it can be dragged. */
  monitor: (locale) => {
    const s = CONTENT[locale].specimen;
    return `<div class="clear spec spec-overlay"><div class="unlocked"><span class="unlocked-tag">${escape(s.unlocked)}</span>${chatPreview('matcha-glass', locale, { count: 2 })}<i class="handle"></i></div></div>`;
  },
  /** The source properties in OBS. */
  obs: (locale) => {
    const s = CONTENT[locale].specimen;
    const field = (label, value, select = false) =>
      `<p><span>${escape(label)}</span><span class="field">${escape(value)}${select ? '<i aria-hidden="true">▾</i>' : ''}</span></p>`;
    return `<div class="spec spec-obs"><p class="obs-title">${escape(s.obsTitle)}</p>${field(s.theme, CONTENT[locale].themes.list.washi.name, true)}${field(s.width, '420')}${field(s.height, '600')}<p class="obs-ok"><i></i>${escape(s.connected)}</p></div>`;
  },
  /** Two fields of the theme editor with the chat they change. */
  /**
   * Three fields of the theme editor and the messages they style: the preview uses exactly the
   * values shown (14 px corners, 72% background, a mint border).
   */
  sliders: (locale) => {
    const s = CONTENT[locale].specimen;
    const sample = CONTENT[locale].sample;
    const slider = (label, value, at) =>
      `<p class="slider"><span class="slider-head">${escape(label)}<span>${value}</span></span><span class="track track-${at}"><i></i></span></p>`;
    const message = (name, text) =>
      `<p class="m"><span class="head"><b class="n">${name}</b><span class="sep">:</span></span><span class="t">${escape(text)}</span></p>`;
    return `<div class="spec spec-editor"><div class="fields">${slider(s.radius, '14 px', 58)}${slider(s.opacity, '72%', 72)}<p class="swatch">${escape(s.border)}<i></i></p></div><div class="clear"><div class="tp tp-matcha-glass" aria-hidden="true">${message('Yuki', sample.hello)}${message('TeaTime', s.reply)}</div></div></div>`;
  },
  /** Event cards in the corner of the desktop. */
  bell: (locale) => {
    const s = CONTENT[locale].specimen;
    return `<div class="clear spec spec-alerts"><p class="alert"><i></i><b>${escape(s.raidTitle)}</b><span>${escape(s.raidBody)}</span></p><p class="alert faded"><b>mochi</b> ${escape(s.sub)}</p></div>`;
  },
};

/* ---------- layout ---------- */

/** The highlight behind the current tab; it slides from tab to tab when the page changes. */
const mark = '<i class="tab-mark" aria-hidden="true"></i>';

function header(locale, page) {
  const t = CONTENT[locale];
  const other = locale === 'en' ? 'zh-TW' : 'en';
  const current = (key) => page === key || (key === 'changelog-app' && page?.startsWith('changelog'));
  const items = [
    ['home', 'home'],
    ['themes', 'themes'],
    ['guide', 'guide'],
    ['faq', 'faq'],
    ['changelog-app', 'changelog'],
  ]
    .map(
      ([key, label]) =>
        `<a href="${href(locale, key)}"${current(key) ? ' aria-current="page"' : ''}>${current(key) ? mark : ''}${escape(t.nav[label])}</a>`,
    )
    .join('');
  return `<header class="top wrap">
  <a class="brand" href="${href(locale, 'home')}"><img class="logo logo-light" src="/chatto-logo.svg" alt="Chatto" width="818" height="243"><img class="logo logo-dark" src="/chatto-logo-dark.svg" alt="Chatto" width="818" height="243"></a>
  <nav aria-label="${escape(t.nav.label)}">${items}</nav>
  <button class="theme-toggle" type="button" aria-pressed="false" aria-label="${escape(t.darkMode)}" title="${escape(t.darkMode)}">${icon('moon', 18)}${icon('sun', 18)}</button>
  <a class="lang" href="${href(other, page ?? 'home')}" hreflang="${CONTENT[other].lang}" lang="${CONTENT[other].lang}">${escape(t.otherLanguage)}</a>
</header>`;
}

/** The title of an inner page, with a strip of tape as its index tab. */
const pageHero = (title, lead, color = 'matcha') => `<div class="page-hero wrap">
  ${tape(color, 'l')}
  <h1>${escape(title)}</h1>
  ${lead ? `<p class="lead">${lines(lead)}</p>` : ''}
</div>`;

function footer(locale, closing) {
  const t = CONTENT[locale];
  const latest = releasedEntries('app')[0];
  return `<footer class="bottom">
  <div class="wrap">
    ${
      closing
        ? `<div class="closing" id="download">
      <div class="closing-text">${teacup('closing-cup')}<div><p class="closing-title">${escape(t.home.closing)}</p>${
        latest
          ? `<p>${escape(t.home.latest(latest.version, latest.date))}<a href="${href(locale, 'changelog-app')}">${escape(t.home.latestMore)}</a></p>`
          : ''
      }</div></div>
      <a class="button light" href="${DOWNLOAD_URL}">${windows()}${escape(t.download)}</a>
    </div>`
        : ''
    }
    <div class="legal-row">
      <p>${escape(t.footer.license)}${t.space}${escape(t.footer.unofficial)}</p>
      <p class="links"><a href="${href(locale, 'privacy')}">${escape(t.nav.privacy)}</a><a href="${href(locale, 'terms')}">${escape(t.nav.terms)}</a><a class="with-icon" href="${GITHUB_URL}">${icon('github', 14)}GitHub</a><a class="with-icon" href="mailto:${SUPPORT_EMAIL}">${icon('mail', 14)}${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</footer>`;
}

function layout(locale, page, { title, description, hero, body, closing = false }) {
  const t = CONTENT[locale];
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
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#27500a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Chatto">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
${alternates}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${ASSETS.styles}">
<script src="${ASSETS.script}"></script>
<script type="speculationrules">${SPECULATION}</script>
</head>
<body class="page-${page ?? 'missing'}">
<div class="binding" aria-hidden="true"></div>
${header(locale, page)}
${hero}
<main>
${body}
</main>
${footer(locale, closing)}
</body>
</html>
`;
}

/* ---------- shared pieces ---------- */

const faqItem = (item, open = false) =>
  `<details${open ? ' open' : ''}><summary><span>${escape(item.q)}</span>${icon('plus', 20)}</summary><p>${escape(item.a)}</p></details>`;

/**
 * Where an entry stands: `upcoming` (no version yet), `unreleased` (has a version, but that
 * GitHub Release is not published yet) or `released`. The OBS plugin follows the Chatto release
 * it comes with (`chatto`).
 */
function statusOf(entry, product) {
  if (entry.upcoming) return 'upcoming';
  const tag = product === 'obs' ? entry.chatto : product === 'app' ? entry.version : null;
  if (!tag || PUBLISHED === null || PUBLISHED.has(tag)) return 'released';
  return 'unreleased';
}

const releasedEntries = (product) => CHANGELOG[product].filter((entry) => statusOf(entry, product) === 'released');

function ticket(locale, entry, product, index) {
  const t = CONTENT[locale].changelog;
  const status = statusOf(entry, product);
  const latest = status === 'released' && entry === releasedEntries(product)[0];
  const head =
    status === 'upcoming'
      ? `<b class="upcoming-title">${escape(t.upcoming)}</b><span class="pill muted">${escape(t.inProgress)}</span>`
      : `<b class="version">${escape(entry.version)}</b><time datetime="${entry.date}">${entry.date}</time>${
          status === 'unreleased'
            ? `<span class="pill muted">${escape(t.notReleased)}</span>`
            : latest
              ? `<span class="pill">${escape(t.latest)}</span>`
              : ''
        }`;
  const sections = entry.sections
    .map((section) => {
      const items = section.items.map((item) => `<li>${escape(item[locale])}</li>`).join('');
      return `<div class="kind"><h3>${escape(t.kinds[section.kind])}</h3><ul>${items}</ul></div>`;
    })
    .join('');
  const summary = entry.summary ? `<p class="summary">${escape(entry.summary[locale])}</p>` : '';
  const download =
    entry.download && status === 'released'
      ? `<a class="button small" href="${GITHUB_URL}/releases/tag/${entry.version}">${windows(16)}${escape(t.downloadVersion(entry.version))}</a>`
      : '';
  const colors = ['matcha', 'sky', 'sakura'];
  return `<article class="ticket sheet${status === 'released' ? '' : ' upcoming'}">
  ${tape(colors[index % 3], index % 2 ? 'r' : 'l')}
  <div class="stub">${head}</div>
  <div class="detail">${summary}${sections}${download}</div>
</article>`;
}

/* ---------- pages ---------- */

function home(locale) {
  const c = CONTENT[locale];
  const t = c.home;
  const tapes = [[tape('sky', 'c')], [tape('sakura', 'r')], [tape('matcha', 'l')], [tape('sky', 'l')]];
  const features = t.features
    .map(
      (f, index) => `<li class="feature feature-${index + 1}">
  ${photo({ body: SPECIMENS[f.icon](locale), tapes: tapes[index], tilt: [1, -2, -1, 2][index], label: f.title })}
  <h3>${escape(f.title)}</h3>
  <p>${escape(f.body)}</p>
</li>`,
    )
    .join('\n');
  const stickers = THEME_IDS.map(
    (id, index) =>
      `<li><a href="${href(locale, 'themes', `#${id}`)}"><span class="die-cut tilt-${[-3, 2, -2, 3, -1, 2, -3][index]}">${chatPreview(id, locale, { count: 1, short: true })}</span><span class="sticker-name">${escape(c.themes.list[id].name)}</span></a></li>`,
  ).join('\n');
  const blank = `<li><a href="${href(locale, 'themes', '#blank')}"><span class="draw-own">${escape(t.themesBlank)}</span><span class="sticker-name">${escape(t.themesBlankNote)}</span></a></li>`;
  const steps = t.steps
    .map(
      (step, index) =>
        `<li>${checkbox(index < 2)}<div><b>${index + 1}. ${escape(step.title)}</b><p>${escape(step.body)}</p></div></li>`,
    )
    .join('\n');
  const groups = Object.fromEntries(c.faq.groups.map((g) => [g.id, g.items]));
  const notes = [groups.basics[0], groups.overlay[0], groups.basics[2]]
    .map((item, index) => `<div class="note note-${index + 1}"><b>${escape(item.q)}</b><p>${escape(item.a)}</p></div>`)
    .join('\n');
  return layout(locale, 'home', {
    title: t.title,
    description: t.description,
    closing: true,
    hero: `<section class="hero wrap">
  <div class="hero-text">
    <h1>${lines(t.tagline)}</h1>
    <p class="lead">${escape(t.lead)}</p>
    <p class="actions"><a class="button" href="${DOWNLOAD_URL}">${windows()}${escape(c.download)}</a><a class="text-link with-icon" href="${GITHUB_URL}">${icon('github', 18)}${escape(c.source)}</a></p>
    <p class="note-line">${escape(c.note)}</p>
  </div>
  <div class="hero-visual">
    ${photo({
      body: `<div class="clear hero-chat">${chatPreview('matcha-glass', locale, { raid: true })}</div>`,
      tapes: [tape('matcha', 'l'), tape('matcha', 'r')],
      caption: t.heroCaption,
      tilt: -1,
      label: t.heroCaption,
    })}
    <p class="note hero-note">${escape(t.heroSticky)}</p>
    <svg class="arrow" viewBox="0 0 120 80" width="120" height="80" aria-hidden="true"><path pathLength="1" d="M112 70 C88 72 60 66 44 50 C32 38 30 26 34 14"/><path class="head" pathLength="1" d="M26 22 L34 12 L42 21"/></svg>
    ${teacup('hero-cup')}
  </div>
</section>`,
    body: `<section class="features wrap" id="features" aria-labelledby="features-title">
  <h2 id="features-title">${escape(t.featuresTitle)}</h2>
  <ul>
${features}
  </ul>
</section>

<section class="sticker-section wrap" aria-labelledby="themes-title">
  <div class="sticker-text">
    <h2 id="themes-title">${lines(t.themesTitle)}</h2>
    <p>${escape(t.themesLead)}</p>
    <a class="text-link" href="${href(locale, 'themes')}">${escape(t.themesMore)}</a>
  </div>
  <div class="sticker-sheet">
    <p class="sheet-label">${escape(t.themesSheet)}</p>
    <ul>
${stickers}
${blank}
    </ul>
  </div>
</section>

<section class="desk wrap" aria-labelledby="guide-title">
  <div class="todo sheet">
    ${tape('sakura', 'c')}
    <h2 id="guide-title">${escape(t.guideTitle)}</h2>
    <ol>
${steps}
    </ol>
    <a class="text-link" href="${href(locale, 'guide')}">${escape(t.guideMore)}</a>
  </div>
  <div class="faq-notes">
    <h2>${escape(t.faqTitle)}</h2>
    <div class="notes">
${notes}
      <div class="note note-4"><b>${escape(t.faqOther)}</b><p><a href="${href(locale, 'faq')}">${escape(t.faqMore)}</a></p></div>
    </div>
  </div>
</section>`,
  });
}

function themesPage(locale) {
  const c = CONTENT[locale];
  const t = c.themes;
  const jump = [...THEME_IDS, 'blank', 'custom']
    .map(
      (id) =>
        `<a href="#${id}">${escape(id === 'custom' ? t.customTitle : id === 'blank' ? t.blank.name : t.list[id].name)}</a>`,
    )
    .join('');
  const spec = (theme) => `<dl>
  <dt>${escape(t.colors)}</dt><dd>${escape(theme.colors)}</dd>
  <dt>${escape(t.shape)}</dt><dd>${escape(theme.shape)}</dd>
  <dt>${escape(t.motion)}</dt><dd>${escape(theme.motion)}</dd>
</dl>`;
  const colors = ['matcha', 'sky', 'sakura'];
  const rows = THEME_IDS.map((id, index) => {
    const theme = t.list[id];
    return `<article class="theme-row" id="${id}">
  <div class="theme-text">
    <h2>${escape(theme.name)}${index === 0 ? ` <span class="pill">${escape(t.default)}</span>` : ''}</h2>
    <p class="idea">${escape(theme.idea)}</p>
    ${spec(theme)}
  </div>
  ${photo({
    body: `<div class="theme-panes"><div class="clear">${chatPreview(id, locale)}</div><div class="clear clear-dark">${chatPreview(id, locale)}</div></div>`,
    tapes: [tape(colors[index % 3], index % 2 ? 'r' : 'l')],
    tilt: index % 2 ? 1 : -1,
    label: theme.name,
  })}
</article>`;
  }).join('\n');
  const blank = `<article class="theme-row" id="blank">
  <div class="theme-text">
    <h2>${escape(t.blank.name)}</h2>
    <p class="idea">${escape(t.blank.body)}</p>
  </div>
  <div class="draw-own big"><code>.chatto-message { }</code></div>
</article>`;
  return layout(locale, 'themes', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead, 'sakura'),
    body: `<nav class="jump wrap" aria-label="${escape(t.jump)}"><div>${jump}</div></nav>
<div class="wrap themes-body">
${rows}
${blank}
<section class="custom sheet" id="custom">
  ${tape('matcha', 'c')}
  <div><h2>${escape(t.customTitle)}</h2><p>${escape(t.customBody)}</p></div>
  <ol>${t.custom.map((item, index) => `<li>${checkbox(true)}<span>${escape(item)}</span></li>`).join('')}</ol>
</section>
</div>`,
  });
}

function guidePage(locale) {
  const c = CONTENT[locale];
  const t = c.guide;
  const toc = t.sections
    .map((section, index) => `<li><a href="#${section.id}"><span>${index + 1}</span>${escape(section.title)}</a></li>`)
    .join('');
  const ol = (items) => `<ol>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ol>`;
  const sections = t.sections
    .map((section, index) => {
      const parts = [];
      for (const paragraph of section.body ?? []) parts.push(`<p>${escape(paragraph)}</p>`);
      if (section.steps) parts.push(ol(section.steps));
      if (section.tips)
        parts.push(
          `<div class="tips">${section.tips.map((tip, i) => `<p class="note note-${(i % 4) + 1}"><b>${escape(tip.title)}</b>${escape(tip.body)}</p>`).join('')}</div>`,
        );
      if (section.cards)
        parts.push(
          `<div class="cards">${section.cards
            .map(
              (card) =>
                `<div class="card sheet"><h3>${escape(card.title)}${card.badge ? ` <span class="pill">${escape(card.badge)}</span>` : ''}</h3>${card.body ? `<p>${escape(card.body)}</p>` : ''}${card.steps ? ol(card.steps) : ''}</div>`,
            )
            .join('')}</div>`,
        );
      if (section.link)
        parts.push(`<p><a class="text-link" href="${href(locale, 'themes')}">${escape(section.link)}</a></p>`);
      if (section.note) parts.push(`<p class="note-line">${escape(section.note)}</p>`);
      return `<section id="${section.id}">
  <p class="step-no"><span>${index + 1}</span></p>
  <h2>${escape(section.title)}</h2>
  ${parts.join('\n  ')}
</section>`;
    })
    .join('\n');
  return layout(locale, 'guide', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead, 'sky'),
    body: `<div class="wrap with-toc">
<nav class="toc sheet" aria-label="${escape(t.toc)}"><p>${escape(t.toc)}</p><ol>${toc}</ol></nav>
<article class="doc">
${sections}
<aside class="stuck note">
  <img src="/teacup-sleepy.svg" alt="" width="72" height="72">
  <div><p class="stuck-title">${escape(t.stuck)}</p><p>${escape(t.stuckBody)}</p></div>
  <p class="actions"><a class="button" href="${href(locale, 'faq')}">${icon('help', 18)}${escape(c.nav.faq)}</a><a class="text-link with-icon" href="mailto:${SUPPORT_EMAIL}">${icon('mail', 16)}${escape(t.email)}</a></p>
</aside>
</article>
</div>`,
  });
}

function faqPage(locale) {
  const t = CONTENT[locale].faq;
  const toc = t.groups.map((g) => `<li><a href="#${g.id}">${escape(g.title)}</a></li>`).join('');
  const groups = t.groups
    .map(
      (g, gi) =>
        `<section id="${g.id}" class="sheet">${tape(['matcha', 'sky', 'sakura'][gi % 3], gi % 2 ? 'r' : 'l')}<h2>${escape(g.title)}</h2><div class="faq-list">${g.items.map((item, i) => faqItem(item, gi === 0 && i === 0)).join('')}</div></section>`,
    )
    .join('\n');
  return layout(locale, 'faq', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead, 'matcha'),
    body: `<div class="wrap with-toc">
<nav class="toc sheet" aria-label="${escape(t.title)}"><ol class="plain">${toc}</ol></nav>
<div class="doc faq-page">
${groups}
<p class="note-line"><a href="${ISSUES_URL}">GitHub Issues</a>${CONTENT[locale].space}<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
</div>
</div>`,
  });
}

function changelogPage(locale, product) {
  const t = CONTENT[locale].changelog;
  const tabs = PRODUCTS.map(
    (p) =>
      `<a href="${href(locale, `changelog-${p}`)}"${p === product ? ' aria-current="page"' : ''}>${p === product ? mark : ''}${escape(t.products[p])}</a>`,
  ).join('');
  const entries = CHANGELOG[product].map((entry, index) => ticket(locale, entry, product, index)).join('\n');
  const releases =
    product === 'themes'
      ? ''
      : `<p class="note-line">${escape(t.releases)} <a href="${GITHUB_URL}/releases">GitHub Releases</a></p>`;
  const name = t.products[product];
  return layout(locale, `changelog-${product}`, {
    title: `${t.title}: ${name} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead, 'sky'),
    body: `<div class="wrap changelog">
<nav class="tabs" aria-label="${escape(t.title)}">${tabs}</nav>
<p class="product-intro"><strong>${escape(name)}</strong>${CONTENT[locale].space}${escape(t.intro[product])}</p>
<div class="tickets">
${entries}
</div>
${releases}
</div>`,
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
    hero: pageHero(t.title, '', 'sakura'),
    body: `<article class="wrap legal sheet">
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
    hero: pageHero(t.title, '', 'sky'),
    body: `<article class="wrap legal sheet">
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
    hero: pageHero(en.title, '', 'sakura'),
    body: `<article class="wrap legal missing note">
<img src="/teacup-sleepy.svg" alt="" width="96" height="96">
<p>${escape(en.body)} <a href="/">${escape(en.back)}</a></p>
<p lang="zh-Hant-TW">${escape(zh.body)} <a href="/zh-tw/">${escape(zh.back)}</a></p>
</article>`,
  });
}

/* ---------- assets ---------- */

/** Copies an SVG without the C2PA manifest the file transfer added. */
function copySvg(from, to) {
  const svg = readFileSync(from, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  writeFileSync(to, svg.replace(/\s+xmlns:c2pa="[^"]*"/, ''));
}

/**
 * Huninn (every subset) and JetBrains Mono (latin) from @fontsource, woff2 only, served from
 * /fonts/. Returns their @font-face rules.
 */
function copyFonts() {
  const require = createRequire(import.meta.url);
  mkdirSync(join(dist, 'fonts'), { recursive: true });
  const faces = [];
  for (const [pkg, keep] of [
    ['@fontsource/huninn', (file) => file.endsWith('-400-normal.woff2')],
    ['@fontsource/jetbrains-mono', (file) => file === 'jetbrains-mono-latin-400-normal.woff2'],
  ]) {
    const dir = dirname(require.resolve(`${pkg}/400.css`));
    const files = readdirSync(join(dir, 'files')).filter(keep);
    for (const file of files) copyFileSync(join(dir, 'files', file), join(dist, 'fonts', file));
    const css = readFileSync(join(dir, '400.css'), 'utf8').replace(/\/\*[^*]*\*\/\n?/g, '');
    for (const rule of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(rule)?.[1];
      if (!file || !files.includes(file)) continue;
      faces.push(rule.replace(/src:[^;]*;/, `src: url(/fonts/${file}) format('woff2');`));
    }
  }
  return faces.join('\n');
}

/* ---------- published releases ---------- */

/**
 * Tags of the published GitHub Releases, so a version that is still a draft shows as not
 * released yet. `null` means unknown: a local build without network treats every version as
 * released; in CI the build fails instead.
 */
async function publishedReleases() {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'chatto-site-build' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await fetch(`${GITHUB_API}/releases?per_page=100`, { headers });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    const releases = await response.json();
    return new Set(releases.filter((r) => !r.draft && !r.prerelease).map((r) => r.tag_name));
  } catch (error) {
    if (process.env.CI) throw error;
    console.warn(`Could not read the published releases (${error.message}); showing every version as released.`);
    return null;
  }
}

const PUBLISHED = await publishedReleases();

/* ---------- write ---------- */

rmSync(dist, { recursive: true, force: true });

/** Writes `text` to /static/ under a name with its content hash, and returns its URL. */
function hashed(name, ext, text) {
  const file = `static/${name}.${createHash('sha256').update(text).digest('hex').slice(0, 10)}.${ext}`;
  mkdirSync(join(dist, 'static'), { recursive: true });
  writeFileSync(join(dist, file), text);
  return `/${file}`;
}

const ASSETS = {
  styles: hashed('styles', 'css', `${copyFonts()}\n${readFileSync(join(root, 'src', 'styles.css'), 'utf8')}`),
  script: hashed('site', 'js', readFileSync(join(root, 'src', 'site.js'), 'utf8')),
};

/** Fetch the header's pages right away and other pages when the pointer rests on a link. */
const SPECULATION = JSON.stringify({
  prefetch: [
    { where: { selector_matches: '.top a, .tabs a' }, eagerness: 'immediate' },
    { where: { href_matches: '/*' }, eagerness: 'moderate' },
  ],
});
const write = (path, html) => {
  mkdirSync(dirname(join(dist, path)), { recursive: true });
  writeFileSync(join(dist, path), html);
};
for (const locale of LOCALES) {
  write(fileOf(locale, 'home'), home(locale));
  write(fileOf(locale, 'themes'), themesPage(locale));
  write(fileOf(locale, 'guide'), guidePage(locale));
  write(fileOf(locale, 'faq'), faqPage(locale));
  for (const product of PRODUCTS) write(fileOf(locale, `changelog-${product}`), changelogPage(locale, product));
  write(fileOf(locale, 'privacy'), privacy(locale));
  write(fileOf(locale, 'terms'), terms(locale));
}
write('404.html', notFound());

for (const file of readdirSync(join(root, 'public'))) copyFileSync(join(root, 'public', file), join(dist, file));
copySvg(join(repo, 'assets', 'chatto-logo.svg'), join(dist, 'chatto-logo.svg'));
copySvg(join(repo, 'assets', 'chatto-logo-dark.svg'), join(dist, 'chatto-logo-dark.svg'));
copySvg(join(repo, 'assets', 'chatto-icon.svg'), join(dist, 'icon.svg'));
copyFileSync(join(repo, 'assets', 'chatto-cover-chat.png'), join(dist, 'og.png'));
console.log(`Built ${dist}`);
