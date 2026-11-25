// ---------------------------------------------------------------------------
// The two store listings. ONE place: every page, the JSON-LD and llms.txt read
// these constants, so a store URL changes here and nowhere else.
//
// Verified 25 Nov 2026. iPhone: live since 6 Nov 2026. Android: production
// since 25 Nov 2026. The App Store URL uses the numeric id, not a name slug,
// because the listing's name has changed before and the id does not.
//
// ⚠️ No ratings yet on either store. Do not add aggregateRating or any rating
// or review claim anywhere until there are real ones.
//
// The buttons are plain text, styled like the site's own buttons. No Apple or
// Google badge artwork is embedded or downloaded.
// ---------------------------------------------------------------------------

export const APP_STORE_URL = 'https://apps.apple.com/us/app/id6818567743';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=evenus.app';
export const STORE_URLS = [APP_STORE_URL, PLAY_STORE_URL];

/**
 * The "Get the app" block.
 * @param {{ align?: 'left'|'center', tone?: 'light'|'dark', label?: string }} [opts]
 *   tone 'dark' is for a dark background (the feature pages' closing band).
 */
export function storeButtons(opts = {}) {
  const align = opts.align === 'center' ? ' stores-center' : '';
  const tone = opts.tone === 'dark' ? ' stores-dark' : '';
  return `<div class="stores${align}${tone}">
      <a class="store-btn store-ios" href="${APP_STORE_URL}" rel="noopener" aria-label="Download EvenUS on the App Store">Download on the App Store</a>
      <a class="store-btn store-android" href="${PLAY_STORE_URL}" rel="noopener" aria-label="Get EvenUS on Google Play">Get it on Google Play</a>
    </div>`;
}

/** One copy per page, in the head. Same tokens as the rest of the site. */
export const STORE_CSS = `<style>
.stores{display:flex;flex-wrap:wrap;gap:10px;max-width:100%}
.stores-center{justify-content:center}
.store-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 24px;font-size:15.5px;font-weight:600;line-height:1.2;text-align:center;color:#F7F5EF;background:#1B1F1D;border:1px solid #1B1F1D;border-radius:99px;text-decoration:none}
.store-btn:hover,.store-btn:focus-visible{background:#2E6A5C;border-color:#2E6A5C;color:#fff}
.store-btn:focus-visible{outline:2px solid #2E6A5C;outline-offset:2px}
.stores-dark .store-btn{background:#F7F5EF;color:#1B1F1D;border-color:#F7F5EF;text-decoration:none}
.stores-dark .store-btn:hover,.stores-dark .store-btn:focus-visible{background:#8FD0BE;border-color:#8FD0BE;color:#1B1F1D}
.stores-dark .store-btn:focus-visible{outline-color:#8FD0BE}
@media (max-width:420px){.stores{flex-direction:column;align-items:stretch}.store-btn{width:100%}}
</style>`;
