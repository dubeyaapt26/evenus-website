// ---------------------------------------------------------------------------
// Renders the 1200x630 sharing card for /features/ and every feature page.
//
//   node src/features/og-cards.mjs            (needs Google Chrome installed)
//   CHROME=/path/to/chrome node src/features/og-cards.mjs
//
// ⚠️ RUN LOCALLY AND COMMIT THE PNGs, like static/og.png. The deploy runs on a
// machine with no Chrome, so generating these during the build would work on
// a laptop and fail on Vercel. The build uses static/og/features/<id>.png when
// it exists and falls back to the feature's main screenshot, then /og.png.
// Re-run after a feature's title or group changes.
//
// The card copies the design of static/topic-*.png: cream ground, two soft
// circles, the wordmark, a group chip, the title, the domain pill.
// ---------------------------------------------------------------------------
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const catalog = JSON.parse(readFileSync(join(here, 'catalog.json'), 'utf8'));
const groups = new Map(catalog.groups.map((g) => [g.id, g.title]));
const out = join(root, 'static/og/features');
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'evenus-og-'));
const font = (f) => pathToFileURL(join(root, 'static/fonts', f)).href;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = (chip, title, sub) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:J;src:url(${font('plus-jakarta-sans-700.woff2')});font-weight:700}
@font-face{font-family:J;src:url(${font('plus-jakarta-sans-400.woff2')});font-weight:400}
@font-face{font-family:N;src:url(${font('newsreader-400-italic.woff2')});font-style:italic}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#F5F4EF;font-family:J,sans-serif;color:#1B1F1D;position:relative}
.c1{position:absolute;right:-120px;top:-210px;width:520px;height:520px;border-radius:50%;background:#DFE3DD}
.c2{position:absolute;left:-150px;bottom:-200px;width:420px;height:420px;border-radius:50%;background:#E6E7E1}
.in{position:relative;padding:68px 80px}
.mark{display:flex;align-items:center;gap:14px;font-size:27px;font-weight:700}
.mark i{font-family:N;font-weight:400;color:#2E6A5C}
.chip{display:inline-block;margin-top:58px;font-size:17px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#2E6A5C;background:#E7F2EE;border:1.5px solid #9ECBBE;padding:10px 22px;border-radius:99px}
h1{margin-top:34px;max-width:900px;font-size:${title.length > 34 ? 60 : 68}px;line-height:1.08;letter-spacing:-.03em;font-weight:700}
p{margin-top:24px;max-width:860px;font-size:25px;line-height:1.4;color:#5E645F}
.pill{position:absolute;left:80px;bottom:62px;background:#1B1F1D;color:#F7F5EF;font-size:20px;font-weight:700;padding:15px 40px;border-radius:99px}
</style></head><body><div class="c1"></div><div class="c2"></div><div class="in">
<div class="mark"><svg width="30" height="40" viewBox="14 6 36 54"><g fill="none" stroke-width="7" stroke-linecap="round"><path d="M19 56 C19 47 28 45 28 34 L28 9" stroke="#6FB3A2"/><path d="M45 56 C45 47 36 45 36 34 L36 9" stroke="#F0A48A"/></g></svg><span>Even<i>US</i></span></div>
<div class="chip">${esc(chip)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="pill">evenus.app</div></body></html>`;

const cards = [
  ['hub', 'Features', 'Everything EvenUS does for a couple', 'Time, money and the mental load, shared fairly at home.'],
  ...catalog.features.map((f) => [f.id, groups.get(f.group), f.title, f.oneLiner.length > 110 ? f.oneLiner.slice(0, f.oneLiner.lastIndexOf(' ', 107)) + '…' : f.oneLiner]),
];
for (const [id, chip, title, sub] of cards) {
  const page = join(tmp, `${id}.html`);
  writeFileSync(page, html(chip, title, sub));
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', `--screenshot=${join(out, `${id}.png`)}`, pathToFileURL(page).href], { stdio: 'ignore' });
  process.stdout.write('.');
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${cards.length} cards -> static/og/features/`);
