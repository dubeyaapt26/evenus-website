// ---------------------------------------------------------------------------
// The blog's taxonomy and read-time rule. Each article's own category, title
// and excerpt live in its meta block in src/posts/.
// ---------------------------------------------------------------------------

export const CATEGORIES = ['All', 'Mental load', 'Money', 'Using EvenUS', 'Life changes', 'Reviews'];

/** About 225 words a minute. */
export const readTime = (words) => Math.max(1, Math.round(words / 225)) + ' min';
