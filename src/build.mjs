// ---------------------------------------------------------------------------
// Builds evenus.app from the design handoff.
//
//   node src/build.mjs        ->  dist/
//   BASE_PATH=/repo node src/build.mjs   (GitHub project site)
//
// The .dc.html prototypes in handoff/ are the source of truth for markup and
// copy. They are RENDERED (src/dc/render.mjs), not transcribed — the handoff
// asks for pixel-for-pixel and the surest way to hit that is to use the
// designer's own markup rather than a retyping of it.
//
// What is NOT carried over is the prototype runtime. Every interaction is
// reimplemented in src/dc/site.js as plain DOM code, and src/dc/hooks.mjs
// annotates the rendered markup for it — with each anchor asserted, so a design
// change that moves an element fails the build instead of silently killing the
// calculator.
//
// ⚠️ Two things the handoff does not contain and this build adds:
//   1. A blog POST template. The bundle has a blog index but no article page.
//      One is composed here from the system's own parts.
//   2. Real content. The index ships 32 placeholder posts; the design's
//      <sc-for> is driven with the articles in src/posts/ instead.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDC } from './dc/render.mjs';
import { hookHome, stripPrototypeHandlers } from './dc/hooks.mjs';
import { FOOTPRINTS, STRUCTURAL } from './dc/checks.mjs';
import { SEO_TITLES, fullTitle, metaDescription } from './dc/seo.mjs';
import { CATEGORIES, readTime } from './dc/blogdata.mjs';
import { loadCatalog, loadContent, loadScreenshots, loadWhere, validateContent, postSlugsOf } from './dc/features.mjs';
import { buildFeatures } from './dc/featurepages.mjs';
import { HUB } from './features/hub.mjs';
import { ENGINE_SOURCE, calculatorDemo, checkGolden, checkHomeDemo } from './calc/page.mjs';
import { appLinkFiles } from './applinks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const design = join(root, 'handoff');
const out = join(root, 'dist');
const ORIGIN = 'https://evenus.app';

/**
 * IndexNow host key. The file static/933366c16ba079aa7ebb6a1031579fa3.txt serves it, and
 * static/ is copied into the build, so the key stays published as long as the
 * site deploys.
 *
 * ⚠️ INDEXNOW DOES NOT NOTIFY GOOGLE. It reaches Bing, Yandex, Seznam, Naver
 * and Yep. Google ran a test and has not adopted it, so nothing here shortens
 * the path into Google's index — use Search Console for that. It is still
 * worth having, because Bing's index is what Microsoft Copilot answers from,
 * which makes it part of the AI-visibility work rather than the SEO work.
 */
const INDEXNOW_KEY = '933366c16ba079aa7ebb6a1031579fa3';
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');

const url = (p) => BASE + p;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const written = [];
function emit(path, body) {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, path.endsWith('.html') ? withBase(body) : body);
  written.push(path);
}

/**
 * Adds the base path to every root-relative link, at the LAST possible moment.
 *
 * ⚠️ Prefixing where links are authored is not enough, and that is the whole
 * reason this exists. Links also arrive inside the articles' own prose,
 * /blog/<slug>/ cross-references that no template controls. Those 404 on a
 * project site.
 *
 * Idempotent: anything already carrying the base is left alone.
 */
function withBase(html) {
  if (!BASE) return html;
  return html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (m, attr, u) => (u === BASE || u.startsWith(`${BASE}/`) ? m : `${attr}="${BASE}${u}"`)
  );
}
const pageAt = (u, html) =>
  emit(u === '/' ? 'index.html' : `${u.replace(/^\/|\/$/g, '')}/index.html`, html);

// --- Head ------------------------------------------------------------------
//
// The extra CSS is the accessibility work the handoff asks production to add
// and the prototypes omit: a visible focus ring, and honouring reduced motion
// by disabling the decorative loops.
const A11Y = `
<style>
  /* Links inside running text must not rely on colour alone (WCAG 1.4.1). */
  .prose a, p > a:not([style]) { text-decoration: underline; text-underline-offset: 2px; }
  /* The hero headline rose in from opacity 0, and Chrome does not count an
     invisible element as the largest paint, so LCP waited for the animation:
     4.3s on a simulated phone. Keep the movement, drop the fade. Declared after
     the design's own keyframes, so this definition wins. */
  @keyframes rise { from { transform: translateY(26px); } to { transform: none; } }
  a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible {
    outline: 2px solid #2E6A5C; outline-offset: 2px; border-radius: 4px;
  }
  /* The calculator's sliders: a 44px-tall hit area around the thin track the
     design draws, so each one is easy to grab on a phone (WCAG 2.5.5). */
  #demo input[type=range] { display:block; height:44px; margin:0 !important; }
  [hidden] { display:none !important; }
  .skip { position:absolute; left:-9999px; }
  /* Nav and footer links render at 18px tall, below the 24px WCAG 2.2 minimum
     target size and awkward to hit on a phone. inline-flex with a min-height
     grows the hit area without moving the text, so nothing shifts visually.
     Covers breadcrumbs too, which live in a bare <nav> rather than the header.
     ⚠️ Deliberately NOT applied to links inside prose: a 32px box around every
     inline link in a paragraph would wreck the line rhythm, and WCAG 2.5.8
     exempts targets inside a sentence for exactly that reason. */
  nav a, .site-foot a, footer a, .skip {
    display: inline-flex; align-items: center; min-height: 32px;
  }
  .skip:focus { left:16px; top:16px; z-index:99; background:#fff; color:#1B1F1D;
    padding:12px 18px; border-radius:99px; border:1px solid #DAD4C6; font-weight:600; }
  /* ⚠️ THE ONE MEDIA QUERY ON THE SITE, and it is a deliberate exception to the
     handoff's "no media queries anywhere" rule. Stated rather than smuggled in.

     The header holds a wordmark, up to six nav links and a CTA in a single
     non-wrapping row. Below roughly 760px that cannot fit, so the row now
     wraps, but the header is position:sticky, and a wrapped sticky header
     occupies about 280px of a 667px phone viewport for the entire scroll.

     Nothing intrinsic fixes that: the problem is not the width, it is that
     sticky and wrapped are incompatible. Dropping the nav instead would cost
     navigation, and there is no hamburger in the design to fall back on. So
     the header simply stops being sticky once it wraps. Every link survives,
     it is seen once at the top, and it scrolls away like ordinary content. */
  @media (max-width: 760px) {
    header[style*="sticky"] { position: static !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: .001ms !important; animation-iteration-count: 1 !important;
      transition-duration: .001ms !important;
    }
  }
</style>`;

// --- Structured data --------------------------------------------------------
//
// The machine-readable half of the on-page work. ⚠️ It must agree with what is
// visible: a FAQPage block whose answers differ from the text on screen is a
// manual-action risk, not a clever trick. So the FAQ entries are LIFTED FROM
// THE RENDERED PAGE rather than written out a second time.

const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

// The person behind the site and the writing.
//
// ⚠️ ONLY WHAT THE OWNER HAS STATED. Google's quality raters and the AI answer
// engines both check that an author is a real, findable person, and the
// LinkedIn profile is the corroborating source. Do not add credentials,
// employers or awards here that the owner has not confirmed: an invented
// detail on an author entity is worse than a missing one.
const AUTHOR = {
  '@type': 'Person',
  '@id': `${ORIGIN}/about/#aapt-dubey`,
  name: 'Aapt Dubey',
  url: `${ORIGIN}/about/`,
  jobTitle: 'Founder',
  worksFor: { '@id': `${ORIGIN}/#organization` },
  nationality: { '@type': 'Country', name: 'India' },
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    credentialCategory: 'degree',
    name: 'MBA in Marketing and Banking',
  },
  knowsAbout: [
    'Mental load', 'Division of household labour', 'Couples finances',
    'Income-proportional bill splitting', 'Household budgeting', 'Marketing', 'Banking',
  ],
  sameAs: ['https://www.linkedin.com/in/aaptdubey/'],
};

const ORG = {
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'EvenUS',
  url: ORIGIN,
  logo: { '@type': 'ImageObject', url: `${ORIGIN}/logo.png`, width: 512, height: 512 },
  founder: { '@id': `${ORIGIN}/about/#aapt-dubey` },
  email: 'support@evenus.app',
  // Country only. The owner asked for the street address to come off the site:
  // a founder working from home should not publish where they live.
  address: { '@type': 'PostalAddress', addressCountry: 'IN' },
};

const APP = {
  '@type': 'SoftwareApplication',
  '@id': `${ORIGIN}/#app`,
  name: 'EvenUS',
  applicationCategory: 'LifestyleApplication',
  applicationSubCategory: 'Household management',
  operatingSystem: 'iOS, Android',
  url: ORIGIN,
  publisher: { '@id': `${ORIGIN}/#organization` },
  description:
    'A mobile app for couples that measures how fairly money, time and mental load are shared in a household, then suggests one specific task to swap each week.',
  featureList: [
    'Discretionary time measurement',
    'Mental load tracking',
    'Income-proportional bill splitting',
    'Weekly chore swap suggestion',
    'Private weekly check-ins',
  ],
  // ⚠️ THIS IS THE PAID APP, AND IT SAID price: '0'.
  // Google reads this offer to decide what to print next to the result, so a
  // zero here puts the word "Free" in a search listing for a $9.99 subscription —
  // the single worst place to be wrong about a price. Two offers, one per billing
  // period, because a 9.99-to-69 "range" would read as a range for one purchase.
  // `LimitedAvailability` stays while the app is still in closed testing.
  offers: [
    {
      '@type': 'Offer',
      name: 'Monthly subscription',
      price: '9.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
    },
    {
      '@type': 'Offer',
      name: 'Yearly subscription',
      price: '79.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
    },
  ],
};

/** Pulls the visible accordion Q&A off a rendered page. */
function faqFrom(html) {
  const pairs = [];
  const re = /<button data-accordion[^>]*>\s*<span>([\s\S]*?)<\/span>[\s\S]*?<\/button>\s*<div[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  const strip = (x) => x.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  while ((m = re.exec(html))) {
    const q = strip(m[1]), a = strip(m[2]);
    if (q && a) pairs.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  }
  return pairs.length ? { '@type': 'FAQPage', mainEntity: pairs } : null;
}

const graph = (...nodes) => ld({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });

const crumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: ORIGIN + it.path,
  })),
});

/**
 * Self-hosted faces, inlined, replacing the Google Fonts <link>.
 *
 * ⚠️ THE POINT IS THE CHAIN, NOT THE BYTES. Hotlinking cost a serialised
 * round trip to fonts.googleapis.com for the CSS, and only then a second one
 * to fonts.gstatic.com for the files: two DNS lookups, two TLS handshakes and
 * a render-blocking stylesheet before any text could paint in the right face.
 * Same origin removes all of it, and the handoff asked for this explicitly.
 *
 * The CSS is inlined rather than linked because it is 2 KB and a separate file
 * would reintroduce the round trip this change exists to delete.
 */
const FONT_CSS = readFileSync(join(root, 'static/fonts.css'), 'utf8').trim();

// Every face the hero actually uses.
//
// ⚠️ Two was too few, and the waterfall showed it: 500, 600 and the Newsreader
// italic were only discovered during layout and landed at 256 to 357ms, well
// after first paint, so the hero visibly re-rendered as each one swapped in.
// The homepage above the fold needs 400 (lead), 600 (eyebrow, buttons, bold
// spans), 700 (wordmark, headline) and both Newsreader italics (the "US" and
// the third headline line). They are the same bytes either way; preloading
// only decides whether they arrive together or in a queue.
//
// 500 is left out on purpose. It is the nav only, and it is the one weight
// that can swap late without anyone noticing.
const FONT_PRELOAD = [
  'plus-jakarta-sans-400', 'plus-jakarta-sans-600', 'plus-jakarta-sans-700',
  'newsreader-300-italic', 'newsreader-400-italic',
]
  .map((f) => `<link rel="preload" href="${'${BASE}'}/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`)
  .join('\n');

