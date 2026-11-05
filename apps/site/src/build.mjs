/**
 * Builds chattolive.com into dist/, in English (/) and Traditional Chinese (/zh-tw/):
 * home, themes, guide, FAQ, the changelog of each product, privacy notice, terms and a 404 page.
 * The legal texts come from `@chatto/share` (`legalText.ts`, loaded as TypeScript by Node), so
 * the site and the app say the same thing. Light and dark follow the visitor's system setting.
 */
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
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  obs: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  sliders:
    '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
};
const icon = (name, size) => svg(ICONS[name], size);
const more = (url, label, cls = 'more') => `<a class="${cls}" href="${url}">${escape(label)}${icon('arrow', 16)}</a>`;

/* ---------- chat previews of the built-in themes ---------- */

/** A few messages drawn with each theme's own colors and shapes (see packages/chat-ui/src/themes.ts). */
function chatPreview(id, locale, { count = 3, raid = false } = {}) {
  const s = CONTENT[locale].sample;
  const messages = [
    { name: 'Yuki', badge: 'sub', text: s.greeting },
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

/* ---------- layout ---------- */

function header(locale, page) {
  const t = CONTENT[locale];
  const other = locale === 'en' ? 'zh-TW' : 'en';
  const current = (key) => page === key || (key === 'changelog-app' && page?.startsWith('changelog'));
  const items = [
    ['home', 'features', '#features'],
    ['themes', 'themes'],
    ['guide', 'guide'],
    ['faq', 'faq'],
    ['changelog-app', 'changelog'],
  ]
    .map(
      ([key, label, hash]) =>
        `<a href="${href(locale, key, hash)}"${!hash && current(key) ? ' aria-current="page"' : ''}>${escape(t.nav[label])}</a>`,
    )
    .join('');
  return `<header class="top">
  <a class="brand" href="${href(locale, 'home')}"><img class="logo" src="/chatto-logo-dark.svg" alt="Chatto" width="818" height="243"></a>
  <nav aria-label="${escape(t.nav.label)}">${items}<a class="lang" href="${href(other, page ?? 'home')}" hreflang="${CONTENT[other].lang}" lang="${CONTENT[other].lang}">${escape(t.otherLanguage)}</a></nav>
</header>`;
}

/** The dark band that opens every inner page. */
const pageHero = (title, lead) => `<div class="page-hero wrap">
  <span class="ring ring-a" aria-hidden="true"></span><span class="ring ring-b" aria-hidden="true"></span>
  <h1>${escape(title)}</h1>
  ${lead ? `<p class="lead">${lines(lead)}</p>` : ''}
</div>`;

function footer(locale, closing) {
  const t = CONTENT[locale];
  return `<footer class="band bottom">
  <div class="wrap">
    ${
      closing
        ? `<div class="closing" id="download"><p>${escape(t.home.closing)}</p><a class="button cream" href="${DOWNLOAD_URL}">${icon('download', 18)}${escape(t.download)}</a></div>`
        : ''
    }
    <div class="legal-row">
      <p>${escape(t.footer.license)} · ${escape(t.footer.unofficial)}</p>
      <p class="links"><a href="${href(locale, 'privacy')}">${escape(t.nav.privacy)}</a><a href="${href(locale, 'terms')}">${escape(t.nav.terms)}</a><a href="${GITHUB_URL}">GitHub</a><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
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
<meta name="color-scheme" content="light dark">
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
<div class="band">
${header(locale, page)}
${hero}
</div>
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

function ticket(locale, entry, { compact = false, product = 'app' } = {}) {
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
      return compact
        ? `<ul>${items}</ul>`
        : `<div class="kind"><h3>${escape(t.kinds[section.kind])}</h3><ul>${items}</ul></div>`;
    })
    .join('');
  const summary = entry.summary ? `<p class="summary">${escape(entry.summary[locale])}</p>` : '';
  const download =
    !compact && entry.download && status === 'released'
      ? `<a class="button small" href="${GITHUB_URL}/releases/tag/${entry.version}">${escape(t.downloadVersion(entry.version))}</a>`
      : '';
  return `<article class="ticket${status === 'released' ? '' : ' upcoming'}">
  <div class="stub">${head}</div>
  <div class="detail">${summary}${compact && entry.summary ? '' : sections}${download}</div>
</article>`;
}

/* ---------- pages ---------- */

function home(locale) {
  const c = CONTENT[locale];
  const t = c.home;
  const s = c.sample;
  const features = t.features
    .map(
      (f) =>
        `<li><span class="feature-icon${f.icon === 'bell' ? ' sakura' : ''}">${icon(f.icon)}</span><div><h3>${escape(f.title)}</h3><p>${escape(f.body)}</p></div></li>`,
    )
    .join('\n');
  const tiles = THEME_IDS.map((id) => {
    const theme = c.themes.list[id];
    return `<li><a href="${href(locale, 'themes', `#${id}`)}"><div class="scene">${chatPreview(id, locale)}</div><h3>${escape(theme.name)}</h3><p>${escape(theme.idea)}</p></a></li>`;
  }).join('\n');
  const blankTile = `<li><a href="${href(locale, 'themes', '#custom')}"><div class="scene blank-scene">${icon('plus', 28)}</div><h3>${escape(c.themes.blank.name)}</h3><p>${escape(c.themes.blank.body)}</p></a></li>`;
  const steps = t.steps
    .map(
      (step, index) =>
        `<li><span class="step-no">${index + 1}</span><div><h3>${escape(step.title)}</h3><p>${escape(step.body)}</p>${
          index === 2 ? `<p class="chips">${t.outputs.map((o) => `<span>${escape(o)}</span>`).join('')}</p>` : ''
        }</div></li>`,
    )
    .join('\n');
  const groups = Object.fromEntries(c.faq.groups.map((g) => [g.id, g.items]));
  const faq = [groups.basics[0], groups.overlay[0], groups.obs[0], groups.basics[2]]
    .map((item, index) => faqItem(item, index === 0))
    .join('\n');
  const released = releasedEntries('app').slice(0, 2);
  return layout(locale, 'home', {
    title: t.title,
    description: t.description,
    closing: true,
    hero: `<section class="hero wrap">
  <div class="hero-text">
    <h1>${lines(t.tagline)}</h1>
    <p class="lead">${escape(t.lead)}</p>
    <p class="actions"><a class="button cream" href="${DOWNLOAD_URL}">${icon('download', 18)}${escape(c.download)}</a><a class="button outline" href="${GITHUB_URL}">${escape(c.source)}</a></p>
    <p class="note">${escape(c.note)}</p>
  </div>
  <div class="hero-visual" role="img" aria-label="${escape(t.heroAlt)}">
    <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
    <span class="disc"><img src="/teacup.svg" alt="" width="96" height="96"></span>
    <p class="float f1"><b>Yuki</b> ${escape(s.greeting)}</p>
    <p class="float f2"><b>TeaTime</b> ${escape(s.song)}</p>
    <p class="float f3"><b>kuma_kuma</b> ${escape(s.gg)}</p>
    <span class="dot"></span>
  </div>
</section>`,
    body: `<section class="features wrap" id="features" aria-labelledby="features-title">
  <h2 id="features-title" class="visually-hidden">${escape(t.featuresTitle)}</h2>
  <ul>
${features}
  </ul>
</section>

<section class="band-deep theme-strip" aria-labelledby="themes-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="themes-title">${lines(t.themesTitle)}</h2>
      ${more(href(locale, 'themes'), t.themesMore)}
    </div>
    <ul class="theme-tiles">
${tiles}
${blankTile}
    </ul>
  </div>
</section>

<section class="wrap split" aria-labelledby="guide-title">
  <div class="split-head">
    <h2 id="guide-title">${escape(t.guideTitle)}</h2>
    <p>${escape(t.guideLead)}</p>
    ${more(href(locale, 'guide'), t.guideMore)}
  </div>
  <ol class="steps">
${steps}
  </ol>
</section>

<section class="band-pale" aria-labelledby="faq-title">
  <div class="wrap split">
    <div class="split-head">
      <h2 id="faq-title">${escape(t.faqTitle)}</h2>
      ${more(href(locale, 'faq'), t.faqMore)}
    </div>
    <div class="faq-list">
${faq}
    </div>
  </div>
</section>

<section class="wrap changelog-teaser" aria-labelledby="changelog-title">
  <div class="section-head">
    <h2 id="changelog-title">${escape(t.changelogTitle)}</h2>
    ${more(href(locale, 'changelog-app'), t.changelogMore)}
  </div>
  <div class="tickets two">
${released.map((entry) => ticket(locale, entry, { compact: true })).join('\n')}
  </div>
</section>`,
  });
}

function themesPage(locale) {
  const c = CONTENT[locale];
  const t = c.themes;
  const jump = [...THEME_IDS, 'custom']
    .map((id) => `<a href="#${id}">${escape(id === 'custom' ? t.customTitle : t.list[id].name)}</a>`)
    .join('');
  const spec = (theme) => `<dl>
  <dt>${escape(t.colors)}</dt><dd>${escape(theme.colors)}</dd>
  <dt>${escape(t.shape)}</dt><dd>${escape(theme.shape)}</dd>
  <dt>${escape(t.motion)}</dt><dd>${escape(theme.motion)}</dd>
</dl>`;
  const rows = THEME_IDS.map((id, index) => {
    const theme = t.list[id];
    return `<article class="theme-row" id="${id}">
  <div class="theme-text">
    <p class="eyebrow">0${index + 1}${index === 0 ? ` · ${escape(t.default)}` : ''}</p>
    <h2>${escape(theme.name)}</h2>
    <p class="idea">${escape(theme.idea)}</p>
    ${spec(theme)}
  </div>
  <div class="theme-scenes">
    <div class="scene scene-bright">${chatPreview(id, locale)}</div>
    <div class="scene scene-dark">${chatPreview(id, locale)}</div>
  </div>
</article>`;
  }).join('\n');
  const blank = `<article class="theme-row" id="blank">
  <div class="theme-text">
    <p class="eyebrow">08</p>
    <h2>${escape(t.blank.name)}</h2>
    <p class="idea">${escape(t.blank.body)}</p>
  </div>
  <div class="theme-scenes"><div class="scene blank-scene"><code>.chatto-message { }</code></div></div>
</article>`;
  return layout(locale, 'themes', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead),
    body: `<nav class="jump wrap" aria-label="${escape(t.jump)}"><div>${jump}</div></nav>
<div class="wrap themes-body">
${rows}
${blank}
<section class="custom" id="custom">
  <div><h2>${escape(t.customTitle)}</h2><p>${escape(t.customBody)}</p></div>
  <ul>${t.custom.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>
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
          `<div class="tips">${section.tips.map((tip) => `<p class="card"><strong>${escape(tip.title)}</strong>${escape(tip.body)}</p>`).join('')}</div>`,
        );
      if (section.cards)
        parts.push(
          `<div class="cards">${section.cards
            .map(
              (card) =>
                `<div class="card"><h3>${escape(card.title)}${card.badge ? ` <span class="pill">${escape(card.badge)}</span>` : ''}</h3>${card.body ? `<p>${escape(card.body)}</p>` : ''}${card.steps ? ol(card.steps) : ''}</div>`,
            )
            .join('')}</div>`,
        );
      if (section.link) parts.push(`<p>${more(href(locale, 'themes'), section.link)}</p>`);
      if (section.note) parts.push(`<p class="note-line">${escape(section.note)}</p>`);
      return `<section id="${section.id}">
  <p class="eyebrow">${escape(t.step)} ${index + 1}</p>
  <h2>${escape(section.title)}</h2>
  ${parts.join('\n  ')}
</section>`;
    })
    .join('\n');
  return layout(locale, 'guide', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead),
    body: `<div class="wrap with-toc">
<nav class="toc" aria-label="${escape(t.toc)}"><p>${escape(t.toc)}</p><ol>${toc}</ol></nav>
<article class="doc">
${sections}
<aside class="stuck">
  <img src="/teacup-sleepy.svg" alt="" width="72" height="72">
  <div><p class="stuck-title">${escape(t.stuck)}</p><p>${escape(t.stuckBody)}</p></div>
  <p class="actions"><a class="button" href="${href(locale, 'faq')}">${escape(c.nav.faq)}</a><a class="button outline-dark" href="mailto:${SUPPORT_EMAIL}">${escape(t.email)}</a></p>
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
        `<section id="${g.id}"><h2>${escape(g.title)}</h2><div class="faq-list">${g.items.map((item, i) => faqItem(item, gi === 0 && i === 0)).join('')}</div></section>`,
    )
    .join('\n');
  return layout(locale, 'faq', {
    title: `${t.title} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead),
    body: `<div class="wrap with-toc">
<nav class="toc" aria-label="${escape(t.title)}"><ol class="plain">${toc}</ol></nav>
<div class="doc faq-page">
${groups}
<p class="note-line"><a href="${ISSUES_URL}">GitHub Issues</a> · <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
</div>
</div>`,
  });
}

