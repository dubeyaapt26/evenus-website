// ---------------------------------------------------------------------------
// Pulls the prose out of the recovered WordPress pages and throws away
// everything else.
//
// The old evenus.app was WordPress with Elementor. A single 76 KB blog post
// carried 33 script tags, Google Tag Manager, a stylesheet per widget, four
// "related post" articles, a nav menu and a footer — around 3 KB of actual
// writing wrapped in 73 KB of theme.
//
// ⚠️ THIS IS AN ALLOW-LIST, NOT A STRIP-LIST. Removing the tags you happen to
// have noticed leaves the ones you did not; the WordPress footprint is exactly
// the thing that survives that approach. So: parse out the post body, then keep
// only tags on ALLOWED and only href on links. Everything else — every class,
// id, style, data-* attribute, every wrapper div — is discarded because it was
// never allowed through, not because a rule caught it.
// ---------------------------------------------------------------------------

/** Semantic tags a blog post legitimately needs. Nothing else survives. */
const ALLOWED = new Set([
  'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
  'blockquote', 'a', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

/** Tags whose CONTENT goes too, not just their markup. */
const NUKE = ['script', 'style', 'noscript', 'svg', 'iframe', 'form', 'nav', 'header', 'footer'];

const MARKER = 'elementor-widget-theme-post-content';

/**
 * Returns the inner HTML of the <div> whose opening tag CONTAINS `from`.
 *
 * ⚠️ Search BACKWARDS. `from` is the index of a class name, which sits inside
 * an already-open <div ...> tag — so scanning forward finds the next div
 * *inside* the body and returns a fragment of it. That silently produced the
 * "Related Posts" block instead of the article, with a plausible-looking 55
 * words, which is exactly the kind of wrong that survives a quick look.
 *
 * Regex cannot match balanced tags and the body is nested divs, so count them.
 */
function balancedDiv(html, from) {
  const open = html.lastIndexOf('<div', from);
  if (open === -1) return null;
  let i = html.indexOf('>', open);
  if (i === -1) return null;
  const start = i + 1;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return null;
}

/** Decodes the handful of entities that matter, leaving the rest escaped. */
function decode(s) {
  return s
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Rewrites a link that pointed at the old site.
 * Absolute links to evenus.app become relative, and the WordPress
 * /blog/slug/ shape is already the shape the new site uses.
 */
function rewriteHref(href) {
  let h = decode(href).trim();
  h = h.replace(/^https?:\/\/(www\.)?evenus\.app/i, '');
  if (h === '' || h === '/home/' || h === '/home') return '/';
  // Old WordPress taxonomy pages are not rebuilt; send them to the index.
  if (/^\/(category|tag|author|uncategorized)\b/i.test(h)) return '/blog/';
  if (/^\/privacy-policy-for-evenus/i.test(h)) return '/privacy/';
  if (/^\/terms-and-conditions-for-evenus/i.test(h)) return '/terms/';
  if (/^\/disclaimer-for-evenus/i.test(h)) return '/disclaimer/';
  // Anything with a WordPress query string is a theme artefact.
  if (/^\/\?/.test(h)) return '/';
  if (/^\/wp-/i.test(h)) return null;
  return h;
}

/** Strips every tag not on the allow-list and every attribute except href. */
function sanitize(html) {
  let s = html;

  for (const tag of NUKE) {
    s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'), '');
    s = s.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '');
  }
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Images all pointed at wp-content, which no longer exists. A broken image
  // is worse than no image, and the Archive never captured the files.
  s = s.replace(/<img\b[^>]*>/gi, '');
  s = s.replace(/<(figure|figcaption|picture|source)\b[^>]*>|<\/(figure|figcaption|picture|source)>/gi, '');

  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_m, close, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return '';
    if (close) return `</${tag}>`;
    if (tag === 'a') {
      const href = /href\s*=\s*"([^"]*)"/i.exec(attrs) || /href\s*=\s*'([^']*)'/i.exec(attrs);
      const to = href ? rewriteHref(href[1]) : null;
      if (!to) return '';
      const ext = /^https?:\/\//i.test(to);
      return `<a href="${to}"${ext ? ' rel="noopener nofollow" target="_blank"' : ''}>`;
    }
    return `<${tag}>`;
  });

  // An <a> whose opening tag was dropped leaves an orphan closer.
  s = s.replace(/<\/a>/g, (m, i, str) => (str.slice(0, i).match(/<a /g) || []).length >
    (str.slice(0, i).match(/<\/a>/g) || []).length ? m : '');

  // WordPress appended a "Related Posts" list inside the body. The new
  // template builds its own navigation, and a hardcoded list of four posts
  // that ages badly is not worth carrying over.
  s = s.replace(/<h[234]>\s*Related\s+Posts?\s*<\/h[234]>[\s\S]*$/i, '');

  // Typographic entities WordPress emitted numerically. Deliberately does NOT
  // touch &lt; or &gt; — decoding those would put tags back into text that has
  // already been through the allow-list.
  s = s
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8220;|&ldquo;/g, '\u201C')
    .replace(/&#8221;|&rdquo;/g, '\u201D')
    .replace(/&#8211;|&ndash;/g, '\u2013')
    .replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&#8230;|&hellip;/g, '\u2026')
    .replace(/&#038;/g, '&amp;')
    .replace(/&nbsp;/g, ' ');

  // Tidy what the stripping left: empty blocks and runs of whitespace.
  s = s.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  s = s.replace(/<(li|h2|h3|h4|blockquote)>\s*<\/\1>/gi, '');
  s = s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Plain text of an HTML fragment, for excerpts and word counts. */
export function toText(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * @returns {{title:string, date:string|null, iso:string|null, html:string,
 *            excerpt:string, words:number}|null}
 */
export function extractPost(raw) {
  const at = raw.indexOf(MARKER);
  if (at === -1) return null;
  const inner = balancedDiv(raw, at);
  if (!inner) return null;

  const t = /<title>([\s\S]*?)<\/title>/i.exec(raw);
  let title = t ? decode(t[1]).trim() : '';
  title = title.replace(/\s*[-–|]\s*evenus\.app\s*$/i, '').trim();

  // WordPress renders the date as a <time> element, e.g. "March 19, 2026".
  let date = null;
  let iso = null;
  for (const m of raw.matchAll(/<time[^>]*>([\s\S]*?)<\/time>/gi)) {
    const txt = decode(m[1].replace(/<[^>]+>/g, '')).trim();
    const parsed = Date.parse(txt);
    if (!Number.isNaN(parsed) && /\d{4}/.test(txt)) {
      date = txt;
      // ⚠️ Local components, not toISOString(). "March 19, 2026" parses as
      // local midnight, and converting that to UTC moves it to the 18th
      // anywhere east of Greenwich — this repo is written from IST.
      const d = new Date(parsed);
      iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      break;
    }
  }

  const html = sanitize(inner);
  const text = toText(html);
  const excerpt = text.slice(0, 175).replace(/\s+\S*$/, '') + (text.length > 175 ? '…' : '');

  return { title, date, iso, html, excerpt, words: text.split(/\s+/).filter(Boolean).length };
}

/** Everything that must NEVER appear in generated output. */
export const FOOTPRINTS = [
  'wp-content', 'wp-includes', 'wp-json', 'wp-block', 'wp-singular',
  'elementor', 'googletagmanager', 'gtag(', 'wordpress',
  'data-elementor', 'screen-reader-text', 'menu-item-type',
];