/**
 * Google Analytics 4, behind Consent Mode v2.
 *
 * Loaded async and placed at the end of <body>, so it never blocks render. It
 * costs two extra origins (googletagmanager.com, google-analytics.com) and
 * roughly 50 KB, which is the price of having it at all.
 *
 * ⚠️ CONSENT FIRST, THEN THE TAG. The consent default is pushed onto the
 * dataLayer BEFORE 'config', with every storage type denied, so until a
 * visitor accepts, GA4 runs cookieless (no _ga cookie, no client id that
 * survives the page) and Google models the gaps. A stored "granted" from an
 * earlier visit is replayed before the config hit, so a returning visitor who
 * said yes is measured from their first page view, not their second.
 *
 * The question itself is asked by consentBanner() in site.js and remembered in
 * localStorage under the same key read here. ad_storage, ad_user_data and
 * ad_personalization are never granted: there are no ads on this site, and the
 * privacy policy says so.
 *
 * This exact string is exempt from the CMS-footprint scan below; a tag
 * anywhere else in a page still fails the build.
 */
const ANALYTICS = `<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', wait_for_update: 500
  });
  try {
    if (localStorage.getItem('evenus-analytics-consent') === 'granted') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  } catch (e) {}
  gtag('js', new Date());
  gtag('config', 'G-V79KZPESPX');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-V79KZPESPX"></script>`;

/**
 * Analytics for the invite page, /join/<CODE>: NOTHING until the visitor says yes.
 *
 * ⚠️ The URL of this page carries a live invite code, so the cookieless
 * Consent Mode ping every other page sends would hand the code to Google in
 * page_location. Here the tag is not even requested before consent: it loads
 * only when a stored "granted" exists or the banner's Accept is pressed
 * (site.js calls window.evenusConsentGranted), and the page it reports is
 * /join/ with the code and the referrer stripped.
 *
 * Exempt from the CMS-footprint scan, like ANALYTICS.
 */
const JOIN_ANALYTICS = `<script>
  (function () {
    function load() {
      if (window.evenusGaLoaded) return;
      window.evenusGaLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('consent', 'default', {
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        analytics_storage: 'granted'
      });
      gtag('js', new Date());
      gtag('config', 'G-V79KZPESPX', { page_location: location.origin + '/join/', page_path: '/join/', page_referrer: '' });
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-V79KZPESPX';
      document.head.appendChild(s);
    }
    window.evenusConsentGranted = load;
    try { if (localStorage.getItem('evenus-analytics-consent') === 'granted') load(); } catch (e) {}
  })();
</script>`;

/*
 * Robots directives.
 *
 * ⚠️ THERE WAS NO ROBOTS TAG AT ALL, and shell() was already being passed
 * noindex:true for the 404 page with nothing rendering it. The 404 has been
 * indexable this whole time.
 *
 * index, follow is the default and is stated only to be explicit. The other
 * three are NOT defaults and each buys something:
 *
 *   max-image-preview:large   A large thumbnail in results and Discover
 *                             instead of the small default. This is what makes
 *                             og.png and the topic cards actually appear at a
 *                             useful size rather than as a tiny square.
 *   max-snippet:-1            No cap on snippet length, so the answer-first
 *                             opening sentences can be quoted in full. Writing
 *                             them that way is pointless if they get truncated.
 *   max-video-preview:-1      No cap on video previews. Nothing here has video;
 *                             harmless now and correct if that changes.
 *
 * The 404 gets noindex, follow rather than bare noindex: keep it out of the
 * index, but keep following its links to real pages.
 */
