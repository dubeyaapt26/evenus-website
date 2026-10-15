// ---------------------------------------------------------------------------
// The Features section: /features/ and one page per feature at /features/<id>/.
//
// ⚠️ THE HANDOFF HAS NO FEATURE PAGE, the same way it has no article page. This
// is composed from the system's own parts: the shared header and footer, the
// legal pages' prose column, the blog's chip and card, the dark CTA band. The
// small stylesheet below exists because 63 pages of inline styles would weigh
// more than the words on them; every value in it is one the design already uses.
//
// Screenshots: each page asks for 1 to 3 (src/features/screenshots.json). A
// <figure> is rendered ONLY when its file exists in static/img/features/, read
// for its real width and height so nothing shifts as it loads. Dropping the
// captured .webp files into that folder is the whole of the swap; the build
// lists how many are still missing on every run.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Width and height of a .webp, from its header. Null if unreadable. */
export function webpSize(file) {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') {
    const n = b.readUInt32LE(21);
    return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
  }
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return null;
}

/** Shared styles for the hub and the feature pages. Values from the design. */
export const FEATURE_CSS = `<style>
.fx-wrap { max-width:1180px; margin:0 auto; padding-left:max(16px,min(28px,4vw)); padding-right:max(16px,min(28px,4vw)); }
.fx-crumbs { display:flex; flex-wrap:wrap; align-items:center; gap:0 8px; font-size:13px; color:#686D68; margin-bottom:14px; }
.fx-crumbs a { color:#5E645F; min-height:44px; display:inline-flex; align-items:center; }
.fx-crumbs a:hover { color:#1B1F1D; }
.fx-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
.fx-chip { font-size:10.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#2E6A5C; background:#E7F2EE; border:1px solid #CFE6DE; padding:5px 10px; border-radius:99px; }
.fx-chip.pro { color:#8F4A31; background:#FBEDE7; border-color:#F2D3C6; }
.fx-chip.plain { color:#4B504B; background:#fff; border-color:#DAD4C6; }
.fx-h1 { margin:0; font-size:clamp(30px,4.4vw,54px); line-height:1.06; letter-spacing:-.035em; font-weight:700; text-wrap:balance; max-width:900px; }
.fx-lead { margin:22px 0 0; max-width:720px; font-size:17.5px; line-height:1.6; color:#4B504B; text-wrap:pretty; }
.fx-lead strong { color:#1B1F1D; font-weight:600; }
.fx-meta { margin-top:24px; padding-top:20px; border-top:1px solid #E4DFD3; font-size:13.5px; color:#5E645F; max-width:820px; }
.fx-meta a { color:#1B1F1D; font-weight:600; }
.fx-body { max-width:760px; font-size:16.5px; line-height:1.68; color:#4B504B; text-wrap:pretty; }
.fx-body h2 { font-size:clamp(22px,2.6vw,30px); line-height:1.16; letter-spacing:-.028em; font-weight:700; color:#1B1F1D; margin:48px 0 14px; text-wrap:balance; scroll-margin-top:90px; }
.fx-body h3 { font-size:18px; line-height:1.3; font-weight:700; letter-spacing:-.015em; color:#1B1F1D; margin:28px 0 8px; }
.fx-body p { margin:0 0 18px; }
.fx-body ul, .fx-body ol { margin:0 0 22px; padding-left:22px; }
.fx-body li { margin-bottom:10px; }
.fx-body strong { color:#1B1F1D; font-weight:700; }
.fx-body a { color:#2E6A5C; text-decoration:underline; text-underline-offset:2px; }
.fx-steps { list-style:none; padding:0 !important; counter-reset:step; }
.fx-steps li { counter-increment:step; position:relative; padding:16px 18px 16px 62px; background:#fff; border:1px solid #EDE8DC; border-radius:18px; margin-bottom:12px; }
.fx-steps li::before { content:counter(step); position:absolute; left:18px; top:15px; width:30px; height:30px; border-radius:99px; background:#1B1F1D; color:#F7F5EF; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.fx-steps strong { display:block; margin-bottom:4px; }
.fx-note { background:#fff; border:1px solid #EDE8DC; border-left:3px solid #6FB3A2; border-radius:16px; padding:18px 22px; margin:0 0 22px; }
.fx-note p:last-child { margin-bottom:0; }
.fx-faq h3 { margin-top:26px; }
.fx-fig { margin:8px 0 30px; text-align:center; }
.fx-fig img { display:block; margin:0 auto; width:100%; max-width:320px; height:auto; border:1px solid #EDE8DC; border-radius:28px; background:#fff; }
.fx-fig figcaption { margin:12px auto 0; max-width:420px; font-size:14px; line-height:1.5; color:#5E645F; }
.fx-section { padding-top:clamp(48px,6vw,80px); }
.fx-label { margin:0 0 6px; font-size:clamp(22px,2.6vw,30px); line-height:1.16; letter-spacing:-.028em; font-weight:700; color:#1B1F1D; }
.fx-sub { margin:0 0 22px; max-width:640px; font-size:15.5px; line-height:1.6; color:#5E645F; }
.fx-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:16px; }
.fx-card { display:flex; flex-direction:column; gap:8px; min-height:44px; background:#fff; border:1px solid #EDE8DC; border-radius:20px; padding:22px 22px 20px; color:#1B1F1D; text-decoration:none; transition:border-color .2s; }
.fx-card:hover { border-color:#6FB3A2; color:#1B1F1D; }
.fx-card-t { font-size:17.5px; font-weight:700; letter-spacing:-.02em; line-height:1.25; }
.fx-card-d { font-size:14.5px; line-height:1.55; color:#5E645F; text-wrap:pretty; }
.fx-card .fx-chip { align-self:flex-start; }
.fx-card-where { font-size:13.5px; line-height:1.5; color:#4B504B; text-wrap:pretty; }
.fx-card-where b { font-weight:700; color:#1B1F1D; }
.fx-card-cta { margin-top:auto; padding-top:6px; display:inline-flex; align-items:center; gap:6px; min-height:32px; font-size:14.5px; font-weight:700; color:#2E6A5C; }
.fx-card:hover .fx-card-cta, .fx-card:focus-visible .fx-card-cta { text-decoration:underline; text-underline-offset:3px; }
.fx-card:focus-visible { outline:2px solid #2E6A5C; outline-offset:2px; }
.fx-where { max-width:820px; margin-top:24px; background:#E7F2EE; border:1px solid #CFE6DE; border-radius:20px; padding:20px 22px; }
.fx-where-h { margin:0; font-size:12.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#2E6A5C; }
.fx-where-path { margin:8px 0 0; font-size:clamp(17px,2vw,20px); line-height:1.4; font-weight:700; letter-spacing:-.015em; color:#1B1F1D; text-wrap:pretty; }
.fx-where-first { margin:8px 0 0; font-size:15px; line-height:1.6; color:#3F5F57; text-wrap:pretty; }
.fx-where-first strong { color:#1B1F1D; font-weight:700; }
.fx-where-jump { display:inline-flex; align-items:center; gap:8px; min-height:44px; margin-top:12px; padding:0 18px; border-radius:99px; background:#1B1F1D; color:#F7F5EF; font-size:14.5px; font-weight:600; text-decoration:none; }
.fx-where-jump:hover, .fx-where-jump:focus-visible { background:#2E6A5C; color:#F7F5EF; }
.fx-author { max-width:760px; margin-top:44px; padding:24px 26px; background:#fff; border:1px solid #EDE8DC; border-radius:22px; }
.fx-author p { margin:8px 0 0; font-size:15px; line-height:1.6; color:#5E645F; }
.fx-cta { background:#1B1F1D; color:#F7F5EF; margin-top:clamp(56px,7vw,96px); }
.fx-cta .fx-wrap { padding-top:clamp(52px,7vw,84px); padding-bottom:clamp(52px,7vw,84px); display:flex; flex-wrap:wrap; gap:24px; align-items:center; justify-content:space-between; }
.fx-cta h2 { margin:0; max-width:560px; font-size:clamp(24px,3vw,36px); line-height:1.1; letter-spacing:-.03em; font-weight:700; }
.fx-cta p { margin:12px 0 0; max-width:520px; font-size:15.5px; line-height:1.6; color:#D8D4CA; }
.fx-cta a { color:#8FD0BE; text-decoration:underline; text-underline-offset:3px; }
.fx-badges { display:flex; flex-wrap:wrap; gap:10px; }
.fx-badge { display:inline-flex; flex-direction:column; justify-content:center; min-height:52px; background:#F7F5EF; color:#1B1F1D; padding:8px 20px; border-radius:14px; line-height:1.15; }
.fx-badge small { font-size:11px; letter-spacing:.04em; color:#4B504B; }
.fx-badge span { font-size:16px; font-weight:600; }
.fx-table-wrap { overflow-x:auto; margin:0 0 14px; border:1px solid #EDE8DC; border-radius:18px; background:#fff; }
.fx-table { width:100%; min-width:640px; border-collapse:collapse; font-size:14.5px; line-height:1.5; }
.fx-table th, .fx-table td { text-align:left; vertical-align:top; padding:13px 16px; border-bottom:1px solid #EFEBE1; }
.fx-table thead th { font-size:12.5px; letter-spacing:.06em; text-transform:uppercase; color:#4B504B; background:#FBFAF6; }
.fx-table tbody th { font-weight:600; color:#1B1F1D; width:32%; }
.fx-table td.us { color:#1B1F1D; font-weight:600; }
.fx-table tr:last-child th, .fx-table tr:last-child td { border-bottom:0; }
.fx-group { scroll-margin-top:90px; }
</style>`;

