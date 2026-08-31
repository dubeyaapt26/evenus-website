// ---------------------------------------------------------------------------
// The shell every page on evenus.app is poured into.
//
// Hand-written HTML and CSS, no framework, no build step, no external request
// except the one webfont. That is a deliberate constraint rather than
// minimalism for its own sake: the pages that matter most here are the privacy
// policy and the account-deletion page, both stores check that they load, and
// a page that needs a bundler to render is a page that can fail to render.
//
// ⚠️ NOTHING FROM WORDPRESS SURVIVES HERE. The old site was WordPress with
// Elementor — 33 script tags, Google Tag Manager, and a stylesheet per widget.
// The recovered pages are used ONLY as a source of prose; every wrapper, class
// and script is dropped on the way in. scripts/build-site.mjs asserts this.
// ---------------------------------------------------------------------------

/**
 * Prefix for every internal link.
 *
 * ⚠️ A GitHub project site is served from /<repo>/, not from /. Absolute links
 * like "/privacy/" therefore 404 there while working perfectly on a custom
 * domain — which is exactly the kind of breakage that only shows up after
 * deploying. Set BASE_PATH at build time and the same source serves both.
 *
 *   BASE_PATH=/evenus-website npm run build   -> dubeyaapt26.github.io/evenus-website/
 *   npm run build                             -> evenus.app/
 */
export const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');

/** Internal href helper. Leaves external and anchor links alone. */
export const href = (p) => (p.startsWith('/') ? BASE + p : p);

export const SITE = {
  origin: 'https://evenus.app',
  name: 'EvenUS',
  tagline: 'A fairer share of everything.',
};

export const PALETTE = {
  bg: '#F7F5EF',
  card: '#FFFFFF',
  ink: '#1F2421',
  muted: '#6B7169',
  faint: '#9BA098',
  border: '#E8E4DA',
  sage: '#3E9B86',
  sageLight: '#5FBBA6',
  peach: '#EE8B6D',
};

/** The brand mark. Same geometry as src/components/Mark.tsx and the icons. */
export function mark(size = 22) {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke-width="7" stroke-linecap="round">` +
    `<path d="M19 56 C19 47 28 45 28 34 L28 9" stroke="${PALETTE.sageLight}"/>` +
    `<path d="M45 56 C45 47 36 45 36 34 L36 9" stroke="${PALETTE.peach}"/>` +
    `</g></svg>`
  );
}

const CSS = `
:root{color-scheme:light;--bg:${PALETTE.bg};--card:${PALETTE.card};--ink:${PALETTE.ink};
--muted:${PALETTE.muted};--faint:${PALETTE.faint};--border:${PALETTE.border};
--sage:${PALETTE.sage};--peach:${PALETTE.peach}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);
font:17px/1.65 "Source Sans 3",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
.wide{max-width:1040px}
a{color:var(--sage);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;height:auto}
h1,h2,h3,h4{line-height:1.15;letter-spacing:-0.015em;margin:0 0 12px}
h1{font-size:clamp(30px,5vw,44px)}
h2{font-size:clamp(23px,3.2vw,28px);margin-top:44px}
h3{font-size:20px;margin-top:32px}
p{margin:0 0 16px}
ul,ol{margin:0 0 18px;padding-left:22px}
li{margin-bottom:7px}
hr{border:0;border-top:1px solid var(--border);margin:36px 0}
blockquote{margin:0 0 18px;padding:14px 18px;background:var(--card);
border:1px solid var(--border);border-left:3px solid var(--sage);border-radius:8px;color:var(--muted)}
blockquote p:last-child{margin-bottom:0}
code{background:var(--card);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:.9em}
table{width:100%;border-collapse:collapse;margin:0 0 22px;display:block;overflow-x:auto}
td,th{border-bottom:1px solid var(--border);padding:10px 14px 10px 0;text-align:left;vertical-align:top;font-size:16px}
th,tr:first-child td{font-weight:600}

/* header */
.site-head{border-bottom:1px solid var(--border);background:rgba(247,245,239,.92);
backdrop-filter:saturate(160%) blur(8px);position:sticky;top:0;z-index:10}
.site-head .row{display:flex;align-items:center;gap:16px;height:64px}
.brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-weight:600;font-size:17px;letter-spacing:-.01em}
.brand:hover{text-decoration:none}
.brand i{font-style:normal;color:var(--sage)}
.site-head nav{margin-left:auto;display:flex;gap:22px;font-size:16px}
.site-head nav a{color:var(--muted)}
.site-head nav a[aria-current]{color:var(--ink);font-weight:600}

/* hero */
.hero{padding:76px 0 8px;text-align:center}
.hero .eyebrow{font-size:13px;letter-spacing:.13em;text-transform:uppercase;color:var(--faint);
font-weight:600;margin-bottom:18px}
.hero p.lede{font-size:20px;color:var(--muted);max-width:620px;margin:0 auto 28px}

.cards{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));margin:32px 0}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:22px}
.card h3{margin:0 0 8px;font-size:18px}
.card p{margin:0;color:var(--muted);font-size:16px}

.note{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:22px;margin:32px 0}
.note p:last-child{margin-bottom:0}

/* blog */
.post-list{list-style:none;margin:0;padding:0}
.post-list li{border-bottom:1px solid var(--border);padding:20px 0;margin:0}
.post-list a{color:var(--ink);font-weight:600;font-size:19px;display:block;margin-bottom:5px;letter-spacing:-.01em}
.post-list p{color:var(--muted);font-size:16px;margin:0}
.meta{color:var(--faint);font-size:14px;margin:0 0 26px}
.article-body h2{font-size:24px}
.article-body h3{font-size:19px}

/* footer */
.site-foot{margin-top:80px;border-top:1px solid var(--border);padding:34px 0 60px;
color:var(--faint);font-size:15px}
.site-foot a{color:var(--muted)}
.site-foot .cols{display:flex;flex-wrap:wrap;gap:14px 26px;margin-bottom:18px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:12px;top:12px;background:var(--card);padding:10px 14px;border-radius:8px;z-index:20}
@media (max-width:560px){.site-head nav{gap:14px;font-size:15px}.hero{padding:48px 0 4px}}
`;

const NAV = [
  ['/', 'Home'],
  ['/blog/', 'Blog'],
  ['/support/', 'Help'],
];

/**
 * @param {{title:string, description:string, path:string, body:string,
 *          published?:string, noindex?:boolean}} opts
 */
export function layout({ title, description, path, body, published, noindex }) {
  const canonical = SITE.origin + path;
  const full = path === '/' ? `${SITE.name} — ${SITE.tagline}` : `${title} · ${SITE.name}`;
  const nav = NAV.map(
    ([to, label]) =>
      `<a href="${href(to)}"${to === path ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="${published ? 'article' : 'website'}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="${PALETTE.bg}">
<link rel="icon" href="${BASE}/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap wide row">
    <a class="brand" href="${href('/')}">${mark(22)}<span>Even<i>US</i></span></a>
    <nav>${nav}</nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap wide">
    <div class="cols">
      <a href="${href('/')}">Home</a><a href="${href('/blog/')}">Blog</a><a href="${href('/support/')}">Help</a>
      <a href="${href('/privacy/')}">Privacy</a><a href="${href('/terms/')}">Terms</a>
      <a href="${href('/disclaimer/')}">Disclaimer</a><a href="${href('/delete-account/')}">Delete your account</a>
    </div>
    <p>© ${new Date().getUTCFullYear()} ${SITE.name}. ${esc(SITE.tagline)}</p>
  </div>
</footer>
</body>
</html>
`;
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