function shell({ title, seoTitle, description, path, helmet, body, published, modified, jsonld, image, imageSize, imageAlt, noindex, extraHead, analytics }) {
  const card = image || '/og.png';
  // Strip the design's Google Fonts hotlink and its preconnects.
  helmet = helmet
    .replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, '')
    .replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, '');
  const full = fullTitle(seoTitle || title);
  description = metaDescription(description);
  // ⚠️ CONTRAST. The design's two light greys measure 3.0:1 (#8A8F89) and
  // 2.2:1 (#A9AEA8) on the cream background, under the 4.5:1 WCAG AA minimum
  // for body-size text, and Lighthouse flagged 120+ nodes. Both map to the
  // nearest grey in the same family that passes (#686D68, 4.8:1). The terracotta
  // tag text gets the same treatment against its pink chip.
  const fixContrast = (h) => h.replace(/#8A8F89|#A9AEA8/gi, '#686D68').replace(/#A9583C/gi, '#8F4A31');
  body = fixContrast(body);
  helmet = fixContrast(helmet);
  return `<!doctype html>
<html lang="en"${BASE ? ` data-base="${BASE}"` : ''}>
<head>
<meta charset="utf-8">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#F7F5EF">
<link rel="canonical" href="${ORIGIN}${path}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
<meta property="og:site_name" content="EvenUS">
<meta property="og:type" content="${published ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}${path}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
${modified ? `<meta property="article:modified_time" content="${modified}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ORIGIN}${card}">
<meta property="og:locale" content="en_GB">
<meta property="og:image" content="${ORIGIN}${card}">
<meta property="og:image:width" content="${(imageSize || [1200, 630])[0]}">
<meta property="og:image:height" content="${(imageSize || [1200, 630])[1]}">
<meta property="og:image:alt" content="${esc(imageAlt || `${title} · EvenUS`)}">
<meta name="twitter:image:alt" content="${esc(imageAlt || `${title} · EvenUS`)}">
<link rel="icon" href="${url('/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${url('/logo.png')}">
<link rel="alternate" type="application/rss+xml" title="EvenUS" href="${url('/feed.xml')}">
${published ? `<meta name="author" content="Aapt Dubey">` : ''}
${FONT_PRELOAD.replace(/\$\{BASE\}/g, BASE)}
<style>${FONT_CSS.replace(/url\('\/fonts\//g, `url('${BASE}/fonts/`)}</style>
${helmet}
${A11Y}
${extraHead || ''}
${jsonld || ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${/<main[\s>]/.test(body) ? `<div id="main">\n${body}\n</div>` : `<main id="main">\n${body}\n</main>`}
<script src="${url('/site.js')}" defer></script>
${analytics ?? ANALYTICS}
</body>
</html>
`;
}

/**
 * Points the design's placeholder links at real routes.
 *
 * The prototypes navigate by relative filename so the bundle browses offline,
 * and link out to absolute evenus.app URLs with target="_blank". Neither is
 * right for the live site.
 */
function routes(html) {
  const map = {
    'EvenUS Website.dc.html': '/', 'Blog.dc.html': '/blog/', 'Help.dc.html': '/support/',
    'Privacy.dc.html': '/privacy/', 'Terms.dc.html': '/terms/',
    'Disclaimer.dc.html': '/disclaimer/', 'Delete Account.dc.html': '/delete-account/',
  };
  for (const [file, to] of Object.entries(map)) {
    // ⚠️ Three variations, and each one was actually present in the bundle:
    // the raw filename, the %20-encoded form (two of the seven pages have a
    // space in the name), and either of those followed by a #fragment — the
    // header's "Get the app" links to "EvenUS%20Website.dc.html#get".
    // An exact-string swap silently missed the last kind.
    for (const name of [file, encodeURIComponent(file).replace(/%2F/g, '/')]) {
      const re = new RegExp(
        `href="(?:\\./)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(#[^"]*)?"`,
        'g'
      );
      html = html.replace(re, (_m, frag) => `href="${url(to)}${frag || ''}"`);
    }
  }
  html = html.replace(/href="https:\/\/evenus\.app(\/[^"]*)"/g, (_m, p) => `href="${url(p)}"`);
  // Same-site links should not open a new tab.
  html = html.replace(/<a([^>]*href="(?:\/|\.\.?\/)[^"]*"[^>]*)\starget="_blank"\srel="noopener"/g, '<a$1');
  html = html.replace(/<a([^>]*)\starget="_blank"\srel="noopener"([^>]*href="(?:\/)[^"]*")/g, '<a$1$2');
  return html;
}

const page = (file, opts, overrides = {}, transform = null) => {
  const r = renderDC(design, file, overrides, {}, transform);
  return { helmet: r.helmet, body: routes(stripPrototypeHandlers(r.body)), ...opts };
};

/** Opens every accordion answer so the static page contains all of them. */
const openAll = (key) => (scope) => {
  if (Array.isArray(scope[key])) {
    scope[key] = scope[key].map((it) => ({ ...it, open: true, mark: '+' }));
  }
  return scope;
};

console.log('\nBuilding evenus.app' + (BASE ? ` (base ${BASE})` : '') + '\n');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// --- Posts -----------------------------------------------------------------

/**
 * Every article is a file in src/posts/<slug>.html; the slug is the URL.
 *
 * Metadata rides in an HTML comment at the top so the file stays a plain
 * fragment with nothing to compile.
 */
function handWritten() {
  const dir = join(here, 'posts');
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.html'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const meta = {};
    for (const m of raw.matchAll(/^\s*meta:(\w+)\s+(.+)$/gm)) meta[m[1]] = m[2].trim();
    out.set(f.replace(/\.html$/, ''), {
      ...meta,
      html: raw.replace(/<!--[\s\S]*?-->/, '').trim(),
    });
  }
  return out;
}
const HAND = handWritten();

// Each article's illustration, if one has been generated: static/img/blog/<slug>.{jpg,webp}.
// The alt text describes what is drawn, which is also what Google Images reads.
const IMAGE_ALTS = JSON.parse(readFileSync(join(here, 'dc/image-alts.json'), 'utf8'));
const heroFor = (slug) => existsSync(join(root, `static/img/blog/${slug}.jpg`))
  ? { jpg: `/img/blog/${slug}.jpg`, webp: `/img/blog/${slug}.webp`, alt: IMAGE_ALTS[slug] || '' }
  : null;

// The cornerstone pieces: listed first in llms.txt and on the About page.
const PILLARS = new Set([
  'what-is-the-mental-load', 'how-to-split-finances-when-incomes-differ', 'beyond-the-chore-war',
  'how-the-evenus-fairness-score-really-works-effort-money-mental-load-explained',
  'the-one-who-books-everything', 'different-standards-mess', 'same-sex-couples-housework',
  'caring-for-ageing-parents', 'christmas-mental-load', 'paired-vs-evenus', 'maple-vs-evenus',
]);

/**
 * Near-duplicates folded into one page, old slug -> surviving slug.
 *
 * ⚠️ MEASURED, NOT GUESSED. These were picked by text similarity across the
 * whole archive (TF-IDF cosine over the article bodies): the four "domestic
 * peace" pieces scored 0.59 to 0.86 against each other, the two "best tools"
 * pieces 0.72. Pages that similar compete for the same query and Google
 * usually ranks neither. The survivor is the one with the clearer query, or
 * the one the design's own index already featured.
 *
 * Each needs a matching 301 in vercel.json; the build fails if one is missing.
 */
const MERGED = {
  'the-architecture-of-domestic-peace': 'from-conflict-to-collaboration-equity-at-home',
  'the-architecture-of-domestic-peace-in-modern-household': 'from-conflict-to-collaboration-equity-at-home',
  'the-efficiency-of-intimacy-reclaiming': 'from-conflict-to-collaboration-equity-at-home',
  'best-tools-to-track-and-share-domestic-responsibilities-fairly': 'best-chore-tracking-apps',
};
{
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  for (const [from, to] of Object.entries(MERGED)) {
    const r = (vercel.redirects || []).find((x) => x.source === `/blog/${from}/`);
    if (!r || r.destination !== `/blog/${to}/` || !r.permanent) {
      throw new Error(`vercel.json: missing 301 /blog/${from}/ -> /blog/${to}/`);
    }
  }
}
/** Points links at a merged post to the post that absorbed it. */
const unmerge = (html) => html.replace(/\/blog\/([a-z0-9-]+)\//g,
  (m, slug) => (MERGED[slug] ? `/blog/${MERGED[slug]}/` : m));
const catSlug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const posts = [];
const urlsExtra = [];
const words = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
for (const [slug, own] of HAND) {
  if (MERGED[slug]) throw new Error(`src/posts/${slug}.html was merged into ${MERGED[slug]}; delete it`);
  for (const k of ['title', 'excerpt', 'cat', 'iso']) {
    if (!own[k]) throw new Error(`src/posts/${slug}.html: missing meta:${k}`);
  }
  posts.push({
    slug,
    path: `/blog/${slug}/`,
    html: unmerge(own.html),
    iso: own.iso,
    updated: own.updated ?? null,
    date: own.date ?? null,
    words: words(own.html),
    pillar: PILLARS.has(slug),
    summarised: true,
    cat: own.cat,
    title: own.title,
    excerpt: own.excerpt,
    read: own.read ?? readTime(words(own.html)),
    hero: heroFor(slug),
  });
}

posts.sort((a, b) => (b.iso || '0000').localeCompare(a.iso || '0000'));

// --- Features: load and check -------------------------------------------------
//
// ⚠️ Every feature in the app's catalog must have a page, and every page must
// pass validateContent() (lengths, question-led headings, no em dashes, no
// blame words, links that exist). A missing or failing page stops the build.
const CATALOG = loadCatalog(root);
const SHOTS = loadScreenshots(root);
const WHERE = loadWhere(root);
const FEATURE_CONTENT = new Map();
{
  const postSlugs = postSlugsOf(root);
  const problems = [];
  for (const f of CATALOG.features) {
    const c = loadContent(root, f.id);
    if (!c) { problems.push(`${f.id}: no src/features/content/${f.id}.json`); continue; }
    const r = validateContent(c, { catalog: CATALOG, postSlugs });
    for (const e of r.errors) problems.push(`${f.id}: ${e}`);
    const n = (SHOTS.shots || []).filter((s) => s.feature === f.id).length;
    if (n < 1 || n > 3) problems.push(`${f.id}: needs 1 to 3 screenshots in src/features/screenshots.json (has ${n})`);
    const w = WHERE[f.id];
    if (typeof w !== 'string' || w.length < 3) problems.push(`${f.id}: no "where to find it" path in src/features/where.json`);
    else if (/\u2014/.test(w)) problems.push(`${f.id}: em dash in src/features/where.json`);
    FEATURE_CONTENT.set(f.id, c);
  }
  const extra = readdirSync(join(here, 'features/content')).map((x) => x.replace(/\.json$/, ''))
    .filter((id) => !CATALOG.features.some((f) => f.id === id));
  for (const id of extra) problems.push(`${id}: page for a feature the catalog does not have`);
  for (const id of Object.keys(WHERE)) if (!CATALOG.features.some((f) => f.id === id)) problems.push(`${id}: src/features/where.json names a feature the catalog does not have`);
  if (problems.length) throw new Error('feature pages:\n  ' + problems.join('\n  '));
}

/**
 * Features to suggest under each article.
 *
 * The feature pages already name the articles that answer the question behind
 * them, so that choice is reversed first: a post a feature page links to links
 * back. The rest is filled by the catalog's own search words appearing in the
 * article, so a post about UPI finds Pay with UPI without anyone wiring it up.
 */
const FEATURES_FOR_POST = new Map();
{
  const back = new Map();
  for (const [id, c] of FEATURE_CONTENT) for (const slug of c.relatedPosts || []) {
    if (!back.has(slug)) back.set(slug, []);
    back.get(slug).push(id);
  }
  for (const p of posts) {
    const text = (p.title + ' ' + p.title + ' ' + p.html.replace(/<[^>]+>/g, ' ')).toLowerCase();
    const scored = CATALOG.features.map((f) => {
      let n = 0;
      for (const k of [f.title.toLowerCase(), ...f.keywords]) {
        if (k.length < 4) continue;
        const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        n += Math.min(5, (text.match(re) || []).length);
      }
      return [f.id, n];
    }).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const ids = [...new Set([...(back.get(p.slug) || []), ...scored])].slice(0, 3);
    FEATURES_FOR_POST.set(p.slug, ids.map((id) => CATALOG.features.find((f) => f.id === id)));
  }
}

// --- Home ------------------------------------------------------------------
{
  const r = renderDC(design, 'EvenUS Website.dc.html', {}, {}, openAll('faqs'));
  const body = routes(hookHome(r.body));
  pageAt('/', shell({
    title: 'EvenUS',
    // ⚠️ The old title was the tagline, "A fairer share of everything", which
    // nobody searches. This names the category in the words people use for it.
    seoTitle: 'EvenUS: Fair Chore and Bill Splitting App for Couples',
    description: 'The couples app for splitting chores, bills and the mental load fairly. EvenUS measures who has free time, splits costs by income and suggests one swap a week.',
    path: '/', helmet: r.helmet, body,
    jsonld: graph(ORG, APP, {
      '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: ORIGIN, name: 'EvenUS',
      publisher: { '@id': `${ORIGIN}/#organization` },
    }, faqFrom(body)),
  }));
}

// --- Blog index ------------------------------------------------------------
// The design's own <sc-for> is driven with the real 115 posts.
{
  const cats = CATEGORIES.map((label) => ({
    label,
    bg: label === 'All' ? '#1B1F1D' : 'transparent',
    fg: label === 'All' ? '#F7F5EF' : '#5E645F',
    border: label === 'All' ? '#1B1F1D' : '#DAD4C6',
  }));
  const r = renderDC(design, 'Blog.dc.html', {
    cats,
    posts: posts.map((p) => ({ cat: p.cat, title: p.title, excerpt: p.excerpt, read: p.read, url: url(p.path) })),
  });
  let body = routes(stripPrototypeHandlers(r.body));

  // Filter hooks. Each pill gets its label, each row its category.
  let i = 0;
  body = body.replace(/<button style="font-family:inherit;font-size:13px/g,
    () => `<button data-filter="${CATEGORIES[i++]}" type="button" style="font-family:inherit;font-size:13px`);
  if (i !== CATEGORIES.length) throw new Error(`blog: expected ${CATEGORIES.length} filter pills, hooked ${i}`);

  let j = 0;
  body = body.replace(/<a href="([^"]*\/blog\/[^"]*)" style="display:grid/g,
    (_m, href) => `<a href="${href}" data-cat="${esc(posts[j++].cat)}" style="display:grid`);
  if (j !== posts.length) throw new Error(`blog: expected ${posts.length} rows, hooked ${j}`);

  // The prototype's "Browse all 115" button paginated a 32-item placeholder
  // list. Every post is on the page, so it becomes the live filter count.
  body = body.replace(
    /<a href="[^"]*" style="display:inline-flex;align-items:center;gap:10px;border:1px solid #DAD4C6[^>]*>Browse all 115 pieces<\/a>/,
    `<span data-filter-count style="display:inline-flex;align-items:center;gap:10px;border:1px solid #DAD4C6;color:#5E645F;font-size:14.5px;font-weight:600;padding:14px 26px;border-radius:99px">${posts.length} pieces</span>`
  );

  pageAt('/blog/', shell({
    title: 'Blog',
    seoTitle: 'Mental Load, Chores and Money Advice for Couples',
    description: 'Writing on the mental load, splitting money fairly and dividing housework without an argument. ' + posts.length + ' pieces.',
    path: '/blog/', helmet: r.helmet, body,
    jsonld: graph(ORG, crumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog/' }]), {
      '@type': 'Blog', '@id': `${ORIGIN}/blog/#blog`, url: `${ORIGIN}/blog/`, name: 'The EvenUS blog',
      publisher: { '@id': `${ORIGIN}/#organization` },
      blogPost: posts.slice(0, 40).map((p) => ({
        '@type': 'BlogPosting', headline: p.title, url: ORIGIN + p.path,
        datePublished: p.iso || undefined, articleSection: p.cat,
      })),
    }),
  }));
}

// --- The standing pages ----------------------------------------------------
const PAGES = [
  ['Help.dc.html', '/support/', 'Help and Support', 'How to reach a human, and answers to the questions a two-person app generates.', openAll('items')],
  ['Privacy.dc.html', '/privacy/', 'Privacy Policy', 'What EvenUS stores, what it never sees, and how to get rid of all of it.', null],
  ['Terms.dc.html', '/terms/', 'Terms of Use', 'The EvenUS terms of use: the 7-day free trial, the subscription, what you agree to, and how to cancel or delete your account.', null],
  ['Disclaimer.dc.html', '/disclaimer/', 'Disclaimer', 'EvenUS is not financial advice and not therapy. What that means in practice.', null],
  ['Delete Account.dc.html', '/delete-account/', 'Delete your account', 'How to delete your EvenUS account and your data. No partner approval needed.', null],
];
for (const [file, path, title, description, transform] of PAGES) {
  const r = renderDC(design, file, {}, {}, transform);
  const body = routes(stripPrototypeHandlers(r.body));
  pageAt(path, shell({
    title, description, path, helmet: r.helmet, body,
    jsonld: graph(ORG, crumbs([{ name: 'Home', path: '/' }, { name: title, path }]), faqFrom(body)),
  }));
}

// --- Blog posts ------------------------------------------------------------
//
// ⚠️ THE HANDOFF HAS NO ARTICLE PAGE. It designs the blog index and stops. This
// template is composed from the system's own parts — the shared header and
// footer, the legal pages' prose column (16.5px/1.68, #4B504B, capped at 780px)
// and the index's category chip — so it belongs to the same design without
// inventing anything the handoff did not establish.
{
  const chrome = renderDC(design, 'Blog.dc.html', { cats: [], posts: [] });
  const header = /<header[\s\S]*?<\/header>/.exec(chrome.body)?.[0] ?? '';
  const footer = /<footer[\s\S]*?<\/footer>/.exec(chrome.body)?.[0] ?? '';
  if (!header || !footer) throw new Error('article: could not lift the shared chrome');

  // Related posts by what they are ABOUT, not by date.
  //
  // ⚠️ It took the first three posts in the category, so the same three newest
  // pieces were linked from every page in it and 74 of the rest had two inbound
  // links or fewer: the index and the hub. Crawlers judge a page's importance
  // largely by internal links, and that was starving most of the archive.
  // A small TF-IDF over the bodies spreads the links to the pages that genuinely
  // answer the next question, which is the point of a related list anyway.
  const terms = (p) => {
    const words = (p.title + ' ' + p.title + ' ' + p.html.replace(/<[^>]+>/g, ' '))
      .toLowerCase().match(/[a-z]{4,}/g) || [];
    const c = new Map();
    for (const w of words) c.set(w, (c.get(w) || 0) + 1);
    return c;
  };
  const counts = new Map(posts.map((p) => [p.slug, terms(p)]));
  const df = new Map();
  for (const c of counts.values()) for (const w of c.keys()) df.set(w, (df.get(w) || 0) + 1);
  const vecs = new Map();
  for (const [slug, c] of counts) {
    const v = new Map();
    let n = 0;
    for (const [w, k] of c) {
      const d = df.get(w);
      if (d > posts.length / 2) continue;
      const x = (1 + Math.log(k)) * Math.log(posts.length / d);
      v.set(w, x); n += x * x;
    }
    n = Math.sqrt(n) || 1;
    for (const [w, x] of v) v.set(w, x / n);
    vecs.set(slug, v);
  }
  const sim = (a, b) => { let t = 0; for (const [w, x] of a) t += x * (b.get(w) || 0); return t; };
  const nearest = new Map(posts.map((p) => {
    const v = vecs.get(p.slug);
    const ranked = posts.filter((q) => q.slug !== p.slug)
      .map((q) => [q, sim(v, vecs.get(q.slug)) + (q.cat === p.cat ? 0.05 : 0)])
      .sort((x, y) => y[1] - x[1]).map(([q]) => q);
    return [p.slug, ranked.slice(0, 4)];
  }));

  const related = (p) => {
    const siblings = nearest.get(p.slug);
    if (!siblings.length) return '';
    return `<section style="max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,88px) 28px 0">
      <h2 style="margin:0;font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#8A8F89">Read next</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:20px;margin-top:24px">
        ${siblings.map((q) => `<a href="${url(q.path)}" style="display:block;background:#fff;border:1px solid #EDE8DC;border-radius:22px;padding:26px;color:#1B1F1D">
          <div style="font-size:12.5px;color:#A9AEA8;margin-bottom:10px">${esc(q.read)} read</div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin-bottom:8px;text-wrap:pretty">${esc(q.title)}</div>
          <div style="font-size:14.5px;line-height:1.55;color:#5E645F;text-wrap:pretty">${esc(q.excerpt)}</div>
        </a>`).join('')}
      </div>
    </section>`;
  };

  // The app features this article is about, as cards in the "Read next" style.
  const relatedFeatures = (p) => {
    const list = FEATURES_FOR_POST.get(p.slug) || [];
    if (!list.length) return '';
    return `<section aria-labelledby="rf-${p.slug}" style="max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,88px) 28px 0">
      <h2 id="rf-${p.slug}" style="margin:0;font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#8A8F89">Related features</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:20px;margin-top:24px">
        ${list.map((f) => `<a href="${url(`/features/${f.id}/`)}" class="rf-card" style="display:flex;flex-direction:column;background:#fff;border:1px solid #EDE8DC;border-radius:22px;padding:26px;color:#1B1F1D">
          <div style="font-size:12.5px;color:#6F746F;margin-bottom:10px">In the app${f.pro ? ' · EvenUS Pro' : ''}</div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin-bottom:8px;text-wrap:pretty">${esc(f.title)}</div>
          <div style="font-size:14.5px;line-height:1.55;color:#5E645F;text-wrap:pretty">${esc(f.oneLiner)}</div>
          ${WHERE[f.id] ? `<div style="font-size:13.5px;line-height:1.5;color:#4B504B;margin-top:10px;text-wrap:pretty"><b style="font-weight:700;color:#1B1F1D">Where to find it:</b> ${esc(WHERE[f.id])}</div>` : ''}
          <div class="rf-cta" style="margin-top:auto;padding-top:12px;display:inline-flex;align-items:center;gap:6px;min-height:32px;font-size:14.5px;font-weight:700;color:#2E6A5C">How to use it <span aria-hidden="true">→</span></div>
        </a>`).join('')}
      </div>
    </section>`;
  };

  const AUTHOR_BOX = `<aside aria-label="About the author" style="max-width:780px;margin-top:48px;padding:26px 28px;background:#fff;border:1px solid #EDE8DC;border-radius:22px">
        <div style="font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#8A8F89">About the author</div>
        <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;margin-top:10px"><a href="${url('/about/')}" rel="author" style="color:#1B1F1D">Aapt Dubey</a></div>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#5E645F">Founder of EvenUS. MBA in Marketing and Banking, married for more than ten years, based in India. Aapt started EvenUS to measure what couples usually argue about instead: who is actually carrying the money, the time and the mental load at home.</p>
      </aside>`;

  for (const p of posts) {
    const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${routes(stripPrototypeHandlers(header))}
  <article>
    <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px clamp(24px,3vw,36px)">
      <div style="max-width:820px">
        <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#8A8F89;margin-bottom:18px">
          <a href="${url('/')}" style="color:#8A8F89">Home</a> ·
          <a href="${url('/blog/')}" style="color:#8A8F89">Blog</a> ·
          <a href="${url(`/blog/topic/${catSlug(p.cat)}/`)}" style="color:#8A8F89">${esc(p.cat)}</a>
        </nav>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">
          <a href="${url(`/blog/topic/${catSlug(p.cat)}/`)}" style="font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2E6A5C;background:#E7F2EE;border:1px solid #CFE6DE;padding:5px 10px;border-radius:99px">${esc(p.cat)}</a>
          <span style="font-size:12.5px;color:#A9AEA8">${esc(p.read)} read</span>
        </div>
        <h1 style="margin:0;font-size:clamp(30px,4.4vw,54px);line-height:1.06;letter-spacing:-.035em;font-weight:700;text-wrap:balance">${esc(p.title)}</h1>
        <p style="margin:22px 0 0;max-width:640px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty">${p.summarised ? `<strong style="color:#1B1F1D;font-weight:600">${esc(p.excerpt)}</strong>` : esc(p.excerpt)}</p>
        <div style="margin-top:26px;padding-top:22px;border-top:1px solid #E4DFD3;font-size:13.5px;color:#8A8F89">By <a href="${url('/about/')}" rel="author" style="color:#1B1F1D;font-weight:600">Aapt Dubey</a>${p.updated
          ? ` · Updated <time datetime="${p.updated}">${esc(new Date(p.updated + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))}</time>`
          : p.date ? ` · <time datetime="${p.iso || ''}">${esc(p.date)}</time>` : ''}</div>
      </div>
    </section>

    ${p.hero ? `<figure style="max-width:1180px;margin:0 auto;padding:0 28px clamp(28px,4vw,44px)">
      <picture>
        <source type="image/webp" srcset="${url(p.hero.webp)}">
        <img src="${url(p.hero.jpg)}" width="1200" height="630" alt="${esc(p.hero.alt)}" fetchpriority="high" decoding="async"
             style="display:block;width:100%;max-width:820px;height:auto;border:1px solid #EDE8DC;border-radius:22px">
      </picture>
    </figure>` : ''}
    <section style="max-width:1180px;margin:0 auto;padding:0 28px clamp(56px,7vw,96px)">
      <div class="prose" style="max-width:780px;font-size:16.5px;line-height:1.68;color:#4B504B;text-wrap:pretty">
${p.html}
      </div>
      ${AUTHOR_BOX}
    </section>
  </article>

  <section style="background:#1B1F1D;color:#F7F5EF">
    <div style="max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,88px) 28px;display:flex;flex-wrap:wrap;gap:28px;align-items:center;justify-content:space-between">
      <div style="max-width:560px">
        <h2 style="margin:0;font-size:clamp(24px,3vw,36px);line-height:1.1;letter-spacing:-.03em;font-weight:700">Reading about it is one thing. <span style="font-family:Newsreader,Georgia,serif;font-style:italic;font-weight:300;color:#8FD0BE">Measuring it</span> is another.</h2>
      </div>
      <a href="${url('/')}#demo" style="display:inline-flex;align-items:center;gap:10px;background:#F7F5EF;color:#1B1F1D;font-size:14.5px;font-weight:600;padding:14px 26px;border-radius:99px">Try the calculation</a>
    </div>
  </section>

  ${relatedFeatures(p)}

  ${related(p)}

  <div style="max-width:1180px;margin:0 auto;padding:clamp(40px,5vw,64px) 28px 0">
    <a href="${url('/blog/')}" style="font-size:14.5px;font-weight:600;color:#2E6A5C">← All writing</a>
  </div>
${routes(stripPrototypeHandlers(footer))}
</div>`;

    pageAt(p.path, shell({
      // The rewritten headlines were written against the target query, so one that
      // fits in a result is the better title; the SEO_TITLES entry is the fallback
      // for a headline too long to show whole.
      title: p.title, seoTitle: p.title.length <= 60 ? undefined : SEO_TITLES[p.slug],
      description: p.excerpt, path: p.path,
      helmet: chrome.helmet, body, published: p.iso || undefined,
      image: p.hero ? p.hero.jpg : `/topic-${catSlug(p.cat)}.png`,
      jsonld: graph(ORG,
        crumbs([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog/' },
          { name: p.cat, path: `/blog/topic/${catSlug(p.cat)}/` },
          { name: p.title, path: p.path },
        ]),
        {
          '@type': 'BlogPosting',
          '@id': ORIGIN + p.path + '#article',
          headline: p.title,
          description: p.excerpt,
          articleSection: p.cat,
          wordCount: p.words,
          datePublished: p.iso || undefined,
          dateModified: p.updated || p.iso || undefined,
          inLanguage: 'en',
          isPartOf: { '@id': `${ORIGIN}/blog/#blog` },
          image: p.hero
            ? { '@type': 'ImageObject', url: ORIGIN + p.hero.jpg, width: 1200, height: 630, caption: p.hero.alt }
            : { '@type': 'ImageObject', url: `${ORIGIN}/topic-${catSlug(p.cat)}.png`, width: 1200, height: 630 },
          ...(p.slug === 'what-is-the-mental-load' ? {
            // Naming the entity outright, rather than hoping it is inferred
            // from the prose. This page is the definition of the term the
            // whole cluster is built on.
            about: {
              '@type': 'DefinedTerm',
              name: 'Mental load',
              alternateName: ['Cognitive labour', 'Invisible labour', 'Cognitive labor'],
              description: 'The work of running a household in your head: anticipating what needs doing, deciding how and when, and monitoring whether it happened. Distinct from the physical execution of household tasks.',
              inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Household labour' },
            },
          } : {}),
          mainEntityOfPage: { '@type': 'WebPage', '@id': ORIGIN + p.path },
          author: { '@id': AUTHOR['@id'], '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
          publisher: { '@id': `${ORIGIN}/#organization` },
        }, AUTHOR),
    }));
  }
}