const GROUP_BLURB = {
  'share-money': 'Shared costs recorded once, split the way you chose, and one running figure for what is still to even up. Bills, budgets, savings and the joint account sit beside it.',
  'share-housework': 'The housework, logged as the real time it took, and the planning and remembering behind it, counted as hours rather than guessed at.',
  'kids-family': 'Children, childcare, support payments, parental leave, time away from home and pets, so costs land with the right people and care is counted where it happens.',
  'plan-together': 'The household balance, one suggestion a week, a private check-in and a short Sunday talk: the parts that turn a picture into a conversation.',
  'reminders-calendar': 'Birthdays, renewals and to-dos for whoever they are for, with no name on who set them, and a calendar that can count a busy week.',
  'faster-adding': 'One typed line, a receipt photo, a bank statement file, a widget or your watch. Each one fills a draft you check before anything is saved.',
  'privacy-data': 'What stays private, what both of you see, a record neither of you can edit, and how to take your data with you or delete it.',
  'settings-help': 'Language, appearance, your subscription, the free-week tips, what happens when someone leaves, your previous household and how to reach a person.',
};

const platformLabel = (f) => {
  const p = f.platforms || [];
  if (p.length === 1 && p[0] === 'ios') return 'iPhone only';
  if (p.length === 1 && p[0] === 'android') return 'Android only';
  return 'iPhone and Android';
};
const currencyLabel = (f) => (f.currencies && f.currencies.length ? `${f.currencies.join(', ')} households` : null);

