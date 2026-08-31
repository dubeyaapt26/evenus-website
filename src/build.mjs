// ---------------------------------------------------------------------------
// Builds the whole of evenus.app as static files.
//
//   node scripts/build-site.mjs        (or: npm run site)
//
// Output lands in public/ — drop it on any static host. No framework, no build
// step, no database, one webfont request and nothing else. The old site was
// WordPress with Elementor; this replaces it outright and imports only the
// prose, never the markup. See scripts/site/wordpress.mjs for how, and the
// footprint assertion at the bottom of this file for the proof.
//
// ⚠️ THE FOUR LEGAL PAGES ARE THE POINT. Both stores gate submission on them,
// and Play additionally requires the account-deletion page to load FOR SOMEONE
// WITH NO ACCOUNT. Everything else here is a website; those four are a
// dependency of shipping.
//
// Blog source: ../evenus-site-recovered/pages/blog/*.html, pulled out of the
// Internet Archive after the original host was deleted. If that folder is
// absent the site still builds — minus the blog — so a fresh clone works.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, mark, esc, SITE, PALETTE, BASE, href } from './site/layout.mjs';
import { render } from './site/markdown.mjs';
import { extractPost, FOOTPRINTS } from './site/wordpress.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, 'dist');
const legalDir = join(here, 'legal');
const blogSrc = join(here, 'recovered/blog');

const written = [];

function write(path, html) {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, withBase(html));
  written.push(path);
}

/**
 * Adds the base path to every root-relative link, at the LAST possible moment.
 *
 * ⚠️ Prefixing only where links are authored is not enough, and that is the
 * whole reason this exists. Links also arrive from two places no template
 * controls: markdown documents in src/legal, and the recovered blog posts,
 * whose internal cross-references were rewritten to /blog/<slug>/ on the way
 * in. Four such links were already missing the prefix — every one of them a
 * 404 that appears only after deploying to a project site.
 *
 * Idempotent: a link that already carries the base is left alone, so this is
 * safe to apply to output that was partly prefixed upstream.
 */
function withBase(html) {
  if (!BASE) return html;
  return html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (m, attr, url) =>
      url === BASE || url.startsWith(`${BASE}/`) ? m : `${attr}="${BASE}${url}"`
  );
}

/** Clean URLs: /privacy/ is served from privacy/index.html by every static host. */
const pageAt = (urlPath, html) =>
  write(urlPath === '/' ? 'index.html' : `${urlPath.replace(/^\/|\/$/g, '')}/index.html`, html);

// ---------------------------------------------------------------------------
// Homepage
//
// ⚠️ THE OLD HEADLINE IS NOT COMING BACK. It read "No More Money Fights. Just
// Fairness & Love." CLAUDE.md §1 is explicit that this product does not claim
// to prevent fights, save relationships or fix conflict — for a couple already
// in real trouble, hard data confirming an imbalance can accelerate an ending.
// The honest claim is the one below.
//
// It also does not say "download on the App Store". It is not on either store
// yet, and the old site said it was.
// ---------------------------------------------------------------------------
function homepage() {
  const body = `
<div class="wrap">
  <section class="hero">
    <div class="eyebrow">For two people who live together</div>
    <h1>The fight isn’t really about the dishes.</h1>
    <p class="lede">EvenUS works out how money, time and the planning nobody
    sees are actually shared in your home — then suggests <strong>one thing</strong>
    to swap this week.</p>
  </section>

  <div class="note">
    <p><strong>Built for the partner who wants to help and doesn’t know what
    “help” means.</strong></p>
    <p>Asking <em>“what can I do?”</em> hands the planning straight back to
    whoever is already carrying it. Answering that question — specifically,
    with a reason — is the whole product. The measuring exists so there is
    something real to answer with.</p>
  </div>

  <h2>How it works</h2>
  <div class="cards">
    <div class="card">
      <h3>It measures discretionary time</h3>
      <p>Not who did more chores. Hours that are genuinely your own, once sleep,
      paid work, commuting and the housework are out. That is why it handles
      “works more but earns less” without a special case.</p>
    </div>
    <div class="card">
      <h3>Money is a separate question</h3>
      <p>Four ways to split — proportional, residual, equal remainder, equal.
      Hours are never priced. Putting an hourly rate on domestic work is a claim
      this app has no business making.</p>
    </div>
    <div class="card">
      <h3>One suggestion a week</h3>
      <p>With the reason attached: <em>you have a free Saturday morning, so
      taking this one would help more than you’d think.</em> Not a list. Not a
      backlog. One.</p>
    </div>
    <div class="card">
      <h3>Both of you answer privately</h3>
      <p>Two quick questions each week, and neither of you sees the other’s
      answers. Where you see things differently, EvenUS shows the gap — without
      taking a side on who is right.</p>
    </div>
  </div>

  <h2>What it will never do</h2>
  <p>Some of these get asked for. They are refusals, not gaps:</p>
  <ul>
    <li><strong>No streaks, badges, points or leaderboards.</strong> A streak
    punishes whoever had a hard week.</li>
    <li><strong>No nudge button.</strong> Reminding your partner is not this
    app’s job. A reminder belongs to a task, and goes only to whoever owns it —
    never labelled with who set it.</li>
    <li><strong>No notification about what your partner didn’t do.</strong>
    That notification does not exist here.</li>
    <li><strong>No public score, ever.</strong> Nothing is shareable, and there
    is no feed.</li>
    <li><strong>No reading your location, calendar or screen time.</strong>
    Surveillance between partners is the opposite of the point.</li>
  </ul>
  <p>And if the picture stays bad for a couple of months, EvenUS stops
  suggesting things, says so once, points toward someone qualified, and goes
  quiet. A tool that keeps chirping at that stage has become a weapon.</p>

  <div class="note">
    <p><strong>EvenUS is in closed testing and is not on the app stores yet.</strong>
    It is free while that lasts. If you would like to try it with your partner,
    email <a href="${href('/support/')}">us</a> and we will send you a link.</p>
  </div>

  <h2>Reading</h2>
  <p>Writing on mental load, splitting money fairly and dividing housework
  without it turning into an argument — <a href="${href('/blog/')}">the blog</a>.</p>
</div>`;
  pageAt('/', layout({
    title: SITE.name,
    description:
      'EvenUS measures how money, time and mental load are actually shared between two people — and suggests one thing to swap each week.',
    path: '/',
    body,
  }));
}