// --- The calculator, as its own page ------------------------------------------
//
// The homepage demo lifted onto a page of its own, because a tool earns links
// that an article never will and this one already exists in the design.
//
// ⚠️ IT IS NOT CALLED A "MENTAL LOAD CALCULATOR", and the keyword data says it
// should be: that phrase has the demand. But the thing computes DISCRETIONARY
// HOURS, and mental load is one input to it (planning hours), not its output. Naming it
// for a term it does not measure would be a small lie told for traffic, in a
// product whose entire pitch is that it does not do that. It is named for what
// it does and says plainly where mental load fits.
{
  const home = renderDC(design, 'EvenUS Website.dc.html', {}, {}, openAll('faqs'));
  const full = routes(hookHome(home.body));
  const lifted = /<section id="demo"[\s\S]*?<\/section>\s*(?=<section)/.exec(full);
  if (!lifted) throw new Error('calculator: could not lift the #demo section from the design');
  // ⚠️ THE CALCULATOR IS THE APP'S FORMULA. The port is checked against a
  // golden table made by the app's own engine, and the homepage widget's
  // static figures against the port: either drifting fails the build.
  const goldenCases = checkGolden();
  const homeView = checkHomeDemo(lifted[0]);
  console.log(`  ✅ calculator: ${goldenCases} golden cases match the app's engine; homepage widget opens on ${homeView.freeA.split(' ')[0]} vs ${homeView.freeB.split(' ')[0]} free hours, overall ${homeView.score}`);
  const demo = [calculatorDemo(lifted[0]).demo];
  const header = /<header[\s\S]*?<\/header>/.exec(full)[0];
  const footer = /<footer[\s\S]*?<\/footer>/.exec(full)[0];

  const path = '/calculator/';
  const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${header}
  <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px clamp(8px,2vw,16px)">
    <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#8A8F89;margin-bottom:18px">
      <a href="${url('/')}" style="color:#8A8F89">Home</a>
    </nav>
    <h1 style="margin:0;max-width:900px;font-size:clamp(34px,5vw,64px);line-height:1.03;letter-spacing:-.035em;font-weight:700;text-wrap:balance">Household fairness calculator</h1>
    <p style="margin:22px 0 0;max-width:640px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty">How many hours a week does each of you actually have left, once sleep, paid work, commuting, housework, childcare and planning are out, and is the money even? Move the sliders. Nothing is stored and there is no account.</p>
  </section>

${demo[0]}

  <section style="max-width:1180px;margin:0 auto;padding:0 28px clamp(64px,8vw,110px)">
    <div style="max-width:780px;font-size:16.5px;line-height:1.68;color:#4B504B">
      <h2 style="font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:0 0 18px">What it is calculating</h2>
      <p style="margin:0 0 18px">This is the formula the EvenUS app uses, run in your browser. A week has 168 hours. Take out 8 hours of sleep a night and 2 hours a day for eating, washing and getting dressed, and 98 are left. Out of those come paid work, the commute, the housework each of you logged, the hands-on care your children need, and the planning areas each of you keeps track of. What remains is free time: the hours that are genuinely yours.</p>
      <p style="margin:0 0 18px">Fairness in time means both of you end up with a similar number of them. The time balance is 100 when the two figures are equal and falls by twice the gap as a share of your combined free hours, so 25 and 25 is 100, 30 and 20 is 60, and 40 and 10 is 0. That is why this works for the case a chore list cannot handle: one partner working fifty hours who does little at home and one working twenty who does most of it can come out even, or not, and only the hours tell you which.</p>
      <p style="margin:0 0 18px">The overall score counts time at 60% and money at 40%. When time leans towards one of you and money towards the other, the two gaps partly cancel, and a trade like that can score at most 90, or less when the same week with the money paid exactly as agreed would score lower. The calculator shows the real ceiling for your figures. The app also carries over anything still open from earlier weeks and waits while too little is logged; this calculator shows one complete week with nothing carried over.</p>

            <h2 style="font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:40px 0 18px">Why 98 hours?</h2>
      <p style="margin:0 0 18px">The 98 is 168 minus 70: ten hours a day for sleep and personal care. National time-use surveys put the average a little higher. In the <a href="https://www.bls.gov/news.release/archives/atus_06262025.htm">American Time Use Survey for 2024</a> (US Bureau of Labor Statistics), people aged 15 and over averaged 9.04 hours a day sleeping, 9.80 hours on personal care including sleep, and 1.24 hours eating and drinking. In the <a href="https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/timeuseintheuk/23septemberto1october2023">ONS Time Use Survey for 23 September to 1 October 2023</a>, UK adults averaged 9 hours 3 minutes sleeping and resting, 1 hour 7 minutes eating, and 53 minutes washing, dressing and grooming.</p>
      <p style="margin:0 0 18px">Both come to about 11 hours a day. They are averages over everyone, weekends included, and the sleep figures include time spent resting in bed. The app's default of 10 hours sits slightly under them, so it leaves a little more time to share out rather than less. In the app each of you can set your own sleep and personal time; this calculator uses the defaults for both of you.</p>

            <h2 style="font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:40px 0 18px">Where does mental load come into it?</h2>
      <p style="margin:0 0 18px"><strong style="font-weight:700;color:#1B1F1D">As hours, under planning areas.</strong> In the app each of you says privately who keeps track of areas such as meal planning, money admin and school forms. Each area carries an estimated number of hours a week (meal planning 2.5, money admin 1.5, school admin 3, for example), and once you have both answered, those hours count as time, the same as any other hours. Nothing is multiplied or weighted up. The estimates are reasoned figures, not research findings. Here you answer once for both of you; in the app, where the two of you see an area differently, your answers are averaged.</p>
      <p style="margin:0 0 18px">If you want the fuller version, <a href="${url('/blog/what-is-the-mental-load/')}">what the mental load is</a> explains what gets counted and why it stays invisible.</p>

            <h2 style="font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:40px 0 18px">And the money?</h2>
      <p style="margin:0 0 18px">Separately, always. Each shared cost is split by the method you choose: proportional to income by default, meaning each person covers the share that matches their share of what comes in. The money balance then looks at what is still to even up at the end of the week, measured against the larger of a quarter of your combined monthly income, twice what the week's shared costs moved between you, and $100. Nothing outstanding is 100. Hours are never priced, because putting an hourly rate on domestic work is a claim this does not make.</p>
      <p style="margin:0 0 18px">There are four methods and the differences are real. <a href="${url('/blog/how-to-split-finances-when-incomes-differ/')}">Splitting bills when you earn different amounts</a> runs the same numbers through all of them.</p>

      <h2 style="font-size:clamp(24px,3vw,34px);line-height:1.12;letter-spacing:-.03em;font-weight:700;color:#1B1F1D;margin:40px 0 18px">What a result does not mean</h2>
      <p style="margin:0 0 18px">A gap is not a verdict about either of you. Two people can be several hours apart for a month because one of them had a bad month at work, and the arrangement is fine. It is a reason to look, not a finding.</p>
      <p style="margin:0">And a small gap is not automatically good. Two people with four free hours each are perfectly balanced and both drowning, which is a worse position than an uneven week with slack in it. <a href="${url('/blog/how-the-evenus-fairness-score-really-works-effort-money-mental-load-explained/')}">How the fairness score works</a> covers the guardrails that catch that.</p>
    </div>
  </section>
${footer}
</div>`;

  pageAt(path, shell({
    title: 'Household fairness calculator',
    seoTitle: 'Household Fairness Calculator for Couples (Free)',
    description: 'Work out the free hours each partner has once sleep, paid work, commuting, housework, childcare and planning come out, with the EvenUS app\'s formula. No account.',
    path, helmet: home.helmet, body,
    jsonld: graph(ORG,
      crumbs([{ name: 'Home', path: '/' }, { name: 'Household fairness calculator', path }]),
      {
        '@type': 'WebApplication',
        '@id': `${ORIGIN}${path}#calculator`,
        name: 'Household fairness calculator',
        applicationCategory: 'UtilitiesApplication',
        browserRequirements: 'Requires JavaScript',
        operatingSystem: 'Any',
        url: ORIGIN + path,
        publisher: { '@id': `${ORIGIN}/#organization` },
        // Genuinely free, and unrelated to the app's subscription: this is the
        // calculator that runs on this page in a browser. Do not "correct" it.
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Calculates each partner\'s free hours per week, the time balance, the money balance on shared costs and the overall fairness score, with the same formula as the EvenUS app.',
      }),
  }));
  urlsExtra.push({ loc: path, pri: '0.9' });
}