export function buildFeatures(ctx) {
  const {
    root, design, renderDC, routes, stripPrototypeHandlers, url, esc, shell, pageAt, graph, crumbs,
    ORIGIN, ORG, APP, AUTHOR, posts, catalog, contents, screenshots, where = {},
  } = ctx;

  const byId = new Map(catalog.features.map((f) => [f.id, f]));
  // "Where to find it" is the app's own exported path (catalog.json en.where,
  // the same one the in-app guide shows). where.json is generated from it by
  // sync-catalog.mjs; if the two ever disagree, or a feature has no path, stop.
  {
    const drift = catalog.features.filter((f) => !f.where || where[f.id] !== f.where).map((f) => f.id);
    if (drift.length) throw new Error(`"Where to find it" missing or out of step with the app's catalog for: ${drift.join(', ')}. Run node src/features/sync-catalog.mjs.`);
  }
  const groupOf = new Map(catalog.groups.map((g) => [g.id, g]));
  const postBy = new Map(posts.map((p) => [p.slug, p]));
  const chrome = renderDC(design, 'Blog.dc.html', { cats: [], posts: [] });
  const header = routes(stripPrototypeHandlers(renderDC(design, 'SiteHeader.dc.html', {}, { active: 'features' }).body));
  const footer = routes(stripPrototypeHandlers(/<footer[\s\S]*?<\/footer>/.exec(chrome.body)[0]));
  const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const strip = (h) => String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // --- Screenshots -----------------------------------------------------------
  const shotsFor = new Map();
  let have = 0;
  for (const s of screenshots.shots || []) {
    const file = join(root, 'static/img/features', s.file);
    const size = existsSync(file) ? webpSize(file) : null;
    if (size) have++;
    if (!shotsFor.has(s.feature)) shotsFor.set(s.feature, []);
    shotsFor.get(s.feature).push({ ...s, size, src: `/img/features/${s.file}` });
  }
  const figure = (s, eager) => (s && s.size ? `<figure class="fx-fig">
        <img src="${url(s.src)}" width="${s.size[0]}" height="${s.size[1]}" alt="${esc(s.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        <figcaption>${esc(s.caption)}</figcaption>
      </figure>` : '');

  /** The social card: generated card, else the main screenshot, else the site card. */
  const cardFor = (id) => {
    const og = join(root, 'static/og/features', `${id}.png`);
    if (existsSync(og)) return { image: `/og/features/${id}.png`, size: [1200, 630] };
    const main = (shotsFor.get(id) || []).find((s) => s.size);
    if (main) return { image: main.src, size: main.size };
    return { image: '/og.png', size: [1200, 630] };
  };

  const proNote = (f) => f.pro
    ? `<p><strong>${esc(f.title)} is part of EvenUS Pro.</strong> Every household starts with a 7-day free week inside the app, with no card needed and nothing charged when it ends. After that, EvenUS Pro is $9.99 a month or $79.99 a year, and one subscription covers both of you, whoever pays. Subscribing during the free week ends the free days, and billing starts that day.</p><p>Without a subscription, nothing you have recorded is locked away: you can still read it all, add expenses, tick chores off, export your data and delete your account.</p>`
    : `<p><strong>${esc(f.title)} keeps working after the 7-day free week, whether or not you subscribe.</strong> The computed views, such as the <a href="${url('/features/fairness-score/')}">household balance</a> and <a href="${url('/features/weekly-idea/')}">this week’s idea</a>, are part of EvenUS Pro: $9.99 a month or $79.99 a year, with one subscription covering both partners. The free week needs no card, and nothing is charged when it ends.</p>`;

  const relatedFeatures = (f) => {
    const ids = [...new Set([...(f.related || []), ...catalog.groups.find((g) => g.id === f.group).features])]
      .filter((x) => x !== f.id && byId.has(x));
    const fromCatalog = (f.related || []).filter((x) => byId.has(x));
    const want = Math.min(5, Math.max(3, fromCatalog.length));
    return ids.slice(0, want).map((x) => byId.get(x));
  };

  // Every feature card ends the same way: where it lives in the app, then a
  // plain "How to use it" cue. The whole card is the link; the cue is real
  // text, so a screen reader hears what the click does, not just an arrow.
  const card = (f) => `<a class="fx-card" href="${url(`/features/${f.id}/`)}">
          <span class="fx-card-t">${esc(f.title)}</span>
          <span class="fx-card-d">${esc(f.oneLiner)}</span>
          ${f.pro ? '<span class="fx-chip pro">EvenUS Pro</span>' : ''}
          ${where[f.id] ? `<span class="fx-card-where"><b>Where to find it:</b> ${esc(where[f.id])}</span>` : ''}
          <span class="fx-card-cta">How to use it <span aria-hidden="true">→</span></span>
        </a>`;
  const postCard = (p) => `<a class="fx-card" href="${url(p.path)}">
          <span class="fx-card-t">${esc(p.title)}</span>
          <span class="fx-card-d">${esc(p.excerpt)}</span>
        </a>`;

  const cta = `<section class="fx-cta" aria-labelledby="get-evenus">
    <div class="fx-wrap">
      <div>
        <h2 id="get-evenus">Coming soon to the App Store and Google Play</h2>
        <p>EvenUS is in closed testing and is not on the app stores yet. Your first 7 days will be free, with no card. Want in early? Email <a href="mailto:support@evenus.app">support@evenus.app</a> and we will send a link.</p>
      </div>
      <div class="fx-badges" aria-hidden="true">
        <span class="fx-badge"><small>Coming soon to the</small><span>App Store</span></span>
        <span class="fx-badge"><small>Coming soon to</small><span>Google Play</span></span>
      </div>
    </div>
  </section>`;

  const authorBox = `<aside class="fx-author" aria-label="About the author">
        <div style="font-size:12.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#5E645F">Written by</div>
        <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;margin-top:8px"><a href="${url('/about/')}" rel="author" style="color:#1B1F1D">Aapt Dubey</a></div>
        <p>Founder of EvenUS. MBA in Marketing and Banking, married for more than ten years, based in India. Every step on this page follows the app’s own screens; if something here does not match what you see, write to <a href="mailto:support@evenus.app" style="color:#2E6A5C;text-decoration:underline">support@evenus.app</a>.</p>
      </aside>`;

  const page = (inner) => `<div style="min-height:100vh;background:#F7F5EF;overflow-x:hidden">
${header}
<main>
${inner}
</main>
${footer}
</div>`;

  const authorRef = { '@id': AUTHOR['@id'], '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url, sameAs: AUTHOR.sameAs };
  const report = [];

  // --- One page per feature ----------------------------------------------------
  for (const f of catalog.features) {
    const c = contents.get(f.id);
    const path = `/features/${f.id}/`;
    const g = groupOf.get(f.group);
    const shots = (shotsFor.get(f.id) || []).sort((a, b) => a.n - b.n);
    const cardImg = cardFor(f.id);
    const rel = relatedFeatures(f);
    const relPosts = (c.relatedPosts || []).map((s) => postBy.get(s)).filter(Boolean);
    const chips = [
      `<span class="fx-chip">${esc(g.title)}</span>`,
      f.pro ? '<span class="fx-chip pro">EvenUS Pro</span>' : '<span class="fx-chip plain">Keeps working after the free week</span>',
      `<span class="fx-chip plain">${platformLabel(f)}</span>`,
      currencyLabel(f) ? `<span class="fx-chip plain">${esc(currencyLabel(f))}</span>` : '',
    ].join('');
    const sec = (id, s) => (s ? `<h2 id="${id}">${esc(s.h2)}</h2>\n${s.html}` : '');

    const article = `<article>
    <section class="fx-wrap" style="padding-top:clamp(28px,5vw,64px)">
      <nav aria-label="Breadcrumb" class="fx-crumbs">
        <a href="${url('/')}">Home</a><span aria-hidden="true">·</span>
        <a href="${url('/features/')}">Features</a><span aria-hidden="true">·</span>
        <a href="${url(`/features/#${g.id}`)}">${esc(g.title)}</a>
      </nav>
      <div class="fx-chips">${chips}</div>
      <h1 class="fx-h1">${esc(c.h1)}</h1>
      <p class="fx-lead"><strong>${esc(c.answer)}</strong></p>
      <div class="fx-meta">By <a href="${url('/about/')}" rel="author">Aapt Dubey</a> · Last updated <time datetime="${c.updated}">${fmtDate(c.updated)}</time></div>
      <aside class="fx-where" aria-labelledby="where-in-app">
        <h2 id="where-in-app" class="fx-where-h">Where to find it in the app</h2>
        <p class="fx-where-path">${esc(where[f.id] || '')}</p>
        <p class="fx-where-first"><strong>First step:</strong> ${esc((f.steps || [])[0] || strip(c.steps.items[0].text))}</p>
        <a class="fx-where-jump" href="#how">Jump to how to use it <span aria-hidden="true">↓</span></a>
      </aside>
    </section>

    <section class="fx-wrap" style="padding-top:clamp(24px,3vw,36px)">
      <div class="fx-body">
      ${figure(shots[0], true)}
      ${sec('what', c.what)}
      ${sec('who', c.who)}
      <h2 id="how">${esc(c.steps.h2)}</h2>
      <p>${c.steps.intro}</p>
      <ol class="fx-steps">
        ${c.steps.items.map((s, i) => `<li id="step-${i + 1}"><strong>${esc(s.name)}</strong>${s.text}</li>`).join('\n        ')}
      </ol>
      ${c.steps.after ? `<p>${c.steps.after}</p>` : ''}
      ${figure(shots[1], false)}
      ${sec('partner', c.partner)}
      <h2 id="tips">${esc(c.tips.h2)}</h2>
      <ul>
        ${c.tips.items.map((t) => `<li>${t}</li>`).join('\n        ')}
      </ul>
      ${sec('where', c.country)}
      ${(c.extra || []).map((x, i) => sec(`more-${i + 1}`, x)).join('\n')}
      ${figure(shots[2], false)}
      <h2 id="pro">Is ${esc(f.title)} free?</h2>
      <div class="fx-note">${proNote(f)}</div>
      <h2 id="faq">Questions about ${esc(f.title)}</h2>
      <div class="fx-faq">
        ${c.faqs.map((q) => `<h3>${esc(q.q)}</h3>\n        <p>${esc(q.a)}</p>`).join('\n        ')}
      </div>
      </div>
      ${authorBox}
    </section>

    <section class="fx-wrap fx-section" aria-labelledby="related-features">
      <h2 id="related-features" class="fx-label">Related features</h2>
      <p class="fx-sub">Other parts of EvenUS that work alongside ${esc(f.title)}.</p>
      <div class="fx-grid">
        ${rel.map(card).join('\n        ')}
      </div>
    </section>

    <section class="fx-wrap fx-section" aria-labelledby="related-reading">
      <h2 id="related-reading" class="fx-label">Related reading</h2>
      <p class="fx-sub">Articles on the questions behind this feature.</p>
      <div class="fx-grid">
        ${relPosts.map(postCard).join('\n        ')}
      </div>
    </section>
  </article>`;

    const body = page(`${article}\n  ${cta}`);
    // Words of the page's own content: everything in the article except the
    // two card grids at the end, which are navigation to other pages.
    const count = (h) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9$₹€£]/.test(w)).length;
    const own = article.replace(/<section class="fx-wrap fx-section"[\s\S]*?<\/section>/g, '');
    const words = count(own);
    report.push({ id: f.id, words, withCards: count(article) });

    const faq = {
      '@type': 'FAQPage', '@id': `${ORIGIN}${path}#faq`,
      mainEntity: c.faqs.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })),
    };
    const howto = {
      '@type': 'HowTo', '@id': `${ORIGIN}${path}#how`,
      name: strip(c.steps.h2).replace(/\?$/, ''),
      description: strip(c.steps.intro),
      ...(shots.find((s) => s.size) ? { image: ORIGIN + shots.find((s) => s.size).src } : {}),
      step: c.steps.items.map((s, i) => ({
        '@type': 'HowToStep', position: i + 1, name: s.name, text: strip(s.text), url: `${ORIGIN}${path}#step-${i + 1}`,
      })),
    };
    const articleLd = {
      '@type': 'TechArticle', '@id': `${ORIGIN}${path}#article`,
      headline: c.h1, description: c.description, inLanguage: 'en',
      datePublished: '2026-10-14', dateModified: c.updated,
      wordCount: words,
      author: authorRef, publisher: { '@id': `${ORIGIN}/#organization` },
      image: { '@type': 'ImageObject', url: ORIGIN + cardImg.image, width: cardImg.size[0], height: cardImg.size[1] },
      about: { '@id': `${ORIGIN}/#app` },
      isPartOf: { '@id': `${ORIGIN}/features/#collection` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': ORIGIN + path, url: ORIGIN + path, name: c.h1, dateModified: c.updated, breadcrumb: { '@id': `${ORIGIN}${path}#breadcrumb` } },
    };
    const bc = { ...crumbs([{ name: 'Home', path: '/' }, { name: 'Features', path: '/features/' }, { name: f.title, path }]), '@id': `${ORIGIN}${path}#breadcrumb` };

    pageAt(path, shell({
      title: c.h1, seoTitle: c.seoTitle, description: c.description, path,
      helmet: chrome.helmet, body, published: '2026-10-14', modified: c.updated,
      image: cardImg.image, imageSize: cardImg.size, imageAlt: `${f.title} in the EvenUS app: ${f.oneLiner}`,
      extraHead: FEATURE_CSS,
      jsonld: graph(ORG, bc, articleLd, howto, faq, AUTHOR),
    }));
  }

  // --- The hub ---------------------------------------------------------------
  {
    const path = '/features/';
    const H = ctx.hub;
    const groups = catalog.groups.map((g) => `<section class="fx-group fx-section" id="${g.id}" aria-labelledby="h-${g.id}">
      <h2 id="h-${g.id}" class="fx-label">${esc(g.title)}</h2>
      <p class="fx-sub">${esc(GROUP_BLURB[g.id] || '')}</p>
      <div class="fx-grid">
        ${g.features.map((id) => card(byId.get(id))).join('\n        ')}
      </div>
    </section>`).join('\n    ');

    const jump = catalog.groups.map((g) => `<a href="#${g.id}" class="fx-chip plain" style="min-height:44px;display:inline-flex;align-items:center;font-size:12px;padding:0 14px">${esc(g.title)}</a>`).join('');

    const inner = `<article>
    <section class="fx-wrap" style="padding-top:clamp(28px,5vw,64px)">
      <nav aria-label="Breadcrumb" class="fx-crumbs"><a href="${url('/')}">Home</a><span aria-hidden="true">·</span><span aria-current="page">Features</span></nav>
      <h1 class="fx-h1">${esc(H.h1)}</h1>
      <p class="fx-lead"><strong>${esc(H.answer)}</strong></p>
      <div class="fx-meta">By <a href="${url('/about/')}" rel="author">Aapt Dubey</a> · Last updated <time datetime="${H.updated}">${fmtDate(H.updated)}</time> · ${catalog.features.length} features in ${catalog.groups.length} groups</div>
      <nav aria-label="Feature groups" class="fx-chips" style="margin-top:24px">${jump}</nav>
    </section>

    <section class="fx-wrap" style="padding-top:clamp(16px,3vw,28px)">
      <div class="fx-body">
${H.intro}
      </div>
    </section>

    ${groups}

    <section class="fx-wrap fx-section">
      <div class="fx-body" style="max-width:900px">
${H.compare}
${H.faqHtml}
      </div>
      ${authorBox}
    </section>
  </article>`;

    const body = page(`${inner}\n  ${cta}`);
    const words = inner.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9$₹€£]/.test(w)).length;
    report.unshift({ id: '(hub)', words, withCards: words });

    const app = {
      ...APP,
      featureList: catalog.features.map((f) => f.title),
      image: `${ORIGIN}/og/features/hub.png`,
      author: { '@id': AUTHOR['@id'] },
    };
    pageAt(path, shell({
      title: H.h1, seoTitle: H.seoTitle, description: H.description, path,
      helmet: chrome.helmet, body, modified: H.updated,
      image: existsSync(join(root, 'static/og/features/hub.png')) ? '/og/features/hub.png' : '/og.png',
      imageAlt: 'EvenUS features: money, housework, mental load and planning for couples',
      extraHead: FEATURE_CSS,
      jsonld: graph(ORG, app, AUTHOR,
        { ...crumbs([{ name: 'Home', path: '/' }, { name: 'Features', path }]), '@id': `${ORIGIN}${path}#breadcrumb` },
        {
          '@type': 'CollectionPage', '@id': `${ORIGIN}${path}#collection`, url: ORIGIN + path,
          name: H.h1, description: H.description, inLanguage: 'en',
          datePublished: '2026-10-14', dateModified: H.updated,
          author: authorRef, publisher: { '@id': `${ORIGIN}/#organization` },
          about: { '@id': `${ORIGIN}/#app` },
          breadcrumb: { '@id': `${ORIGIN}${path}#breadcrumb` },
          mainEntity: {
            '@type': 'ItemList', numberOfItems: catalog.features.length,
            itemListElement: catalog.features.map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ORIGIN}/features/${f.id}/`, name: f.title })),
          },
        },
        { '@type': 'FAQPage', '@id': `${ORIGIN}${path}#faq`, mainEntity: H.faqs.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: strip(q.a) } })) }),
    }));
  }

  if (process.env.FEATURE_WORDS) for (const r of report) console.log(`    ${r.id}: ${r.words}`);
  return { report, screenshotsHave: have, screenshotsWant: (screenshots.shots || []).length };
}