// ---------------------------------------------------------------------------
// Legal and support
// ---------------------------------------------------------------------------
const DOCS = [
  { file: 'PRIVACY.md', path: '/privacy/', title: 'Privacy Policy',
    description: 'What EvenUS stores, what it never sees, and how to get rid of all of it.' },
  { file: 'TERMS.md', path: '/terms/', title: 'Terms of Use',
    description: 'The agreement between you and EvenUS.' },
  { file: 'SUPPORT.md', path: '/support/', title: 'Help',
    description: 'Answers to the questions a two-person app actually generates, and how to reach a human.' },
  { file: 'DELETE_ACCOUNT.md', path: '/delete-account/', title: 'Delete your account',
    description: 'How to delete your EvenUS account and your data. No partner approval needed.' },
  { file: 'DISCLAIMER.md', path: '/disclaimer/', title: 'Disclaimer',
    description: 'EvenUS is not financial advice and not therapy. What that means in practice.' },
];

function legal() {
  for (const d of DOCS) {
    const md = readFileSync(join(legalDir, d.file), 'utf8');
    pageAt(d.path, layout({
      title: d.title,
      description: d.description,
      path: d.path,
      body: `<div class="wrap article-body" style="padding-top:52px">${render(md)}</div>`,
    }));
  }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------
function blog() {
  if (!existsSync(blogSrc)) {
    console.log('  (no recovered blog source — skipping the blog)');
    return [];
  }

  const posts = [];
  for (const f of readdirSync(blogSrc).filter((n) => n.endsWith('.html'))) {
    const post = extractPost(readFileSync(join(blogSrc, f), 'utf8'));
    if (!post || post.words < 200) {
      console.log(`  ⚠️  skipped ${f} (${post ? post.words + ' words' : 'no body found'})`);
      continue;
    }
    posts.push({ ...post, slug: f.replace(/\.html$/, '') });
  }

  // Newest first; undated posts sort last rather than to 1970.
  posts.sort((a, b) => (b.iso || '0000').localeCompare(a.iso || '0000'));

  for (const p of posts) {
    const path = `/blog/${p.slug}/`;
    pageAt(path, layout({
      title: p.title,
      description: p.excerpt,
      path,
      published: p.iso || undefined,
      body: `<div class="wrap" style="padding-top:52px">
  <h1>${esc(p.title)}</h1>
  <p class="meta">${p.date ? esc(p.date) + ' · ' : ''}${p.words.toLocaleString()} words</p>
  <div class="article-body">${p.html}</div>
  <hr>
  <p><a href="${href('/blog/')}">← All writing</a></p>
</div>`,
    }));
  }

  const items = posts.map((p) => `<li>
      <a href="${href(`/blog/${p.slug}/`)}">${esc(p.title)}</a>
      <p>${esc(p.excerpt)}</p>
    </li>`).join('\n');

  pageAt('/blog/', layout({
    title: 'Blog',
    description: 'Writing on mental load, fair money splits and dividing housework without an argument.',
    path: '/blog/',
    body: `<div class="wrap" style="padding-top:52px">
  <h1>Writing</h1>
  <p class="meta">${posts.length} pieces on mental load, money and how households actually run.</p>
  <ul class="post-list">
${items}
  </ul>
</div>`,
  }));

  return posts;
}

// ---------------------------------------------------------------------------
// The pieces a live site needs and nobody remembers
// ---------------------------------------------------------------------------
function extras(posts) {
  pageAt('/404/', layout({
    title: 'Page not found',
    description: 'That page does not exist.',
    path: '/404/',
    noindex: true,
    body: `<div class="wrap" style="padding-top:72px">
  <h1>That page isn’t here.</h1>
  <p>It may have moved when the site was rebuilt. Try
  <a href="${href('/blog/')}">the writing</a> or <a href="${href('/')}">the homepage</a>.</p>
</div>`,
  }));
  // Most hosts want 404.html at the root, not in a folder. Move it, and take
  // the folder's path back out of `written` — the checks at the bottom read
  // every file in that list, and a stale entry crashes the build after it has
  // already reported success.
  writeFileSync(join(out, '404.html'), readFileSync(join(out, '404/index.html')));
  rmSync(join(out, '404'), { recursive: true, force: true });
  written.splice(written.indexOf('404/index.html'), 1);
  written.push('404.html');

  const urls = [
    { loc: '/', pri: '1.0' },
    { loc: '/blog/', pri: '0.8' },
    { loc: '/support/', pri: '0.6' },
    { loc: '/privacy/', pri: '0.4' },
    { loc: '/terms/', pri: '0.4' },
    { loc: '/disclaimer/', pri: '0.3' },
    { loc: '/delete-account/', pri: '0.4' },
    ...posts.map((p) => ({ loc: `/blog/${p.slug}/`, pri: '0.7', lastmod: p.iso })),
  ];
  write('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) =>
      `  <url><loc>${SITE.origin}${u.loc}</loc>` +
      (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
      `<priority>${u.pri}</priority></url>`).join('\n') +
    `\n</urlset>\n`);

  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml\n`);

  // GitHub Pages runs Jekyll unless told not to, and Jekyll silently drops
  // every file and folder whose name starts with an underscore.
  write('.nojekyll', '');

  write('favicon.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="12" fill="${PALETTE.bg}"/>` +
    mark(64).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') +
    `</svg>\n`);

  // .app is on the browser HSTS preload list, so http:// never even reaches the
  // server. These headers are for hosts that read them (Netlify, Cloudflare
  // Pages); harmless anywhere else.
  write('_headers',
    `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n` +
    `  X-Frame-Options: DENY\n  Permissions-Policy: geolocation=(), camera=(), microphone=()\n` +
    `  Strict-Transport-Security: max-age=31536000; includeSubDomains\n`);
}

