// ---------------------------------------------------------------------------
// What must never reach the output. The build scans every page for these.
// ---------------------------------------------------------------------------

/** Third-party CMS and tag-manager markup. A pasted embed fails the build. */
export const FOOTPRINTS = [
  'wp-content', 'wp-includes', 'wp-json', 'wp-block', 'wp-singular',
  'elementor', 'googletagmanager', 'gtag(', 'wordpress',
  'data-elementor', 'screen-reader-text', 'menu-item-type',
];

/** Sentence shapes that mark generated prose. Reported, for a person to fix. */
export const STRUCTURAL = [
  [/\bin this (guide|article|post),? (you'll|you will|we'll|we will)\b/gi, 'in this guide you will'],
  [/\bready to [a-z ,]{3,50}\?/gi, 'Ready to …?'],
  [/(?:^|[.!?]\s+)The (result|answer|problem|kicker)\?/gm, 'The result?'],
  [/\bhere'?s the (thing|deal)\b/gi, "here's the thing"],
  [/\bit'?s not just [^.,;]{3,40}[,;] it'?s\b/gi, "not just X, it's Y"],
  [/\blet'?s (dive in|get started|begin)\b/gi, "let's dive in"],
];
