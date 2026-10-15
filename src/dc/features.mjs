// ---------------------------------------------------------------------------
// The Features section: data loading and the checks every feature page must
// pass before the build will ship it.
//
//   src/features/catalog.json          the app's own feature catalog, English
//                                      (copied by src/features/sync-catalog.mjs)
//   src/features/content/<id>.json     the page for one feature, hand-written
//   src/features/screenshots.json      every screenshot the pages ask for
//
// ⚠️ THE CATALOG IS THE TRUTH, THE CONTENT IS THE EXPLANATION. Steps on the
// site must name the same buttons the app has, so the catalog's own steps are
// the reference the writing is checked against by a person, and its ids are
// the URLs. A feature in the catalog with no page fails the build, and so does
// a page for a feature the catalog no longer has.
// ---------------------------------------------------------------------------

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STRUCTURAL } from './checks.mjs';

export const FEATURES_DIR = (root) => join(root, 'src/features');

export function loadCatalog(root) {
  return JSON.parse(readFileSync(join(FEATURES_DIR(root), 'catalog.json'), 'utf8'));
}

export function loadContent(root, id) {
  const f = join(FEATURES_DIR(root), 'content', `${id}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, 'utf8'));
}

/**
 * Where each feature lives in the app: a short path of the app's own labels,
 * such as "Money → Plan → Budgets". Shown on every card and near the top of
 * every feature page, so a reader always knows where to tap.
 */
export function loadWhere(root) {
  const f = join(FEATURES_DIR(root), 'where.json');
  const all = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  delete all._about;
  return all;
}

export function loadScreenshots(root) {
  const f = join(FEATURES_DIR(root), 'screenshots.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { shots: [] };
}

const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ');
export const countWords = (h) => strip(h).split(/\s+/).filter((w) => /[A-Za-z0-9₹$€£]/.test(w)).length;

/** Every piece of prose a content file contributes to its page. */
export function proseOf(c) {
  const parts = [c.answer];
  for (const k of ['what', 'who', 'partner', 'country']) if (c[k]) parts.push(c[k].h2, c[k].html);
  if (c.steps) parts.push(c.steps.h2, c.steps.intro, ...c.steps.items.map((s) => `${s.name} ${s.text}`), c.steps.after || '');
  if (c.tips) parts.push(c.tips.h2, ...(c.tips.items || []));
  for (const x of c.extra || []) parts.push(x.h2, x.html);
  for (const f of c.faqs || []) parts.push(f.q, f.a);
  return parts.filter(Boolean).join(' ');
}

// Words that turn a description of a household into a verdict on a person.
// Mirrors the app's assertSafeCopy() list (CLAUDE.md §8), plus the claims the
// app must never make (§1).
const TONE = [
  /\bowes?\b/i, /\bowing\b/i, /\bpoor\b/i, /\bfailing\b/i, /\bunder-?contribut/i,
  /\bshould have\b/i, /\bfall(?:s|ing)? behind\b/i, /\blazy\b/i, /\bslacker/i,
  /\bdivorce\b/i, /\bsaves? (?:your|a) (?:relationship|marriage)\b/i,
  /\bfix(?:es)? (?:your )?conflict\b/i,
];

/**
 * @returns {{errors: string[], warnings: string[], words: number}}
 */
export function validateContent(c, { catalog, postSlugs }) {
  const errors = [], warnings = [];
  const ids = new Set(catalog.features.map((f) => f.id));
  const need = (cond, msg) => { if (!cond) errors.push(msg); };

  need(c && typeof c === 'object', 'not an object');
  if (!c) return { errors, warnings, words: 0 };
  need(ids.has(c.id), `unknown feature id "${c.id}"`);
  need(typeof c.h1 === 'string' && c.h1.length >= 10 && c.h1.length <= 90, 'h1: 10 to 90 characters');
  need(typeof c.seoTitle === 'string' && c.seoTitle.length <= 60, `seoTitle: at most 60 characters (has ${c.seoTitle?.length})`);
  need(typeof c.description === 'string' && c.description.length >= 110 && c.description.length <= 155,
    `description: 110 to 155 characters (has ${c.description?.length})`);
  need(/^\d{4}-\d{2}-\d{2}$/.test(c.updated || ''), 'updated: YYYY-MM-DD');
  need(typeof c.answer === 'string' && countWords(c.answer) >= 30 && countWords(c.answer) <= 80,
    `answer: 30 to 80 words (has ${countWords(c.answer)})`);
  for (const k of ['what', 'who', 'partner']) {
    need(c[k] && c[k].h2 && c[k].html, `${k}: needs h2 and html`);
    if (c[k]?.h2) need(/\?$/.test(c[k].h2.trim()), `${k}.h2 should be a question`);
  }
  need(c.steps && Array.isArray(c.steps.items) && c.steps.items.length >= 3 && c.steps.items.length <= 7,
    'steps.items: 3 to 7 steps');
  for (const [i, s] of (c.steps?.items || []).entries()) {
    need(s.name && s.text, `steps.items[${i}]: needs name and text`);
  }
  need(c.tips && Array.isArray(c.tips.items) && c.tips.items.length >= 3, 'tips.items: at least 3');
  need(Array.isArray(c.faqs) && c.faqs.length >= 4 && c.faqs.length <= 6, 'faqs: 4 to 6');
  for (const [i, f] of (c.faqs || []).entries()) {
    need(f.q && /\?$/.test(f.q.trim()), `faqs[${i}].q must end with ?`);
    need(f.a && countWords(f.a) >= 20, `faqs[${i}].a: at least 20 words`);
  }
  need(Array.isArray(c.relatedPosts) && c.relatedPosts.length >= 2 && c.relatedPosts.length <= 4, 'relatedPosts: 2 to 4');
  for (const s of c.relatedPosts || []) need(postSlugs.has(s), `relatedPosts: no post "${s}"`);

  const text = proseOf(c) + ' ' + c.h1 + ' ' + c.seoTitle + ' ' + c.description;
  if (/—/.test(text)) errors.push('em dash (—) found: the build refuses them');
  if (/\[[A-Z][A-Z ]+\]/.test(text)) errors.push('placeholder-looking [CAPS] text');
  if (/apps\.apple\.com|play\.google\.com/.test(text)) errors.push('links to a store page: the app is not on the stores yet');
  for (const re of TONE) if (re.test(strip(text))) errors.push(`tone: "${strip(text).match(re)[0]}" (CLAUDE.md §8)`);
  for (const [re, name] of STRUCTURAL) { re.lastIndex = 0; if (re.test(strip(text))) errors.push(`generated-prose tell: ${name}`); }

  for (const [, href] of text.matchAll(/href="([^"]*)"/g)) {
    let m;
    if ((m = /^\/features\/([a-z0-9-]+)\/$/.exec(href))) { if (!ids.has(m[1])) errors.push(`link to unknown feature ${href}`); }
    else if ((m = /^\/blog\/([a-z0-9-]+)\/$/.exec(href))) { if (!postSlugs.has(m[1])) errors.push(`link to unknown post ${href}`); }
    else if (!/^\/(features|calculator|about|support|privacy|terms|disclaimer|delete-account|blog)\/$|^\/$|^mailto:support@evenus\.app$/.test(href)) {
      errors.push(`unexpected link ${href}`);
    }
  }

  const words = countWords(proseOf(c));
  if (words < 880) warnings.push(`prose is ${words} words; aim for 900 to 1,000`);
  if (words > 1050) warnings.push(`prose is ${words} words; aim for 900 to 1,000`);
  return { errors, warnings, words };
}

export function postSlugsOf(root) {
  return new Set(readdirSync(join(root, 'src/posts')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')));
}