// ---------------------------------------------------------------------------

console.log('\nBuilding evenus.app\n');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

homepage();
legal();
const posts = blog();
extras(posts);

console.log(`  ${written.length} files written to dist/`);
console.log(`  homepage, ${DOCS.length} standing pages, ${posts.length} blog posts, sitemap, robots, 404`);

// --- The two things that must be true before this goes live ----------------

// 1. Not one trace of the old stack.
const dirty = new Map();
for (const rel of written) {
  if (!rel.endsWith('.html') && !rel.endsWith('.xml')) continue;
  const body = readFileSync(join(out, rel), 'utf8').toLowerCase();
  for (const fp of FOOTPRINTS) {
    if (body.includes(fp.toLowerCase())) dirty.set(fp, (dirty.get(fp) || 0) + 1);
  }
}
if (dirty.size) {
  console.error('\n❌ WordPress footprints in the output:');
  for (const [fp, n] of dirty) console.error(`     ${fp} — ${n} file(s)`);
  process.exit(1);
}
console.log('  ✅ no WordPress, Elementor or Tag Manager footprint anywhere');

// 2. No placeholder shipped to a store reviewer.
const tokens = new Set();
for (const rel of written.filter((r) => r.endsWith('.html'))) {
  for (const m of readFileSync(join(out, rel), 'utf8').matchAll(/\[([A-Z][A-Z ]+)\]/g)) {
    tokens.add(m[1]);
  }
}
console.log('');
if (tokens.size) {
  console.log('⚠️  Placeholders still to replace before this goes live:');
  for (const t of [...tokens].sort()) console.log(`     [${t}]`);
  console.log('\n   Edit docs/legal/*.md, then re-run. Never hand-edit public/.\n');
} else {
  console.log('✅ No placeholders left.\n');
}
