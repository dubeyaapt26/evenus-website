// ---------------------------------------------------------------------------
// The beta / launch sign-up form, used wherever the site used to say
// "Coming soon" with nowhere to go.
//
// It posts to the joinBeta Cloud Function in the app's Firebase project
// (evenus/functions/src/betaSignup.ts), which stores exactly these fields:
// email, phone type, "with my partner", which page it came from. No name, no
// IP. site.js handles the submit; without JavaScript the form says to email
// support instead (a <noscript> line), because a static site has no endpoint
// of its own to fall back to.
//
// ⚠️ The privacy page's #beta section describes this form. Change one, change
// the other.
// ---------------------------------------------------------------------------

export const BETA_ENDPOINT = 'https://us-central1-evenus-be315.cloudfunctions.net/joinBeta';
export const BETA_SOURCES = ['home', 'calculator', 'quiz', 'join', 'features', 'blog'];

let n = 0;

/**
 * @param {string} source  which page the form is on (must be in BETA_SOURCES)
 * @param {{ base?: string, align?: 'left'|'center' }} [opts]
 */
export function betaForm(source, opts = {}) {
  if (!BETA_SOURCES.includes(source)) throw new Error(`betaForm: unknown source "${source}"`);
  const base = opts.base || '';
  const id = `beta${++n}`;
  const center = opts.align === 'center';
  return `<form class="beta" data-beta data-source="${source}" action="${BETA_ENDPOINT}" method="post" novalidate style="${center ? 'margin:0 auto;' : ''}">
      <div class="beta-row">
        <label class="beta-sr" for="${id}-email">Email address</label>
        <input id="${id}-email" class="beta-email" type="email" name="email" required autocomplete="email" inputmode="email" maxlength="254" placeholder="you@example.com">
        <button class="beta-go" type="submit">Join the beta</button>
      </div>
      <fieldset class="beta-phone">
        <legend>Your phone</legend>
        <label><input type="radio" name="platform" value="ios" required> iPhone</label>
        <label><input type="radio" name="platform" value="android"> Android</label>
        <label><input type="radio" name="platform" value="both"> We use both</label>
      </fieldset>
      <label class="beta-check"><input type="checkbox" name="withPartner"> My partner will use it with me</label>
      <label class="beta-check"><input type="checkbox" name="consent" required> Email me my beta invite and one note at launch. Nothing else, and you can ask us to remove your address any time.</label>
      <div class="beta-hp" aria-hidden="true"><label for="${id}-web">Leave this empty</label><input id="${id}-web" type="text" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="beta-msg" role="status" aria-live="polite"></p>
      <p class="beta-small">We keep your email, phone type and whether you'll use it together, nothing more. <a href="${base}/privacy/#beta">How we use it</a>.</p>
      <noscript><p class="beta-small">This form needs JavaScript. Email <a href="mailto:support@evenus.app">support@evenus.app</a> instead and we'll add you.</p></noscript>
    </form>`;
}

/** The form's styles: one copy per page, in the head. Matches the site's tokens. */
export const BETA_CSS = `<style>
.beta{max-width:520px;text-align:left;font-size:15px;line-height:1.5;color:#1B1F1D}
.beta-row{display:flex;flex-wrap:wrap;gap:10px}
.beta-email{flex:1 1 220px;min-width:0;min-height:50px;padding:0 18px;font:inherit;font-size:16px;color:#1B1F1D;background:#fff;border:1px solid #B9B3A5;border-radius:99px}
.beta-email:focus{outline:2px solid #2E6A5C;outline-offset:2px;border-color:#2E6A5C}
.beta-go{min-height:50px;padding:0 24px;font:inherit;font-size:15.5px;font-weight:600;color:#F7F5EF;background:#1B1F1D;border:1px solid #1B1F1D;border-radius:99px;cursor:pointer}
.beta-go:hover{background:#2E6A5C;border-color:#2E6A5C}
.beta-go[disabled]{opacity:.6;cursor:progress}
.beta-phone{display:flex;flex-wrap:wrap;gap:6px 18px;margin:16px 0 0;padding:0;border:0}
.beta-phone legend{float:left;width:100%;margin:0 0 6px;padding:0;font-size:13.5px;font-weight:600;color:#4B504B}
.beta-phone label,.beta-check{display:flex;align-items:flex-start;gap:8px;min-height:32px;font-size:14.5px;color:#4B504B;cursor:pointer}
.beta-check{margin-top:8px}
.beta input[type=radio],.beta input[type=checkbox]{width:18px;height:18px;margin:2px 0 0;accent-color:#2E6A5C;flex:none}
.beta-msg{margin:12px 0 0;font-size:14.5px;font-weight:600;min-height:1px}
.beta-msg[data-kind=ok]{color:#2E6A5C}
.beta-msg[data-kind=err]{color:#8F4A31}
.beta-small{margin:8px 0 0;font-size:13px;color:#686D68}
.beta-small a{color:#2E6A5C;text-decoration:underline;text-underline-offset:2px}
.beta-sr,.beta-hp{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.beta.done .beta-row,.beta.done .beta-phone,.beta.done .beta-check{display:none}
</style>`;