// --- Topic hubs -------------------------------------------------------------
//
// One page per category, linked from every article's breadcrumb and chip.
//
// ⚠️ These are not decoration. 115 posts with no path between them are 115
// orphans to a crawler, and the blog index alone does not group them by
// subject. A hub per topic gives each cluster a single page to rank, and gives
// every post in it an internal link from something other than a 115-row list.
{
  const cats = [...new Set(posts.map((p) => p.cat))];
  const chrome = renderDC(design, 'Blog.dc.html', { cats: [], posts: [] });
  const header = /<header[\s\S]*?<\/header>/.exec(chrome.body)[0];
  const footer = /<footer[\s\S]*?<\/footer>/.exec(chrome.body)[0];

  // What each hub is searched as, rather than its one-word label.
  const TOPIC_TITLES = {
    'Mental load': 'Mental Load in Relationships: Guides for Couples',
    'Money': 'Splitting Money as a Couple: Bills, Budgets, Accounts',
    'Using EvenUS': 'EvenUS Guides: Setting Up and Using the App',
    'Life changes': 'Sharing the Load Through Babies, Job Loss and More',
    'Reviews': 'Couples Chore and Budget Apps Compared',
  };
  const BLURB = {
    'Mental load': 'The planning, the remembering and the noticing. Why the work that leaves no trace is the work that exhausts people, and what to do about it.',
    'Money': 'Splitting bills when incomes differ, joint accounts versus separate ones, and the arguments that are never really about the money.',
    'Using EvenUS': 'How the app measures a household, what the fairness score is built from, and how to set it up with your partner.',
    'Life changes': 'A new baby, a job loss, a diagnosis, an empty house. The arrangement that worked before rarely survives, and planning for that is the work.',
    'Reviews': 'How EvenUS compares to chore apps, shared-budget apps and a spreadsheet, and where each of them stops being useful.',
  };

  for (const cat of cats) {
    const slug = catSlug(cat);
    const path = `/blog/topic/${slug}/`;
    const inCat = posts.filter((p) => p.cat === cat);
    const rows = inCat.map((p) => `        <a href="${url(p.path)}" style="display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:26px 0;border-bottom:1px solid #E9E4D8;color:#1B1F1D;text-decoration:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:12.5px;color:#A9AEA8">${esc(p.read)} read</span>
          </div>
          <div style="font-size:clamp(19px,2.1vw,25px);font-weight:700;letter-spacing:-.025em;line-height:1.22;max-width:820px;text-wrap:pretty">${esc(p.title)}</div>
          <div style="font-size:15px;line-height:1.6;color:#5E645F;max-width:760px;text-wrap:pretty">${esc(p.excerpt)}</div>
        </a>`).join('\n');

    const others = cats.filter((c) => c !== cat).map((c) =>
      `<a href="${url(`/blog/topic/${catSlug(c)}/`)}" style="font-size:13px;font-weight:600;padding:10px 18px;border-radius:99px;border:1px solid #DAD4C6;color:#5E645F">${esc(c)}</a>`
    ).join('');

    const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${routes(stripPrototypeHandlers(header))}
  <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px clamp(24px,3vw,32px)">
    <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#8A8F89;margin-bottom:18px">
      <a href="${url('/')}" style="color:#8A8F89">Home</a> ·
      <a href="${url('/blog/')}" style="color:#8A8F89">Blog</a>
    </nav>
    <h1 style="margin:0;font-size:clamp(34px,5vw,64px);line-height:1.03;letter-spacing:-.035em;font-weight:700;text-wrap:balance">${esc(cat)}</h1>
    <p style="margin:20px 0 0;max-width:620px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty">${esc(BLURB[cat] || '')}</p>
    <p style="margin:16px 0 0;font-size:13.5px;color:#8A8F89">${inCat.length} ${inCat.length === 1 ? 'piece' : 'pieces'}</p>
    <img src="${url(`/topic-${slug}.png`)}" width="1200" height="630" decoding="async"
         alt="${esc(cat)}: ${esc((BLURB[cat] || '').split('. ')[0])}. Writing from EvenUS."
         style="width:100%;max-width:760px;height:auto;margin-top:36px;border:1px solid #EDE8DC;border-radius:22px">
  </section>

  <section style="max-width:1180px;margin:0 auto;padding:0 28px">
    <div style="display:flex;flex-wrap:wrap;gap:9px;padding-bottom:32px;border-bottom:1px solid #E4DFD3">
      <a href="${url('/blog/')}" style="font-size:13px;font-weight:600;padding:10px 18px;border-radius:99px;border:1px solid #DAD4C6;color:#5E645F">All</a>
      ${others}
    </div>
  </section>

  <section style="max-width:1180px;margin:0 auto;padding:clamp(36px,4vw,56px) 28px clamp(64px,8vw,110px)">
    <div style="display:flex;flex-direction:column">
${rows}
    </div>
  </section>
${routes(stripPrototypeHandlers(footer))}
</div>`;

    pageAt(path, shell({
      title: cat,
      seoTitle: TOPIC_TITLES[cat],
      description: BLURB[cat] || `${inCat.length} pieces on ${cat.toLowerCase()}.`,
      path, helmet: chrome.helmet, body,
      image: `/topic-${slug}.png`,
      jsonld: graph(ORG,
        crumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog/' }, { name: cat, path }]),
        {
          '@type': 'CollectionPage',
          '@id': ORIGIN + path,
          name: `${cat} · EvenUS`,
          description: BLURB[cat] || '',
          isPartOf: { '@id': `${ORIGIN}/blog/#blog` },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: inCat.length,
            itemListElement: inCat.slice(0, 40).map((p, i) => ({
              '@type': 'ListItem', position: i + 1, url: ORIGIN + p.path, name: p.title,
            })),
          },
        }),
    }));
    urlsExtra.push({ loc: path, pri: '0.8' });
  }
}

