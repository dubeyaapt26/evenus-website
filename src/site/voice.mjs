// ---------------------------------------------------------------------------
// Copy clean-up for the recovered blog.
//
// ⚠️ READ THIS BEFORE TRUSTING IT.
// This removes the SURFACE MARKERS of machine-written prose. It does not make
// machine-written prose human. The 115 recovered posts were generated — they
// open with "In this guide you'll get the exact templates…" and close with
// "Ready to build a system that works for your brains? Let's dive in." Swapping
// "holistic" for "complete" makes that harder to spot; it does not make it
// something a person wrote.
//
// So this file does the two jobs that CAN be done mechanically and honestly:
//
//   1. Em dashes. Three different jobs, three different fixes — a full stop
//      between independent clauses, a comma for an aside. A blanket swap to
//      commas leaves comma splices, which read worse than the dash did.
//   2. Vocabulary tells. Words that are not wrong, but that cluster in
//      generated text: holistic, seamless, leverage, crucial, furthermore.
//
// What it deliberately does NOT touch is sentence structure: "In this guide…",
// "Ready to …?", "The result?" openings need rewriting by a person, and a
// regex that tried would produce something worse than it found.
// ---------------------------------------------------------------------------

/** Clauses that can stand alone after a dash, so the dash becomes a full stop. */
const INDEPENDENT =
  /^(it|this|that|they|you|we|there|he|she|i|both|each|one|most|many|nobody|everyone)\s+('|’)?(s|re|ll|ve|d)?\s*(is|are|was|were|will|can|cannot|can't|could|would|should|do|does|did|don't|doesn't|have|has|had|feels?|means?|becomes?|ends?|starts?|takes?|makes?|gets?|goes?|knows?|needs?|wants?|works?|happens?|matters?|helps?|leaves?|keeps?|turns?|comes?|looks?|sits?|carries|carry)\b/i;

/** Words that are not wrong, only tired, and that cluster in generated prose. */
const VOCABULARY = [
  [/\bholistic\b/g, 'complete'], [/\bHolistic\b/g, 'Complete'],
  [/\bseamlessly\b/gi, 'smoothly'], [/\bseamless\b/g, 'smooth'], [/\bSeamless\b/g, 'Smooth'],
  [/\bleveraging\b/gi, 'using'], [/\bleverages\b/gi, 'uses'], [/\bleverage\b/g, 'use'], [/\bLeverage\b/g, 'Use'],
  [/\bcrucial\b/g, 'important'], [/\bCrucial\b/g, 'Important'],
  [/\bvital\b/g, 'essential'], [/\bVital\b/g, 'Essential'],
  [/\bfostering\b/gi, 'building'], [/\bfosters\b/gi, 'builds'], [/\bfoster\b/g, 'build'], [/\bFoster\b/g, 'Build'],
  [/\brobust\b/g, 'solid'], [/\bRobust\b/g, 'Solid'],
  [/\bFurthermore,?\s*/g, 'And '], [/\bfurthermore,?\s*/g, 'and '],
  [/\bMoreover,?\s*/g, 'And '], [/\bmoreover,?\s*/g, 'and '],
  [/\bIn conclusion,?\s*/g, ''],
  [/\bdive into\b/gi, 'look at'], [/\bdiving into\b/gi, 'looking at'],
  [/\bat the end of the day\b/gi, 'in the end'],
  [/\bempowering\b/gi, 'helping'], [/\bempowers\b/gi, 'helps'], [/\bempower\b/g, 'help'],
  [/\bcutting[- ]edge\b/gi, 'new'],
  [/\bgame[- ]changer\b/gi, 'turning point'], [/\bgame[- ]changing\b/gi, 'decisive'],
  [/\bembark on\b/gi, 'start'],
  [/\bnavigating the complexities of\b/gi, 'working through'],
  [/\bdelve into\b/gi, 'go into'], [/\bdelves into\b/gi, 'goes into'],
];

/** Replaces one em dash with the punctuation its sentence actually wants. */
function fixDashes(s) {
  // Spaced dash: the common form.
  s = s.replace(/\s+—\s+([^<]{0,80})/g, (m, after) => {
    if (INDEPENDENT.test(after)) {
      return '. ' + after.charAt(0).toUpperCase() + after.slice(1);
    }
    if (/^(and|but|so|or|then|yet|because|which|who|while)\b/i.test(after)) return ', ' + after;
    return ', ' + after;
  });
  // Unspaced dash between words.
  s = s.replace(/(\w)—(\w)/g, '$1, $2');
  // Anything left (dash against a tag boundary).
  s = s.replace(/\s*—\s*/g, ', ');
  // Tidy what the substitution can leave behind.
  s = s.replace(/,\s*,/g, ',').replace(/,\s*\./g, '.').replace(/\.\s*,/g, '.');
  s = s.replace(/,\s*</g, '<').replace(/\s+([,.;:])/g, '$1');
  return s;
}

export function cleanCopy(html) {
  let s = fixDashes(html);
  for (const [re, to] of VOCABULARY) s = s.replace(re, to);
  // A sentence that began "And " after losing "Furthermore," may now double up.
  s = s.replace(/\bAnd and\b/g, 'And').replace(/\band and\b/g, 'and');
  return s;
}

/** Structural tells this file will not touch. Reported so they are not forgotten. */
export const STRUCTURAL = [
  [/\bin this (guide|article|post)\b/gi, 'in this guide'],
  [/\bready to [a-z ,]{3,50}\?/gi, 'Ready to …?'],
  [/\bthe (result|answer|problem|kicker)\?/gi, 'The result?'],
  [/\bhere'?s the (thing|deal)\b/gi, "here's the thing"],
  [/\bit'?s not just [^.,;]{3,40}[,;] it'?s\b/gi, "not just X, it's Y"],
  [/\blet'?s (dive in|get started|begin)\b/gi, "let's dive in"],
];
