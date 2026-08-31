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

function shell({ title, description, path, helmet, body, published }) {
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
<meta name="twitter:card" content="summary">
<link rel="icon" href="${url('/favicon.svg')}" type="image/svg+xml">
${helmet}
${A11Y}
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
const posts = [];
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
    description: 'EvenUS measures how money, time and mental load are actually shared between two people — and suggests one thing to swap each week.',
    path: '/', helmet: r.helmet, body,
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
    description: 'Writing on mental load, money and how households actually run.',
    path: '/blog/', helmet: r.helmet, body,
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
  pageAt(path, shell({ title, description, path, helmet: r.helmet, body: routes(stripPrototypeHandlers(r.body)) }));
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

  for (const p of posts) {
    const body = `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${routes(stripPrototypeHandlers(header))}
  <article>
    <section style="max-width:1180px;margin:0 auto;padding:clamp(48px,7vw,88px) 28px clamp(24px,3vw,36px)">
      <div style="max-width:820px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">
          <span style="font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2E6A5C;background:#E7F2EE;border:1px solid #CFE6DE;padding:5px 10px;border-radius:99px">${esc(p.cat)}</span>
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

  <div style="max-width:1180px;margin:0 auto;padding:clamp(40px,5vw,64px) 28px 0">
    <a href="${url('/blog/')}" style="font-size:14.5px;font-weight:600;color:#2E6A5C">← All writing</a>
  </div>
${routes(stripPrototypeHandlers(footer))}
</div>`;

    pageAt(p.path, shell({
      title: p.title, description: p.excerpt, path: p.path,
      helmet: chrome.helmet, body, published: p.iso || undefined,
    }));
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

const urls = [
  { loc: '/', pri: '1.0' }, { loc: '/blog/', pri: '0.9' }, { loc: '/support/', pri: '0.7' },
  { loc: '/privacy/', pri: '0.4' }, { loc: '/terms/', pri: '0.4' },
  { loc: '/disclaimer/', pri: '0.3' }, { loc: '/delete-account/', pri: '0.5' },
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
    const t = readFileSync(join(out, rel), 'utf8').replace(/<[^>]+>/g, ' ');
    em += (t.match(/\u2014/g) || []).length;
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