// --- Features ---------------------------------------------------------------
const FEATURE_BUILD = buildFeatures({
  root, design, renderDC, routes, stripPrototypeHandlers, url, esc, shell, pageAt, graph, crumbs,
  ORIGIN, ORG, APP, AUTHOR, posts, catalog: CATALOG, contents: FEATURE_CONTENT, screenshots: SHOTS, hub: HUB, where: WHERE,
});
{
  // ⚠️ A feature page under 900 words is a thin page: it fails the build.
  const w = FEATURE_BUILD.report;
  const thin = w.filter((r) => r.words < 900);
  if (thin.length) throw new Error('thin feature pages (under 900 words):\n  ' + thin.map((r) => `${r.id}: ${r.words}`).join('\n  '));
  const pages = w.filter((r) => r.id !== '(hub)').map((r) => r.words);
  const cards = w.filter((r) => r.id !== '(hub)').map((r) => r.withCards);
  console.log(`  ✅ features: hub ${w[0].words} words, ${pages.length} pages ${Math.min(...pages)} to ${Math.max(...pages)} words of content` +
    ` (${Math.min(...cards)} to ${Math.max(...cards)} with the related cards)`);
  const { screenshotsHave: have, screenshotsWant: want } = FEATURE_BUILD;
  console.log(`  ${have === want ? '✅' : '⚠️ '} feature screenshots: ${have} of ${want} in static/img/features/` +
    (have === want ? '' : ' (TODO: capture the rest from src/features/screenshots.json; figures without a file are not rendered)'));
}
urlsExtra.push({ loc: '/features/', pri: '0.9', lastmod: HUB.updated });
for (const f of CATALOG.features) {
  const c = FEATURE_CONTENT.get(f.id);
  const shot = (SHOTS.shots || []).find((s) => s.feature === f.id && existsSync(join(root, 'static/img/features', s.file)));
  urlsExtra.push({ loc: `/features/${f.id}/`, pri: '0.7', lastmod: c.updated, image: shot ? `/img/features/${shot.file}` : undefined });
}

// --- Prose styling for the article body ------------------------------------
// The articles are semantic HTML with no attributes, so the type scale
// is applied from one rule set rather than inline on every element.
emit('article.css', `
.prose h2 { font-size: clamp(22px,2.6vw,30px); line-height:1.16; letter-spacing:-.028em;
  font-weight:700; color:#1B1F1D; margin:44px 0 14px; text-wrap:balance; }
.prose h3 { font-size:19px; font-weight:700; letter-spacing:-.02em; color:#1B1F1D; margin:32px 0 10px; }
.prose p { margin:0 0 20px; }
.prose ul, .prose ol { margin:0 0 22px; padding-left:22px; }
.prose li { margin-bottom:9px; }
.prose strong { font-weight:700; color:#1B1F1D; }
.prose blockquote { margin:26px 0; padding:18px 22px; background:#fff;
  border:1px solid #EDE8DC; border-left:3px solid #6FB3A2; border-radius:16px; }
.prose blockquote p:last-child { margin-bottom:0; }
.prose a { color:#2E6A5C; text-decoration:underline; text-underline-offset:2px; }
.prose table { width:100%; border-collapse:collapse; margin:0 0 22px; display:block; overflow-x:auto; }
.prose td, .prose th { border-bottom:1px solid #E4DFD3; padding:11px 14px 11px 0; text-align:left; vertical-align:top; }
.rf-card { transition:border-color .2s; }
.rf-card:hover { border-color:#6FB3A2 !important; }
.rf-card:focus-visible { outline:2px solid #2E6A5C; outline-offset:2px; }
.rf-card:hover .rf-cta, .rf-card:focus-visible .rf-cta { text-decoration:underline; text-underline-offset:3px; }
`.trim());

// --- Static bits -----------------------------------------------------------
// The fairness engine (src/calc/engine.js, the app's formula) rides in front
// of the page script: one request, and the calculator cannot load without it.
emit('site.js', ENGINE_SOURCE + '\n' + readFileSync(join(here, 'dc/site.js'), 'utf8'));
emit('favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="14" fill="#F7F5EF"/>` +
  `<g fill="none" stroke-width="7" stroke-linecap="round">` +
  `<path d="M19 56 C19 47 28 45 28 34 L28 9" stroke="#6FB3A2"/>` +
  `<path d="M45 56 C45 47 36 45 36 34 L36 9" stroke="#F0A48A"/></g></svg>\n`);
emit('.nojekyll', '');

// ⚠️ og.png is COMMITTED, not generated at build time. It is rendered from an
// SVG with macOS `qlmanage`, and the deploy runs on Linux — generating it in
// the build would work on a laptop and fail in CI. Regenerate it locally when
// the hero copy changes; the sharing card quoting a headline the page no longer
// carries is the failure to watch for.
// --- About ------------------------------------------------------------------
//
// Who is behind the site. An author byline that leads nowhere is worth little
// to a reader and less to a search engine checking whether the writer exists;
// this is where every byline points, and the LinkedIn link is what makes it
// checkable.
//
// ⚠️ Every claim about the founder here was supplied by the founder. Do not
// pad it out with experience or credentials nobody has confirmed.
{
  const chrome = renderDC(design, 'Blog.dc.html', { cats: [], posts: [] });
  const header = /<header[\s\S]*?<\/header>/.exec(chrome.body)[0];
  const footer = /<footer[\s\S]*?<\/footer>/.exec(chrome.body)[0];
  const P = 'margin:0 0 18px';
  const H2 = 'margin:44px 0 14px;font-size:clamp(22px,2.6vw,30px);line-height:1.15;letter-spacing:-.025em;font-weight:700;color:#1B1F1D';
  const pillars = posts.filter((p) => p.pillar).slice(0, 6);
  const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${routes(stripPrototypeHandlers(header))}
  <article>
    <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px clamp(24px,3vw,36px)">
      <div style="max-width:820px">
        <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#8A8F89;margin-bottom:18px"><a href="${url('/')}" style="color:#8A8F89">Home</a> · About</nav>
        <h1 style="margin:0;font-size:clamp(30px,4.4vw,54px);line-height:1.06;letter-spacing:-.035em;font-weight:700;text-wrap:balance">About EvenUS and its founder, Aapt Dubey</h1>
        <p style="margin:22px 0 0;max-width:640px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty"><strong style="color:#1B1F1D;font-weight:600">EvenUS is a couples app that measures how fairly money, time and mental load are shared at home, then suggests one task to swap each week. It was founded in India by Aapt Dubey, who writes the articles on this site.</strong></p>
      </div>
    </section>
    <section style="max-width:1180px;margin:0 auto;padding:0 28px clamp(56px,7vw,96px)">
      <div class="prose" style="max-width:780px;font-size:16.5px;line-height:1.68;color:#4B504B;text-wrap:pretty">
        <h2 style="${H2};margin-top:8px">Aapt Dubey, founder</h2>
        <ul style="margin:0 0 18px;padding-left:20px">
          <li>Founder of EvenUS</li>
          <li>MBA in Marketing and Banking</li>
          <li>Married for more than ten years</li>
          <li>Based in India</li>
          <li><a href="https://www.linkedin.com/in/aaptdubey/" rel="me noopener" target="_blank">Aapt Dubey on LinkedIn</a></li>
        </ul>
        <p style="${P}">An MBA in marketing and banking is a training in how money moves and how people decide about it. A decade of marriage is a training in something harder: how two people who love each other can still disagree about who did the dishes, who remembered the dentist and whose salary pays the rent.</p>
        <p style="${P}">Most of those disagreements are not about the task. They are about whether the whole arrangement feels fair, and nobody can see the whole arrangement, because half of it happens in someone's head. EvenUS exists to make that visible with numbers both partners agree on, so the conversation is about a shared picture rather than two memories.</p>

        <h2 style="${H2}">What EvenUS measures</h2>
        <p style="${P}"><strong>Free time.</strong> The hours left in each partner's week once sleep, paid work, commuting and household work come out. You can run the same calculation in the <a href="${url('/calculator/')}">household fairness calculator</a> without an account.</p>
        <p style="${P}"><strong>Money, on its own axis.</strong> By default shared costs split in proportion to income, so a partner earning 60% of the household income pays 60% of the shared bills. Couples can choose one of three other methods instead. Hours are never converted into money.</p>
        <p style="${P}"><strong>Mental load.</strong> The planning and remembering behind household work. Each partner says privately who keeps track of areas such as meals, money admin and school forms, and those areas count as estimated hours inside each person's time, not as a separate score or a multiplier. <a href="${url('/blog/what-is-the-mental-load/')}">What the mental load is</a> explains the term.</p>

        <h2 style="${H2}">What EvenUS deliberately does not do</h2>
        <p style="${P}">It does not connect to a bank. It never shows one partner a score for the other person. Weekly check-in answers are private. It has no streaks, badges, leaderboards or features for nudging your partner. Those are decisions, not gaps: a fairness app that becomes a scorekeeping app makes the problem worse.</p>

        <h2 style="${H2}">How the writing on this site is made</h2>
        <p style="${P}">Articles are written or reviewed by Aapt Dubey. They are general information about relationships and household money, not financial, legal or therapeutic advice; the <a href="${url('/disclaimer/')}">disclaimer</a> says when EvenUS is the wrong tool. Similar older articles have been merged so that each question has one answer. If you spot something wrong, write to <a href="mailto:support@evenus.app">support@evenus.app</a> and it will be corrected.</p>

        <h2 style="${H2}">Start with these</h2>
        <ul style="margin:0 0 18px;padding-left:20px">
          ${pillars.map((p) => `<li><a href="${url(p.path)}">${esc(p.title)}</a></li>`).join('\n          ')}
        </ul>

        <h2 style="${H2}">Contact</h2>
        <p style="${P}">Email <a href="mailto:support@evenus.app">support@evenus.app</a>. Answers to common questions are on the <a href="${url('/support/')}">help page</a>.</p>
      </div>
    </section>
  </article>
${routes(stripPrototypeHandlers(footer))}
</div>`;
  pageAt('/about/', shell({
    title: 'About EvenUS and its founder, Aapt Dubey',
    seoTitle: 'About EvenUS and Founder Aapt Dubey',
    description: 'EvenUS is a couples app for sharing money, time and mental load fairly, founded in India by Aapt Dubey, an MBA in Marketing and Banking married for 10+ years.',
    path: '/about/', helmet: chrome.helmet, body,
    jsonld: graph(ORG, AUTHOR,
      crumbs([{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }]),
      {
        '@type': ['AboutPage', 'ProfilePage'],
        '@id': `${ORIGIN}/about/`,
        url: `${ORIGIN}/about/`,
        name: 'About EvenUS and its founder, Aapt Dubey',
        mainEntity: { '@id': AUTHOR['@id'] },
        about: { '@id': `${ORIGIN}/#organization` },
      }),
  }));
}

