// ---------------------------------------------------------------------------
// The blog's metadata: category, title, excerpt and read time per post.
//
// The design ships 32 curated entries as a placeholder dataset, and the handoff
// says to drive the real list from content while keeping the taxonomy and the
// read-time field. Those 32 carry hand-written titles and excerpts and — the
// useful part — REAL SLUGS: every one of them matches a recovered post. So they
// are treated as authoritative, and the remaining 83 fall back to what can be
// derived from the archived page itself.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

export const CATEGORIES = ['All', 'Mental load', 'Money', 'Using EvenUS', 'Life changes', 'Reviews'];

/** Pulls the curated 32 straight out of the design file. */
export function curated(designFile) {
  const src = readFileSync(designFile, 'utf8');
  const block = /const POSTS = \[([\s\S]*?)\n\];/.exec(src);
  if (!block) throw new Error('the design no longer carries a POSTS array');
  const rows = [...block[1].matchAll(/\["(.*?)", "(.*?)", "(.*?)", "(.*?)", "(.*?)"\]/g)];
  const out = new Map();
  for (const [, cat, title, excerpt, slug, read] of rows) {
    out.set(slug, {
      cat,
      title: JSON.parse(`"${title}"`),
      excerpt: JSON.parse(`"${excerpt}"`),
      read,
    });
  }
  if (out.size !== 32) throw new Error(`expected 32 curated posts, found ${out.size}`);
  return out;
}

/**
 * Category for a post the design did not curate, from its slug.
 *
 * Ordered: the first rule that matches wins, so the more specific patterns come
 * first. "Reviews" before "Money" because a comparison of budgeting apps is a
 * review, not a money piece.
 */
const RULES = [
  ['Reviews', /\bvs\b|versus|comparison|best-|alternative|review|app[s]?-for|tools?-to|spreadsheet/],
  ['Using EvenUS', /evenus|fairness-score|weekly-report|first-30|set-up|setup|step-by-step|gentle-reminder|track-/],
  ['Life changes', /pregnan|postpartum|newborn|baby|toddler|kids|children|parent|empty-nest|retirement|job-loss|relocat|moving-in|illness|chronic|adhd|autism|blended|step-family|divorce|separat|60s|aging|elder|cross-cultural|long-distance|military|expat/],
  ['Money', /money|financ|budget|bill|expense|income|rent|debt|loan|credit|split|cost|saving|salary|earn|payment|allowance|joint-account|ledger/],
  ['Mental load', /./],
];

export function categoryFor(slug) {
  for (const [cat, re] of RULES) if (re.test(slug)) return cat;
  return 'Mental load';
}

/** ~225 words a minute, the figure the curated read times are consistent with. */
export const readTime = (words) => Math.max(1, Math.round(words / 225)) + ' min';