function changelogPage(locale, product) {
  const t = CONTENT[locale].changelog;
  const tabs = PRODUCTS.map(
    (p) =>
      `<a href="${href(locale, `changelog-${p}`)}"${p === product ? ' aria-current="page"' : ''}>${escape(t.products[p])}</a>`,
  ).join('');
  const entries = CHANGELOG[product].map((entry) => ticket(locale, entry, { product })).join('\n');
  const releases =
    product === 'themes'
      ? ''
      : `<p class="note-line">${escape(t.releases)} <a href="${GITHUB_URL}/releases">GitHub Releases</a></p>`;
  const name = t.products[product];
  return layout(locale, `changelog-${product}`, {
    title: `${t.title}: ${name} — Chatto`,
    description: t.description,
    hero: pageHero(t.title, t.lead),
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
    hero: pageHero(t.title),
    body: `<article class="wrap legal">
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
    hero: pageHero(t.title),
    body: `<article class="wrap legal">
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
    hero: pageHero(en.title),
    body: `<article class="wrap legal missing">
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

const fonts = copyFonts();
writeFileSync(join(dist, 'styles.css'), `${fonts}\n${readFileSync(join(root, 'src', 'styles.css'), 'utf8')}`);
for (const file of readdirSync(join(root, 'public'))) copyFileSync(join(root, 'public', file), join(dist, file));
copySvg(join(repo, 'assets', 'chatto-logo-dark.svg'), join(dist, 'chatto-logo-dark.svg'));
copySvg(join(repo, 'assets', 'chatto-icon.svg'), join(dist, 'icon.svg'));
copyFileSync(join(repo, 'assets', 'chatto-cover-chat.png'), join(dist, 'og.png'));
console.log(`Built ${dist}`);