// --- Invite landing: /join/<CODE> ---------------------------------------------
//
// Invite links are https://evenus.app/join/<CODE> (app fix round 15, X8). With
// the app installed and the .well-known files live, the phone opens the app
// and this page is never seen. Everyone else lands here: no app yet, a desktop
// browser, or a phone whose link verification has not happened.
//
// ONE static page serves every code. vercel.json rewrites /join/:code/ to it,
// and site.js joinPage() reads the code out of the address bar, checks it
// against the app's alphabet and length, and paints it. Nothing is looked up:
// the page cannot tell a live code from an expired one, and does not pretend to.
//
// ⚠️ noindex, no analytics request of any kind before consent (JOIN_ANALYTICS),
// no-referrer, and the code never appears in the title, so it does not leak
// into history titles, bookmarks or an analytics report.
//
// Every label in the steps is the app's own (src/i18n/en/appCore.ts: signup
// "Create account", verifyEmail "Check your email" / "I've confirmed it",
// setup "Set up your household." / "Join with a code" / "Join household").
//
// The script runs inline, straight after the card, so the code is on screen in
// the first paint: no flash of the wrong state and no layout shift. It only
// ever writes with textContent and a validated code.
const JOIN_SCRIPT = `
(function () {
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', LENGTH = 8;
  var root = document.querySelector('[data-join]');
  if (!root) return;
  var q = function (s) { return root.querySelector(s); };
  var seg = location.pathname.split('/').filter(Boolean);
  var i = seg.indexOf('join');
  var raw = i >= 0 && seg[i + 1] ? seg[i + 1] : '';
  try { raw = decodeURIComponent(raw); } catch (e) { raw = ''; }
  var code = raw.replace(/[\\s-]/g, '').toUpperCase();
  var valid = code.length === LENGTH && code.split('').every(function (c) { return ALPHABET.indexOf(c) >= 0; });
  if (!valid) { q('[data-join-none]').hidden = false; return; }
  var shown = q('[data-join-code]');
  shown.textContent = code.slice(0, 4) + ' ' + code.slice(4);
  shown.setAttribute('aria-label', code.split('').join(' '));
  q('[data-join-open]').href = 'evenus://join/' + code;
  q('[data-join-ok]').hidden = false;
  var status = q('[data-join-status]');
  function said(t) { status.textContent = ''; setTimeout(function () { status.textContent = t; }, 30); }
  function fallback() {
    var t = document.createElement('textarea');
    t.value = code; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    t.remove();
    said(ok ? 'Code copied.' : 'Copy did not work here. The code is ' + code + '.');
  }
  q('[data-join-copy]').addEventListener('click', function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(function () { said('Code copied.'); }, fallback);
    } else fallback();
  });
})();
`;
{
  const chrome = renderDC(design, 'Blog.dc.html', { cats: [], posts: [] });
  const header = /<header[\s\S]*?<\/header>/.exec(chrome.body)[0];
  const footer = /<footer[\s\S]*?<\/footer>/.exec(chrome.body)[0];
  const path = '/join/';
  const H2 = 'margin:0 0 14px;font-size:clamp(22px,5vw,28px);line-height:1.15;letter-spacing:-.025em;font-weight:700;color:#1B1F1D';
  const BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:99px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none';
  const badge = (pre, name, glyph) => `<li style="display:inline-flex;align-items:center;gap:12px;background:#1B1F1D;color:#F7F5EF;padding:12px 20px;border-radius:14px;min-height:48px;box-sizing:border-box">
          <span aria-hidden="true" style="font-size:20px;line-height:1">${glyph}</span>
          <span style="text-align:left;line-height:1.15"><span style="display:block;font-size:11px;letter-spacing:.06em;color:#C9CCC6">${pre}</span><span style="display:block;font-size:16.5px;font-weight:600;letter-spacing:-.01em">${name}</span></span>
        </li>`;
  const step = (n, title, html) => `<li style="display:grid;grid-template-columns:36px minmax(0,1fr);gap:14px;align-items:start;padding:18px 0;border-top:1px solid #E4DFD3">
          <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:99px;background:#E7F2EE;color:#2E6A5C;font-weight:700;font-size:14.5px">${n}</span>
          <div><h3 style="margin:4px 0 6px;font-size:17px;font-weight:700;letter-spacing:-.015em;color:#1B1F1D">${title}</h3><p style="margin:0;font-size:15.5px;line-height:1.6;color:#4B504B">${html}</p></div>
        </li>`;

  const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${routes(stripPrototypeHandlers(header))}
  <section aria-labelledby="join-h1" style="max-width:640px;margin:0 auto;padding:clamp(36px,7vw,72px) 20px 8px">
    <p style="margin:0 0 12px;font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#5E645F">Invite</p>
    <h1 id="join-h1" style="margin:0;font-size:clamp(32px,8vw,52px);line-height:1.05;letter-spacing:-.035em;font-weight:700;text-wrap:balance">Join your partner on EvenUS</h1>
    <p style="margin:18px 0 0;font-size:17px;line-height:1.6;color:#4B504B;text-wrap:pretty">Your partner set up your household on EvenUS and sent you this link. EvenUS compares two people’s week, so it only works with both of you.</p>

    <div data-join style="margin-top:28px;background:#fff;border:1px solid #EDE8DC;border-radius:22px;padding:24px 20px">
      <div data-join-ok hidden>
        <h2 id="join-code-label" style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5E645F">Your invite code</h2>
        <p data-join-code aria-labelledby="join-code-label" style="margin:10px 0 0;font-size:clamp(34px,11vw,52px);line-height:1.1;font-weight:700;letter-spacing:.14em;color:#1B1F1D;font-variant-numeric:tabular-nums;word-break:break-all"></p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">
          <a data-join-open href="evenus://join/" style="${BTN};background:#1B1F1D;color:#F7F5EF;border:1px solid #1B1F1D">Open in EvenUS</a>
          <button data-join-copy type="button" style="${BTN};background:#fff;color:#1B1F1D;border:1px solid #B9B3A5">Copy code</button>
        </div>
        <p data-join-status role="status" aria-live="polite" style="margin:12px 0 0;min-height:1.5em;font-size:14.5px;color:#2E6A5C;font-weight:600"></p>
        <p style="margin:4px 0 0;font-size:14.5px;line-height:1.55;color:#5E645F">“Open in EvenUS” works once the app is on this phone. Codes work for seven days; if yours has run out, ask your partner to send a new one.</p>
      </div>
      <div data-join-none hidden>
        <h2 style="margin:0;font-size:19px;font-weight:700;letter-spacing:-.015em;color:#1B1F1D">This link has no complete code</h2>
        <p style="margin:10px 0 0;font-size:15.5px;line-height:1.6;color:#4B504B">An invite code is eight letters and numbers. Ask your partner to send the invite again, or to read you the code from Us, then “Invite your partner”. You type it in at step 4 below.</p>
      </div>
      <noscript><p style="margin:0;font-size:15.5px;line-height:1.6;color:#4B504B">Your invite code is the last part of this page’s address: eight letters and numbers. You type it in at step 4 below.</p></noscript>
    </div>
    <script>${JOIN_SCRIPT}</script>
  </section>

  <section aria-labelledby="join-get" style="max-width:640px;margin:0 auto;padding:36px 20px 8px">
    <h2 id="join-get" style="${H2}">Don’t have the app yet?</h2>
    <p style="margin:0;font-size:15.5px;line-height:1.6;color:#4B504B">EvenUS is in closed testing and is not on the app stores yet. Your first 7 days are free. Want in early? Email <a href="mailto:support@evenus.app">support@evenus.app</a> and we’ll send you a link.</p>
    <ul aria-label="App stores" style="list-style:none;margin:20px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:12px">
        ${badge('Coming soon to the', 'App Store', '')}
        ${badge('Coming soon to', 'Google Play', '▶')}
    </ul>
  </section>

  <section aria-labelledby="join-steps" style="max-width:640px;margin:0 auto;padding:36px 20px clamp(56px,8vw,96px)">
    <h2 id="join-steps" style="${H2}">How to join</h2>
    <ol style="list-style:none;margin:0;padding:0">
        ${step(1, 'Install EvenUS', 'Put the app on your phone. If you open this link again afterwards, the app keeps your code for you.')}
        ${step(2, 'Sign up', 'Open EvenUS and make your account, then tap “Create account”.')}
        ${step(3, 'Confirm your email', 'On “Check your email”, open the email we send and tap the link in it, then come back and tap “I’ve confirmed it”. Your partner’s invite is matched to your email, so it is confirmed before you join.')}
        ${step(4, 'Join with a code', 'On “Set up your household”, tap “Join with a code”, enter the code, and tap “Join household”. Already in another household? Leave that one first, from Us, then Household.')}
    </ol>
    <p style="margin:24px 0 0;font-size:14.5px;line-height:1.6;color:#5E645F">Stuck? Write to <a href="mailto:support@evenus.app">support@evenus.app</a>, or read <a href="${url('/features/invite-partner/')}">how inviting a partner works</a>.</p>
  </section>
${routes(stripPrototypeHandlers(footer))}
</div>`;

  pageAt(path, shell({
    title: 'Join your partner on EvenUS',
    description: 'Your partner invited you to their household on EvenUS. Open the invite in the app, or install EvenUS and join with your eight-character code.',
    path, helmet: chrome.helmet, body, noindex: true,
    extraHead: '<meta name="referrer" content="no-referrer">',
    analytics: JOIN_ANALYTICS,
  }));
}

// --- App links: .well-known ----------------------------------------------------
// Written only when the owner's values are present; see src/applinks.mjs.
{
  const { files, todo } = appLinkFiles(root);
  for (const [p, b] of files) emit(p, b);
  for (const t of todo) console.log(`  ⚠️  ${t}`);
  if (files.length) console.log(`  ✅ app links: ${files.map(([p]) => '/' + p).join(', ')}`);
}

// vercel.json must carry what the join page and the .well-known files rely on.
{
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const rw = (vercel.rewrites || []).find((r) => r.source.startsWith('/join/:code') && r.source.endsWith('/'));
  if (!rw || rw.destination !== '/join/index.html') throw new Error('vercel.json: missing rewrite /join/:code/ -> /join/index.html');
  for (const f of ['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
    const h = (vercel.headers || []).find((x) => x.source === f);
    if (!h || !h.headers.some((x) => x.key === 'Content-Type' && x.value === 'application/json')) throw new Error(`vercel.json: ${f} needs Content-Type: application/json`);
  }
  if ((vercel.redirects || []).some((r) => r.source.startsWith('/.well-known') || r.source.startsWith('/join'))) {
    throw new Error('vercel.json: no redirect may touch /.well-known/* or /join/*');
  }
}

// Recursive, because static/ now holds a fonts/ directory and a flat copy
// silently shipped nothing from it: the build succeeded, the CSS referenced
// /fonts/*.woff2, and every face 404'd.
(function copyStatic(dir, prefix = '') {
  for (const f of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (f.isDirectory()) copyStatic(join(dir, f.name), `${prefix}${f.name}/`);
    else emit(prefix + f.name, readFileSync(join(root, dir, f.name)));
  }
})('static');

const urls = [
  { loc: '/', pri: '1.0' }, { loc: '/blog/', pri: '0.9' }, { loc: '/support/', pri: '0.7' },
  { loc: '/privacy/', pri: '0.4' }, { loc: '/terms/', pri: '0.4' },
  { loc: '/disclaimer/', pri: '0.3' }, { loc: '/delete-account/', pri: '0.5' },
  { loc: '/about/', pri: '0.8' },
  ...urlsExtra,
  ...posts.map((p) => ({ loc: p.path, pri: '0.7', lastmod: p.updated || p.iso, image: p.hero?.jpg })),
];
// A hub changes when something is added to it, so its lastmod is its newest post.
function HUB_LASTMOD(loc) {
  const newest = (list) => list.map((p) => p.iso).filter(Boolean).sort().pop();
  if (loc === '/' || loc === '/blog/') return newest(posts.map((p) => ({ iso: p.updated || p.iso })));
  const m = /^\/blog\/topic\/([^/]+)\/$/.exec(loc);
  if (m) return newest(posts.filter((p) => catSlug(p.cat) === m[1]).map((p) => ({ iso: p.updated || p.iso })));
  return null;
}
emit('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  urls.map((u) => `  <url><loc>${ORIGIN}${u.loc}</loc>` +
    ((u.lastmod || HUB_LASTMOD(u.loc)) ? `<lastmod>${u.lastmod || HUB_LASTMOD(u.loc)}</lastmod>` : '') +
    `<priority>${u.pri}</priority>` +
    (u.image ? `<image:image><image:loc>${ORIGIN}${u.image}</image:loc></image:image>` : '') +
    `</url>`).join('\n') + `\n</urlset>\n`);
// The AI crawlers are named outright, not left to the wildcard. The wildcard
// already allows them; naming them is a statement of intent that survives
// someone later adding a Disallow under '*' for an unrelated reason.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
  'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];
emit('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404.html\n\n` +
  AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n') +
  `\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// --- RSS -------------------------------------------------------------------
// The site's own feed, and the destination for the old /feed/ URLs that feed
// readers and aggregators still poll. Newest 30, summary only.
{
  const x = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rfc = (iso) => new Date(iso + 'T09:00:00Z').toUTCString();
  const recent = [...posts].sort((a, b) => (b.updated || b.iso || '').localeCompare(a.updated || a.iso || '')).slice(0, 30);
  emit('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>EvenUS</title>
<link>${ORIGIN}/blog/</link>
<atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Writing on the mental load, splitting money fairly and dividing housework without an argument.</description>
<language>en-gb</language>
${recent.map((p) => `<item>
<title>${x(p.title)}</title>
<link>${ORIGIN}${p.path}</link>
<guid isPermaLink="true">${ORIGIN}${p.path}</guid>
<dc:creator>Aapt Dubey</dc:creator>
<category>${x(p.cat)}</category>
${p.updated || p.iso ? `<pubDate>${rfc(p.updated || p.iso)}</pubDate>` : ''}
<description>${x(p.excerpt)}</description>
</item>`).join('\n')}
</channel>
</rss>
`);
}

