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
//   2. Real content. The index ships 32 placeholder posts; the site has 115
//      recovered ones, so the design's <sc-for> is driven with those instead.
// ---------------------------------------------------------------------------

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDC } from './dc/render.mjs';
import { hookHome, stripPrototypeHandlers } from './dc/hooks.mjs';
import { extractPost, FOOTPRINTS } from './site/wordpress.mjs';
import { cleanCopy, STRUCTURAL } from './site/voice.mjs';
import { CATEGORIES, curated, categoryFor, readTime } from './dc/blogdata.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const design = join(root, 'handoff');
const out = join(root, 'dist');
const ORIGIN = 'https://evenus.app';
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
 * reason this exists. Links also arrive from the recovered posts' own
 * cross-references, which no template controls — /blog/<slug>/ links written by
 * the original author and rewritten on import. Those 404 on a project site.
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
  a:focus-visible, button:focus-visible, input:focus-visible {
    outline: 2px solid #2E6A5C; outline-offset: 2px; border-radius: 4px;
  }
  .skip { position:absolute; left:-9999px; }
  .skip:focus { left:16px; top:16px; z-index:99; background:#fff; color:#1B1F1D;
    padding:12px 18px; border-radius:99px; border:1px solid #DAD4C6; font-weight:600; }
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

const ORG = {
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'EvenUS',
  url: ORIGIN,
  email: 'support@evenus.app',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'C-1604, Assotech Blith, Sector 99',
    addressLocality: 'Gurgaon',
    addressRegion: 'Haryana',
    addressCountry: 'IN',
  },
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
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/LimitedAvailability' },
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

function shell({ title, description, path, helmet, body, published, jsonld, image }) {
  const card = image || '/og.png';
  const full = path === '/' ? 'EvenUS · A fairer share of everything.' : `${title} · EvenUS`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#F7F5EF">
<link rel="canonical" href="${ORIGIN}${path}">
<meta property="og:site_name" content="EvenUS">
<meta property="og:type" content="${published ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN}${path}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ORIGIN}${card}">
<meta property="og:locale" content="en_GB">
<meta property="og:image" content="${ORIGIN}${card}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)} · EvenUS">
<link rel="icon" href="${url('/favicon.svg')}" type="image/svg+xml">
${helmet}
${A11Y}
${jsonld || ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div id="main">
${body}
</div>
<script src="${url('/site.js')}" defer></script>
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
const CURATED = curated(join(design, 'Blog.dc.html'));
const catSlug = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const posts = [];
const urlsExtra = [];
for (const f of readdirSync(join(here, 'recovered/blog')).filter((n) => n.endsWith('.html'))) {
  const slug = f.replace(/\.html$/, '');
  const p = extractPost(readFileSync(join(here, 'recovered/blog', f), 'utf8'));
  if (!p || p.words < 200) { console.log(`  ⚠️  skipped ${f}`); continue; }
  const c = CURATED.get(slug);
  posts.push({
    slug,
    path: `/blog/${slug}/`,
    html: cleanCopy(p.html),
    iso: p.iso,
    date: p.date,
    words: p.words,
    cat: c?.cat ?? categoryFor(slug),
    title: c?.title ?? cleanCopy(p.title),
    excerpt: c?.excerpt ?? cleanCopy(p.excerpt),
    read: c?.read ?? readTime(p.words),
  });
}
posts.sort((a, b) => (b.iso || '0000').localeCompare(a.iso || '0000'));

// --- Home ------------------------------------------------------------------
{
  const r = renderDC(design, 'EvenUS Website.dc.html', {}, {}, openAll('faqs'));
  const body = routes(hookHome(r.body));
  pageAt('/', shell({
    title: 'EvenUS',
    description: 'EvenUS measures how money, time and mental load are actually shared between two people, and suggests one thing to swap each week.',
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
  ['Help.dc.html', '/support/', 'Help', 'How to reach a human, and answers to the questions a two-person app generates.', openAll('faqs')],
  ['Privacy.dc.html', '/privacy/', 'Privacy Policy', 'What EvenUS stores, what it never sees, and how to get rid of all of it.', null],
  ['Terms.dc.html', '/terms/', 'Terms of Use', 'The agreement between you and EvenUS.', null],
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

  const related = (p) => {
    const siblings = posts.filter((q) => q.cat === p.cat && q.slug !== p.slug).slice(0, 3);
    if (!siblings.length) return '';
    return `<section style="max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,88px) 28px 0">
      <div style="font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#8A8F89">More on ${esc(p.cat.toLowerCase())}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-top:24px">
        ${siblings.map((q) => `<a href="${url(q.path)}" style="display:block;background:#fff;border:1px solid #EDE8DC;border-radius:22px;padding:26px;color:#1B1F1D">
          <div style="font-size:12.5px;color:#A9AEA8;margin-bottom:10px">${esc(q.read)} read</div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin-bottom:8px;text-wrap:pretty">${esc(q.title)}</div>
          <div style="font-size:14.5px;line-height:1.55;color:#5E645F;text-wrap:pretty">${esc(q.excerpt)}</div>
        </a>`).join('')}
      </div>
    </section>`;
  };

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
        <p style="margin:22px 0 0;max-width:640px;font-size:17.5px;line-height:1.6;color:#5E645F;text-wrap:pretty">${esc(p.excerpt)}</p>
        <div style="margin-top:26px;padding-top:22px;border-top:1px solid #E4DFD3;font-size:13.5px;color:#8A8F89">${p.date ? esc(p.date) : ''}</div>
      </div>
    </section>

    <section style="max-width:1180px;margin:0 auto;padding:0 28px clamp(56px,7vw,96px)">
      <div class="prose" style="max-width:780px;font-size:16.5px;line-height:1.68;color:#4B504B;text-wrap:pretty">
${p.html}
      </div>
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

  ${related(p)}

  <div style="max-width:1180px;margin:0 auto;padding:clamp(40px,5vw,64px) 28px 0">
    <a href="${url('/blog/')}" style="font-size:14.5px;font-weight:600;color:#2E6A5C">← All writing</a>
  </div>
${routes(stripPrototypeHandlers(footer))}
</div>`;

    pageAt(p.path, shell({
      title: p.title, description: p.excerpt, path: p.path,
      helmet: chrome.helmet, body, published: p.iso || undefined,
      image: `/topic-${catSlug(p.cat)}.png`,
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
          dateModified: p.iso || undefined,
          inLanguage: 'en',
          isPartOf: { '@id': `${ORIGIN}/blog/#blog` },
          image: { '@type': 'ImageObject', url: `${ORIGIN}/topic-${catSlug(p.cat)}.png`, width: 1200, height: 630 },
          mainEntityOfPage: { '@type': 'WebPage', '@id': ORIGIN + p.path },
          author: { '@id': `${ORIGIN}/#organization` },
          publisher: { '@id': `${ORIGIN}/#organization` },
        }),
    }));
  }
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
         alt="${esc(cat)} — writing from EvenUS on ${esc((BLURB[cat] || '').toLowerCase().replace(/\.$/, ''))}"
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

// --- Prose styling for the article body ------------------------------------
// The recovered posts are semantic HTML with no attributes, so the type scale
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
`.trim());

// --- Static bits -----------------------------------------------------------
emit('site.js', readFileSync(join(here, 'dc/site.js'), 'utf8'));
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
for (const f of readdirSync(join(root, 'static'))) {
  emit(f, readFileSync(join(root, 'static', f)));
}

const urls = [
  { loc: '/', pri: '1.0' }, { loc: '/blog/', pri: '0.9' }, { loc: '/support/', pri: '0.7' },
  { loc: '/privacy/', pri: '0.4' }, { loc: '/terms/', pri: '0.4' },
  { loc: '/disclaimer/', pri: '0.3' }, { loc: '/delete-account/', pri: '0.5' },
  ...urlsExtra,
  ...posts.map((p) => ({ loc: p.path, pri: '0.7', lastmod: p.iso })),
];
emit('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${ORIGIN}${u.loc}</loc>` +
    (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
    `<priority>${u.pri}</priority></url>`).join('\n') + `\n</urlset>\n`);
emit('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

{
  const r = renderDC(design, 'Disclaimer.dc.html');
  emit('404.html', shell({
    title: 'Page not found',
    description: 'That page does not exist.',
    path: '/404.html', helmet: r.helmet,
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
console.log(`  ${written.length} files -> dist/`);
console.log(`  home, blog, ${posts.length} posts, ${PAGES.length} standing pages, 404, sitemap, robots`);

const dirty = new Map();
for (const rel of written.filter((r) => r.endsWith('.html'))) {
  const b = readFileSync(join(out, rel), 'utf8').toLowerCase();
  for (const fp of FOOTPRINTS) if (b.includes(fp.toLowerCase())) dirty.set(fp, (dirty.get(fp) || 0) + 1);
}
if (dirty.size) {
  console.error('\n❌ WordPress footprints in the output:');
  for (const [fp, n] of dirty) console.error(`     ${fp} — ${n} file(s)`);
  process.exit(1);
}
console.log('  ✅ no WordPress, Elementor or Tag Manager footprint');

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