// --- llms.txt ---------------------------------------------------------------
//
// A curated map of the site for language models and the agents that read on
// their behalf, in the llmstxt.org shape: what this is, then the pages worth
// reading, each with a line saying why.
//
// ⚠️ NOT A SECOND SITEMAP. sitemap.xml already lists all 130 URLs and a crawler
// has it. Reproducing that here would bury the four pages that answer anything
// under 117 that mostly do not. It is generated from the build so it cannot
// drift, and it lists the hand-written pages plus the hubs, because those are
// the ones with a defensible answer in them.
//
// Google has said it does not use llms.txt. This is a cheap bet on the other
// readers, not a ranking tactic, and it should not be described as one.
{
  const pillars = posts.filter((p) => p.pillar);
  const cats = [...new Set(posts.map((p) => p.cat))];
  const line = (t, u, d) => `- [${t}](${ORIGIN}${u}): ${d}`;

  emit('llms.txt', `# EvenUS

> A mobile app for couples that measures how fairly money, time and mental load are shared in a household, then suggests one specific task to swap each week.

EvenUS measures discretionary time: the hours left in each partner's week once sleep, paid work, commuting and household work are subtracted. Money is measured on a separate axis and hours are never converted into currency. The mental load (planning and remembering) is counted as hours inside the time figure, once both partners have answered a short private set of questions.

The app is in closed testing and is not yet on the app stores. Pricing: a 7-day free trial with no card required, then $9.99 a month or $79.99 a year. One subscription covers both partners. It requires both partners to take part.

Facts that are commonly got wrong about it: it does not connect to a bank, it never shows one partner a score for the other person, weekly check-in answers are private and enforced as such in the database rules, and it has no streaks, badges, leaderboards or partner-nudging features. These are deliberate refusals rather than missing features.

## Common questions

- What is the best app for splitting chores fairly with a partner? EvenUS is built for that one job: both partners log household work, it counts the planning and remembering (the mental load) as hours, and it compares the free hours each person has left rather than counting tasks.
- How do couples split bills when one earns more? The common fair method is income-proportional: each partner pays the same percentage of their income. EvenUS calculates that share, and the [calculator](${ORIGIN}/calculator/) runs it in a browser with no account.
- Is there an app that tracks the mental load? Yes. EvenUS asks each partner privately who keeps track of each area of the household, and counts the planning and remembering as hours inside each person's time.
- How is EvenUS different from Honeydue, Splitwise or a chore chart? Those track money or tasks. EvenUS measures whether the overall arrangement is fair across time, money and mental load, and suggests one swap a week.
- Does EvenUS connect to a bank? No.

## Start here

${pillars.map((p) => line(p.title, p.path, p.excerpt)).join('\n')}

## Features

${line('All features', '/features/', `Every EvenUS feature, ${CATALOG.features.length} in ${CATALOG.groups.length} groups, each with step-by-step instructions, what your partner sees, and whether it is part of EvenUS Pro.`)}
${CATALOG.groups.map((g) => `\n### ${g.title}\n\n` + g.features.map((id) => {
  const f = CATALOG.features.find((x) => x.id === id);
  return line(f.title, `/features/${f.id}/`, f.oneLiner + (f.pro ? ' (EvenUS Pro)' : ''));
}).join('\n')).join('\n')}

## Tools

${line('Household fairness calculator', '/calculator/', 'Runs the discretionary-hours calculation in the browser. No account, nothing stored.')}

## Topics

${cats.map((c) => line(c, `/blog/topic/${catSlug(c)}/`, `${posts.filter((p) => p.cat === c).length} pieces on ${c.toLowerCase()}.`)).join('\n')}

## Policies

${line('Privacy Policy', '/privacy/', 'What is stored, what is never seen, and what each partner can see of the other.')}
${line('Terms of Use', '/terms/', 'The agreement, including the 18+ requirement and governing law.')}
${line('Disclaimer', '/disclaimer/', 'Not financial advice and not therapy. States plainly when the app is the wrong tool.')}
${line('Delete your account', '/delete-account/', 'Deletion is immediate and needs no partner approval. Reachable without signing in.')}
${line('Help', '/support/', 'Common questions and how to reach a person.')}

## All articles

${posts.filter((p) => !p.pillar).map((p) => line(p.title, p.path, p.excerpt)).join('\n')}
`);
}

{
  const r = renderDC(design, 'Disclaimer.dc.html');
  emit('404.html', shell({
    title: 'Page not found',
    description: 'That page does not exist.',
    path: '/404.html', helmet: r.helmet, noindex: true,
    body: `<div style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:80px 28px">
  <div style="max-width:560px;text-align:center">
    <h1 style="margin:0;font-size:clamp(30px,4.4vw,54px);line-height:1.06;letter-spacing:-.035em;font-weight:700">That page isn't here.</h1>
    <p style="margin:20px 0 30px;font-size:17.5px;line-height:1.6;color:#5E645F">It may have moved when the site was rebuilt.</p>
    <a href="${url('/')}" style="display:inline-flex;background:#1B1F1D;color:#F7F5EF;font-size:14.5px;font-weight:600;padding:13px 24px;border-radius:99px">Back to the homepage</a>
  </div>
</div>`,
  }));
}

// --- Link the stylesheet into the article pages ----------------------------
for (const p of posts) {
  const f = join(out, p.path.replace(/^\/|\/$/g, ''), 'index.html');
  writeFileSync(f, readFileSync(f, 'utf8')
    .replace('</head>', `<link rel="stylesheet" href="${url('/article.css')}">\n</head>`));
}

// --- Checks ----------------------------------------------------------------
// Every root-relative link must land on a file this build wrote. A merged post,
// a renamed slug or a typo in a hand-written piece otherwise ships as a 404
// that nobody sees until Search Console reports it weeks later.
{
  const have = new Set(written.map((w) => '/' + w.replace(/index\.html$/, '')));
  const broken = new Set();
  for (const rel of written.filter((r) => r.endsWith('.html'))) {
    const html = readFileSync(join(out, rel), 'utf8');
    for (const [, u] of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const bare = BASE && u.startsWith(BASE + '/') ? u.slice(BASE.length) : u;
      if (!bare.startsWith('//') && !have.has(bare)) broken.add(`${rel} -> ${u}`);
    }
  }
  if (broken.size) throw new Error('broken internal links:\n  ' + [...broken].slice(0, 20).join('\n  '));
  console.log('  ✅ every internal link resolves');
}

console.log(`  ${written.length} files -> dist/`);
console.log(`  home, blog, ${posts.length} posts, ${PAGES.length} standing pages, 404, sitemap, robots`);

const dirty = new Map();
for (const rel of written.filter((r) => r.endsWith('.html'))) {
  // ⚠️ Scan the page WITHOUT the deliberate analytics block. googletagmanager
  // and gtag( are on the footprint list so that a pasted embed in an article
  // fails the build: GTM inside a post body is a bug, GTM in the site's own
  // footer is a decision.
  // Exempting the exact known snippet keeps the check honest instead of
  // deleting the two entries and losing the guarantee entirely.
  const b = readFileSync(join(out, rel), 'utf8').split(ANALYTICS).join('').split(JOIN_ANALYTICS).join('').toLowerCase();
  for (const fp of FOOTPRINTS) if (b.includes(fp.toLowerCase())) dirty.set(fp, (dirty.get(fp) || 0) + 1);
}
if (dirty.size) {
  console.error('\n❌ CMS footprints in the output:');
  for (const [fp, n] of dirty) console.error(`     ${fp} — ${n} file(s)`);
  process.exit(1);
}
console.log('  ✅ no CMS or Tag Manager footprint');

const leftovers = new Set();
for (const rel of written.filter((r) => r.endsWith('.html'))) {
  const b = readFileSync(join(out, rel), 'utf8');
  if (/<sc-for|<sc-if|<dc-import|\{\{/.test(b)) leftovers.add('unrendered design directive');
  if (/onClick=|onInput=/.test(b)) leftovers.add('prototype event handler');
  if (/\.dc\.html/.test(b)) leftovers.add('link to a design file that does not ship');
}
if (leftovers.size) { console.error('\n❌ ' + [...leftovers].join(', ')); process.exit(1); }
console.log('  ✅ no prototype runtime left in the output');

{
  let em = 0, structural = new Map();
  for (const rel of written.filter((r) => r.endsWith('.html'))) {
    const raw = readFileSync(join(out, rel), 'utf8');
    em += (raw.match(/\u2014/g) || []).length;
    const t = raw.replace(/<[^>]+>/g, ' ');
    for (const [re, name] of STRUCTURAL) {
      const n = (t.match(re) || []).length;
      if (n) structural.set(name, (structural.get(name) || 0) + n);
    }
  }
  console.log(`  ${em === 0 ? '✅' : '⚠️ '} em dashes in the output: ${em}`);
  if (structural.size) {
    const total = [...structural.values()].reduce((a, b) => a + b, 0);
    console.log(`  ⚠️  ${total} structural AI tell(s) left — these need a person, not a regex:`);
    for (const [k, n] of [...structural].sort((a, b) => b[1] - a[1])) {
      console.log(`       ${String(n).padStart(3)}  ${k}`);
    }
  }
}

const tokens = new Set();
for (const rel of written.filter((r) => r.endsWith('.html'))) {
  for (const m of readFileSync(join(out, rel), 'utf8').matchAll(/\[([A-Z][A-Z ]+)\]/g)) tokens.add(m[1]);
}
console.log('');
if (tokens.size) {
  console.log(`⚠️  Placeholders still to fill: ${[...tokens].sort().join(', ')}`);
  console.log('   They live in the design files under handoff/.\n');
} else {
  console.log('  ✅ no placeholders left\n');
}
